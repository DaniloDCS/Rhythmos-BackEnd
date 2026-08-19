import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { auth, db } from "../config/firebase";

let io: Server | null = null;
const connections = new Map<string, number>();
const room = (supportId: string) => `support:${supportId}`;
const userRoom = (uid: string) => `user:${uid}`;
const emitPresence = async (supportId: string) => {
  if (!io) return;
  const sockets = await io.in(room(supportId)).fetchSockets();
  const roles = [...new Set(sockets.map((item) => item.data.user.role === "administrador" || item.data.user.role === "admin" ? "administrador" : "usuario"))];
  io.to(room(supportId)).emit("support:presence", { supportId, onlineRoles: roles });
};

export const initializeRealtime = (server: HttpServer) => {
  io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN, credentials: true } });
  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token ?? "");
      if (!token) return next(new Error("Token não informado."));
      const decoded = await auth.verifyIdToken(token);
      const profile = await db.collection("users").doc(decoded.uid).get();
      const role = String(profile.data()?.role ?? decoded.role ?? "usuario").trim().toLowerCase();
      socket.data.user = { uid: decoded.uid, role };
      next();
    } catch { next(new Error("Token inválido.")); }
  });
  io.on("connection", (socket) => {
    const uid = socket.data.user.uid as string;
    const isAdmin = ["administrador", "admin"].includes(socket.data.user.role);
    connections.set(uid, (connections.get(uid) ?? 0) + 1);
    void socket.join(userRoom(socket.data.user.uid));
    void socket.join("authenticated");
    void socket.join(isAdmin ? "administrators" : "students");
    io?.to("administrators").emit("users:presence", { userId: uid, online: true });
    socket.on("users:presence:subscribe", (acknowledge?: (data: { onlineUserIds: string[] }) => void) => { if (isAdmin) acknowledge?.({ onlineUserIds: [...connections.keys()] }); });
    socket.on("support:join", async (supportId: string, acknowledge?: (result: object) => void) => {
      try {
        const snapshot = await db.collection("supports").doc(String(supportId)).get();
        const isAdmin = ["administrador", "admin"].includes(socket.data.user.role);
        const allowed = snapshot.exists && (isAdmin || snapshot.data()?.userId === socket.data.user.uid);
        if (!allowed) return acknowledge?.({ ok: false, message: "Acesso negado." });
        await socket.join(room(String(supportId)));
        await emitPresence(String(supportId));
        acknowledge?.({ ok: true });
      } catch { acknowledge?.({ ok: false, message: "Não foi possível entrar no chamado." }); }
    });
    socket.on("support:leave", async (supportId: string) => { await socket.leave(room(String(supportId))); await emitPresence(String(supportId)); });
    socket.on("support:typing", async ({ supportId, typing }: { supportId: string; typing: boolean }) => {
      if (!socket.rooms.has(room(String(supportId)))) return;
      socket.to(room(String(supportId))).emit("support:typing", { supportId, typing, userId: socket.data.user.uid, role: socket.data.user.role });
    });
    socket.on("disconnecting", () => { for (const joined of socket.rooms) if (joined.startsWith("support:")) { const supportId = joined.slice(8); setTimeout(() => void emitPresence(supportId), 0); } });
    socket.on("disconnect", () => { const remaining = Math.max(0, (connections.get(uid) ?? 1) - 1); if (remaining) connections.set(uid, remaining); else { connections.delete(uid); io?.to("administrators").emit("users:presence", { userId: uid, online: false }); } });
  });
  return io;
};

export const emitSupportUpdate = (supportId: string, support: unknown, event = "support:updated") => io?.to(room(supportId)).emit(event, { supportId, support });
export const emitRealtimeNotification = (target: string, notification: unknown) => io?.to(target === "administrators" ? target : userRoom(target)).emit("notification:new", notification);
export const emitAnnouncementChange = (audience: "all" | "students" | "administrators", payload: unknown, notify?: unknown) => { const target = audience === "all" ? "authenticated" : audience; io?.to(target).emit("announcement:changed", payload); if (notify) io?.to(target).emit("notification:new", notify); };
