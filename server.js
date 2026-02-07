import express from "express";
import path from "path";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import { fileURLToPath } from "url";

import authRoutes from "./auth.js";
import { startTwitchBot, stopTwitchBot } from "./bot.js";
import { generateAIReply } from "./openai.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// GLOBAL BOT STORAGE
// ===============================
const twitchBots = {};

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ===============================
// SERVE PUBLIC FILES
// ===============================
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// AUTH ROUTES
// ===============================
app.use("/auth", authRoutes);

// ===============================
// LOGIN CHECK MIDDLEWARE
// ===============================
function requireLogin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: "Not logged in" });
  }
  next();
}

// ===============================
// ROUTES (PAGES)
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/overlay/:channel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "overlay.html"));
});

// ===============================
// API: WHO AM I
// ===============================
app.get("/api/me", (req, res) => {
  if (!req.user) {
    return res.json({ ok: false });
  }

  const channel = req.user.login || req.user.display_name;

  res.json({
    ok: true,
    channel,
    user: req.user,
  });
});

// ===============================
// API: BOT STATUS
// ===============================
app.get("/api/bot/status", requireLogin, (req, res) => {
  const channel = req.user.login || req.user.display_name;

  const running = twitchBots[channel] ? true : false;

  res.json({ running });
});

// ===============================
// API: START BOT
// ===============================
app.post("/api/bot/start", requireLogin, async (req, res) => {
  try {
    const channel = req.user.login || req.user.display_name;

    if (twitchBots[channel]) {
      return res.json({ ok: false, error: "Bot already running" });
    }

    const bot = await startTwitchBot(channel);

    twitchBots[channel] = bot;

    res.json({ ok: true, message: "Bot started", channel });
  } catch (err) {
    console.error("Start bot error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===============================
// API: STOP BOT
// ===============================
app.post("/api/bot/stop", requireLogin, async (req, res) => {
  try {
    const channel = req.user.login || req.user.display_name;

    if (!twitchBots[channel]) {
      return res.json({ ok: false, error: "Bot is not running" });
    }

    await stopTwitchBot(twitchBots[channel]);

    delete twitchBots[channel];

    res.json({ ok: true, message: "Bot stopped", channel });
  } catch (err) {
    console.error("Stop bot error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===============================
// API: SEND OVERLAY MESSAGE
// ===============================
app.post("/api/overlay/send", requireLogin, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.json({ ok: false, error: "Message required" });
    }

    global.overlayMessage = message;

    res.json({ ok: true, message: "Overlay updated" });
  } catch (err) {
    console.error("Overlay send error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===============================
// API: GET OVERLAY MESSAGE
// ===============================
app.get("/api/overlay/:channel", (req, res) => {
  res.json({
    ok: true,
    message: global.overlayMessage || "Overlay Ready ✅",
  });
});

// ===============================
// API: AI GENERATE
// ===============================
app.post("/api/ai/generate", requireLogin, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.json({ ok: false, error: "Message required" });
    }

    const reply = await generateAIReply(message);

    res.json({ ok: true, reply });
  } catch (err) {
    console.error("AI generate error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

