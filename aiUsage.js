import fs from "fs";
import path from "path";

const usageFile = path.join(process.cwd(), "ai_usage.json");

export function getUsage() {
  if (!fs.existsSync(usageFile)) return {};
  return JSON.parse(fs.readFileSync(usageFile, "utf-8"));
}

export function saveUsage(data) {
  fs.writeFileSync(usageFile, JSON.stringify(data, null, 2));
}

export function addUsage(email, tokens = 1) {
  const usage = getUsage();

  if (!usage[email]) {
    usage[email] = {
      tokensUsed: 0,
      lastReset: Date.now()
    };
  }

  usage[email].tokensUsed += tokens;

  saveUsage(usage);
}