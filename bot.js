import tmi from "tmi.js";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

let clients = {};

// ----------------------
// Load channel settings
// ----------------------
function getChannelSettings(channel) {
  try {
    const settingsPath = path.join(process.cwd(), "settings.json");
    if (!fs.existsSync(settingsPath)) return { ai: true, voice: true };
    const data = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    return data[channel] || { ai: true, voice: true };
  } catch (err) {
    console.error("Settings error:", err);
    return { ai: true, voice: true };
  }
}

// ----------------------
// Check subscription
// ----------------------
function isSubscribed(channel) {
  try {
    const subsPath = path.join(process.cwd(), "subscriptions.json");
    if (!fs.existsSync(subsPath)) return false;
    const subs = JSON.parse(fs.readFileSync(subsPath, "utf-8"));
    return subs[channel]?.status === "active";
  } catch (err) {
    console.error("Subscription check error:", err);
    return false;
  }
}

// ----------------------
// START BOT
// ----------------------
export async function startTwitchBot(channelName) {
  if (clients[channelName]) {
    console.log(`⚠️ Bot already running for ${channelName}`);
    return clients[channelName];
  }

  if (!isSubscribed(channelName)) {
    console.log(`❌ ${channelName} is not subscribed.`);
    return null;
  }

  const username = process.env.TWITCH_BOT_USERNAME;
  const token = process.env.TWITCH_OAUTH_TOKEN;

  if (!username || !token || !channelName) {
    console.log("❌ Missing required Twitch env variables.");
    return null;
  }

  const client = new tmi.Client({
    options: { debug: true },
    identity: {
      username,
      password: token,
    },
    channels: [channelName],
  });

  await client.connect();

  client.on("connected", () => {
    console.log(`✅ Bot connected to ${channelName}`);
  });

  client.on("message", async (channel, tags, message, self) => {
    if (self) return;

    const settings = getChannelSettings(channelName);

    // Custom commands
    if (message.toLowerCase() === "!clip") {
      client.say(channel, `@${tags.username} made a clip! 🎬`);
      return;
    }

    if (message.toLowerCase() === "!shoutout") {
      client.say(channel, `Shoutout to @${tags.username}! 🌟`);
      return;
    }

    // AI Command
    if (settings.ai && message.toLowerCase().startsWith("!ai ")) {
      const userMessage = message.slice(4).trim();
      if (!userMessage) return;

      try {
        const res = await fetch(
          `${process.env.BASE_URL}/api/ai/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMessage }),
          }
        );

        const data = await res.json();

        if (data.ok && data.reply) {
          const reply = `@${tags.username} ${data.reply}`;
          client.say(channel, reply);
          global.overlayMessage = reply;
        }
      } catch (err) {
        console.error("AI error:", err);
      }
    }
  });

  clients[channelName] = client;
  return client;
}

// ----------------------
// STOP BOT
// ----------------------
export async function stopTwitchBot(channelName) {
  const client = clients[channelName];

  if (!client) {
    console.log(`⚠️ Bot not running for ${channelName}`);
    return;
  }

  await client.disconnect();
  delete clients[channelName];

  console.log(`🛑 Bot stopped for ${channelName}`);
}
