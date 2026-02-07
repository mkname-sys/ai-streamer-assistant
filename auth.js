import passport from "passport";
import session from "express-session";
import TwitchStrategyImport from "passport-twitch-new";

const TwitchStrategy =
  TwitchStrategyImport.Strategy || TwitchStrategyImport;

export function setupAuth(app) {
  // Sessions
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "supersecret123",
      resave: false,
      saveUninitialized: false,
    })
  );

  // Passport init
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  // Twitch Strategy
  passport.use(
    new TwitchStrategy(
      {
        clientID: process.env.TWITCH_CLIENT_ID,
        clientSecret: process.env.TWITCH_CLIENT_SECRET,
        callbackURL:
          process.env.TWITCH_CALLBACK ||
          "http://localhost:3000/auth/twitch/callback",
        scope: ["user:read:email"],
      },
      function (accessToken, refreshToken, profile, done) {
        return done(null, profile);
      }
    )
  );

  // Routes
  app.get("/auth/twitch", passport.authenticate("twitch"));

  app.get(
    "/auth/twitch/callback",
    passport.authenticate("twitch", { failureRedirect: "/" }),
    (req, res) => {
      res.redirect("/dashboard");
    }
  );

  app.get("/dashboard", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/");
    }

    res.send(`
      <h1>Dashboard</h1>
      <p>Logged in as: ${req.user.displayName}</p>
      <pre>${JSON.stringify(req.user, null, 2)}</pre>
      <a href="/logout">Logout</a>
    `);
  });

  app.get("/logout", (req, res, next) => {
    req.logout(function (err) {
      if (err) return next(err);
      res.redirect("/");
    });
  });
}
