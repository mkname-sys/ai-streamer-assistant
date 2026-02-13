import express from "express";
import passport from "passport";
import session from "express-session";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ----------------------
// Twitch Strategy Import
// ----------------------
import TwitchStrategyModule from "passport-twitch-new";
const TwitchStrategy = TwitchStrategyModule.Strategy;

// ----------------------
// Session Setup
// ----------------------
router.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
  })
);

router.use(passport.initialize());
router.use(passport.session());

// ----------------------
// Passport Serialize / Deserialize
// ----------------------
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ----------------------
// Twitch OAuth Strategy
// ----------------------
passport.use(
  new TwitchStrategy(
    {
      clientID: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      callbackURL: process.env.TWITCH_CALLBACK_URL || "http://localhost:3000/auth/twitch/callback",
      scope: "user:read:email",
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken;
      profile.refreshToken = refreshToken;
      return done(null, profile);
    }
  )
);

// ----------------------
// Routes
// ----------------------
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
