// auth.js (FINAL FULL REPLACEABLE)

import express from "express";
import passport from "passport";
import { Strategy as TwitchStrategy } from "passport-twitch-new";

const router = express.Router();

// ===============================
// PASSPORT SESSION HANDLING
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

      // IMPORTANT: MUST MATCH TWITCH DEVELOPER CALLBACK EXACTLY
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
// DEBUG (VERY IMPORTANT FOR RENDER)
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
  (req, res) => {
    res.redirect("/dashboard");
  }
);

router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

export default router;
