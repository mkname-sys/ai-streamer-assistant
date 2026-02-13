import tmi from "tmi.js";
import fetch from "node-fetch"; // for AI API calls
import fs from "fs";
import path from "path";

let clients = {}; // store running bot clients per channel

// ----------------------
// Load per-channel settings
// ----------------------
function getChannelSettings(channel) {
  try {
    const settingsPath = path.join(process.cwd(), "settings.json");
    if (!fs.existsSync(settingsPath)) return { ai: true, voice: true };
    const data = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    return data[channel] || { ai: true, voice: true };
  } catch (err) {
    console.error("Error reading channel settings:", err);
    return { ai: true, voice: true };
  }
}

// ----------------------
// Check if user is subscribed
// ----------------------
function isSubscribed(channel) {
  try {
    const subsPath = path.join(process.cwd(), "subscriptions.json");
    if (!fs.existsSync(subsPath)) return false;
    const subs = JSON.parse(fs.readFileSync(subsPath, "utf-8"));
    return subs[channel]?.status === "active";
  } catch (err) {
    console.error("Error reading subscriptions:", err);
    return false;
  }
}

// ----------------------
// Start Twitch Bot
// ----------------------
export async function startTwitchBot(channelName) {
  if (clients[channelName]) {
    console.log(`⚠️ Bot already running for ${channelName}`);
    return clients[channelName];
  }

  if (!isSubscribed(channelName)) {
    console.log(`❌ Cannot start bot — ${channelName} is not subscribed.`);
    return null;
  }

  const username = process.env.TWITCH_BOT_USERNAME;
  const token = process.env.TWITCH_OAUTH_TOKEN;
  const channel = channelName || process.env.TWITCH_CHANNEL_NAME;

  if (!username || !token || !channel) {
    console.log("❌ Missing Twitch environment variables.");
    return null;
  }

  const client = new tmi.Client({
    options: { debug: true },
    identity: { username, password: token },
    channels: [channel],
  });

  await client.connect();

  client.on("connected", () => {
    console.log(`✅ Twitch bot connected as ${username} in channel ${channel}`);
  });

  // ----------------------
  // Chat message handler
  // ----------------------
  client.on("message", async (channelName, tags, message, self) => {
    if (self) return;

    const settings = getChannelSettings(channelName);

    // ----------------------
    // Custom commands
    // ----------------------
    if (message.toLowerCase() === "!clip") {
      client.say(channelName, `@${tags.username} made a clip! 🎬`);
      return;
    }

    if (message.toLowerCase() === "!shoutout") {
      client.say(channelName, `Shoutout to @${tags.username}! Follow and support them! 🌟`);
      return;
    }

    // ----------------------
    // AI chat
    // ----------------------
    if (settings.ai && message.toLowerCase().startsWith("!ai ")) {
      const userMessage = message.slice(4).trim();
      if (!userMessage) return;

      try {
        const res = await fetch("http://localhost:3000/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage }),
        });
        const data = await res.json();
        if (data.ok && data.reply) {
          const replyMessage = `@${tags.username} ${data.reply}`;

          // Send message in chat
          client.say(channelName, replyMessage);

          // Update overlay automatically
          global.overlayMessage = replyMessage;
        }
      } catch (err) {
        console.error("AI reply error:", err);
      }
    }
  });

  clients[channelName] = client;
  return client;
}

// ----------------------
// Stop Twitch Bot
// ----------------------
export async function stopTwitchBot(channelName) {
  const client = clients[channelName];
  if (!client) {
    console.log(`⚠️ Bot is not running for ${channelName}`);
    return;
  }

  await client.disconnect();
  delete clients[channelName];
  console.log(`🛑 Twitch bot stopped for ${channelName}`);
}
