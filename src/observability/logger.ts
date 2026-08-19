export type LogLevel = "info" | "warn" | "error";
export const log = (level: LogLevel, event: string, fields: Record<string, unknown> = {}) => {
  const entry = { timestamp: new Date().toISOString(), level, event, service: "rhythmos-api", environment: process.env.NODE_ENV ?? "development", ...fields };
  const output = JSON.stringify(entry); if (level === "error") console.error(output); else if (level === "warn") console.warn(output); else console.log(output);
};
