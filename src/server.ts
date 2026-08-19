import { app } from "./app";
import { createServer } from "http";
import { initializeRealtime } from "./realtime/socket";

const server = createServer(app);
initializeRealtime(server);
server.listen(3333, () => {
  console.log("Server started: http://localhost:3333");
});
