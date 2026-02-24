import fs from "fs";
import path from "path";

const botStateFile = path.join(process.cwd(), "runningBots.json");

export function saveBotState(channel) {
  let data = [];

  if (fs.existsSync(botStateFile)) {
    data = JSON.parse(fs.readFileSync(botStateFile, "utf-8"));
  }

  if (!data.includes(channel)) {
    data.push(channel);
  }

  fs.writeFileSync(botStateFile, JSON.stringify(data, null, 2));
}

export function removeBotState(channel) {
  if (!fs.existsSync(botStateFile)) return;

  let data = JSON.parse(fs.readFileSync(botStateFile, "utf-8"));
  data = data.filter(c => c !== channel);

  fs.writeFileSync(botStateFile, JSON.stringify(data, null, 2));
}