import express from "express";
import passport from "passport";
import { Strategy as TwitchStrategy } from "passport-twitch-new";
import { startTwitchBot, stopTwitchBot } from "./bot.js";

const router = express.Router();

// ===============================
// SESSION HANDLING
// ===============================
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// ===============================
// TWITCH STRATEGY
// ===============================
passport.use(
  new TwitchStrategy(
    {
      clientID: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      callbackURL: process.env.TWITCH_CALLBACK_URL,
      scope: "user:read:email",
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken;
      profile.refreshToken = refreshToken;
      return done(null, profile);
    }
  )
);

// ===============================
// DEBUG ROUTE
// ===============================
router.get("/debug", (req, res) => {
  res.json({
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ? "✅ Loaded" : "❌ Missing",
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET
      ? "✅ Loaded"
      : "❌ Missing",
    TWITCH_CALLBACK_URL: process.env.TWITCH_CALLBACK_URL || "❌ Missing",
  });
});

// ===============================
// ROUTES
// ===============================
router.get("/twitch", passport.authenticate("twitch"));

router.get(
  "/twitch/callback",
  passport.authenticate("twitch", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const channelName = req.user.login; // Twitch username
      await startTwitchBot(channelName);
      console.log(`🚀 Bot started for ${channelName}`);
    } catch (err) {
      console.error("Bot start error:", err);
    }

    res.redirect("/dashboard");
  }
);

router.get("/logout", async (req, res) => {
  try {
    const channelName = req.user?.login;
    if (channelName) {
      await stopTwitchBot(channelName);
      console.log(`🛑 Bot stopped for ${channelName}`);
    }
  } catch (err) {
    console.error("Bot stop error:", err);
  }

  req.logout(() => {
    res.redirect("/");
  });
});

export default router;
