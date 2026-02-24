import fs from "fs";

export function logEvent(type, message) {
  const log = `[${new Date().toISOString()}] [${type}] ${message}\n`;

  fs.appendFileSync("system.log", log);
}