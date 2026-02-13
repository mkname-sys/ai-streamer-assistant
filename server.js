// server.js (FINAL FULL REPLACEABLE)

import express from "express";
import path from "path";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./auth.js";
import { startTwitchBot, stopTwitchBot } from "./bot.js";
import { generateAIReply } from "./openai.js";
import stripe from "./stripe.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// IMPORTANT: STRIPE WEBHOOK RAW BODY
// ===============================
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    next();
  }
);

// ===============================
// MIDDLEWARE
// ===============================
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    next();
  } else {
    express.urlencoded({ extended: true })(req, res, next);
  }
});

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
// GLOBAL BOT STORAGE
// ===============================
const twitchBots = {};

// ===============================
// SETTINGS FILE
// ===============================
const settingsFile = path.join(__dirname, "settings.json");
let settings = {};

if (fs.existsSync(settingsFile)) {
  settings = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
} else {
  settings = { default: { ai: true, voice: true } };
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
}

// ===============================
// SUBSCRIPTIONS FILE
// ===============================
const subscriptionsFile = path.join(__dirname, "subscriptions.json");
let subscriptions = {};

if (fs.existsSync(subscriptionsFile)) {
  subscriptions = JSON.parse(fs.readFileSync(subscriptionsFile, "utf-8"));
} else {
  subscriptions = {};
  fs.writeFileSync(subscriptionsFile, JSON.stringify(subscriptions, null, 2));
}

// ===============================
// OVERLAY STORAGE (PER CHANNEL)
// ===============================
const overlayMessages = {};

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
// SUBSCRIPTION CHECK MIDDLEWARE
// ===============================
function requireSubscription(req, res, next) {
  const email = req.user.email;

  if (!email) {
    return res
      .status(403)
      .json({ ok: false, error: "No email linked to Twitch account." });
  }

  if (!subscriptions[email] || subscriptions[email].status !== "active") {
    return res.status(403).json({
      ok: false,
      error: "You must be a paid subscriber to use this feature.",
    });
  }

  next();
}

// ===============================
// ROUTES (PAGES)
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/overlay/:channel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "overlay.html"));
});

// ===============================
// API: WHO AM I
// ===============================
app.get("/api/me", (req, res) => {
  if (!req.user) return res.json({ ok: false });

  const channel = req.user.login || req.user.display_name;
  const email = req.user.email;

  res.json({
    ok: true,
    channel,
    user: req.user,
    subscribed: email && subscriptions[email]?.status === "active",
  });
});

// ===============================
// API: CHANNELS LIST
// ===============================
app.get("/api/channels", requireLogin, (req, res) => {
  const channel = req.user.login || req.user.display_name;
  res.json([channel]);
});

// ===============================
// API: GET SETTINGS
// ===============================
app.get("/api/settings/:channel", requireLogin, (req, res) => {
  const channel = req.params.channel;

  if (!settings[channel]) {
    settings[channel] = settings.default || { ai: true, voice: true };
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  }

  res.json(settings[channel]);
});

// ===============================
// API: SAVE SETTINGS
// ===============================
app.post("/api/settings/:channel", requireLogin, (req, res) => {
  const channel = req.params.channel;
  const { ai, voice } = req.body;

  settings[channel] = {
    ai: ai === true || ai === "true",
    voice: voice === true || voice === "true",
  };

  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));

  res.json({ ok: true, settings: settings[channel] });
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
// API: START BOT (LOCKED TO SUBSCRIBERS)
// ===============================
app.post(
  "/api/bot/start",
  requireLogin,
  requireSubscription,
  async (req, res) => {
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
  }
);

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
// API: SEND OVERLAY MESSAGE (PER CHANNEL)
// ===============================
app.post("/api/overlay/send", requireLogin, (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ ok: false, error: "Message required" });
  }

  const channel = req.user.login || req.user.display_name;
  overlayMessages[channel] = message;

  res.json({ ok: true, message: "Overlay updated" });
});

// ===============================
// API: GET OVERLAY MESSAGE (PER CHANNEL)
// ===============================
app.get("/api/overlay/:channel", (req, res) => {
  const channel = req.params.channel;

  res.json({
    ok: true,
    message: overlayMessages[channel] || "Overlay Ready ✅",
  });
});

// ===============================
// API: AI GENERATE
// ===============================
app.post("/api/ai/generate", requireLogin, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) return res.json({ ok: false, error: "Message required" });

    const reply = await generateAIReply(message);

    res.json({ ok: true, reply });
  } catch (err) {
    console.error("AI generate error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===============================
// SSE: LIVE UPDATES (PER CHANNEL)
// ===============================
app.get("/api/live/:channel", requireLogin, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const channel = req.params.channel;

  const interval = setInterval(() => {
    const running = twitchBots[channel] ? true : false;
    const overlay = overlayMessages[channel] || "Overlay Ready ✅";

    res.write(
      `data: ${JSON.stringify({
        running,
        overlay,
      })}\n\n`
    );
  }, 2000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// ===============================
// STRIPE: CREATE CHECKOUT SESSION
// ===============================
app.post("/api/create-checkout-session", requireLogin, async (req, res) => {
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: req.user.email,
      success_url: `${req.headers.origin}/dashboard?success=true`,
      cancel_url: `${req.headers.origin}/dashboard?canceled=true`,
    });

    res.json({ ok: true, url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe session error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===============================
// STRIPE: WEBHOOK (REAL HANDLER)
// ===============================
app.post("/webhook", (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Subscription activated
  if (
    event.type === "checkout.session.completed" ||
    event.type === "invoice.payment_succeeded"
  ) {
    const email = event.data.object.customer_email;

    if (email) {
      subscriptions[email] = { status: "active" };
      fs.writeFileSync(
        subscriptionsFile,
        JSON.stringify(subscriptions, null, 2)
      );
      console.log("💳 Subscription activated for:", email);
    }
  }

  // Subscription canceled
  if (event.type === "customer.subscription.deleted") {
    const email = event.data.object.customer_email;

    if (email) {
      subscriptions[email] = { status: "inactive" };
      fs.writeFileSync(
        subscriptionsFile,
        JSON.stringify(subscriptions, null, 2)
      );
      console.log("❌ Subscription canceled for:", email);
    }
  }

  res.json({ received: true });
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
