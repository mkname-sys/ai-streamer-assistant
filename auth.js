import passport from "passport";
import { Strategy as TwitchStrategy } from "passport-twitch-new";
import fs from "fs";

const owners = JSON.parse(fs.readFileSync("./owners.json"));

export function setupAuth(app) {
  passport.use(
    new TwitchStrategy(
      {
        clientID: process.env.TWITCH_CLIENT_ID,
        clientSecret: process.env.TWITCH_CLIENT_SECRET,
        callbackURL: process.env.TWITCH_CALLBACK,
        scope: "user:read:email"
      },
      (accessToken, refreshToken, profile, done) => {
        const username = profile.login;
        const ownerData = owners[username] || { owner: false, channels: [] };

        return done(null, {
          id: profile.id,
          username,
          display_name: profile.display_name,
          owner: ownerData.owner,
          channels: ownerData.channels
        });
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/auth/twitch", passport.authenticate("twitch"));
  app.get(
    "/auth/twitch/callback",
    passport.authenticate("twitch", { failureRedirect: "/" }),
    (req, res) => res.redirect("/dashboard.html")
  );

  app.get("/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
  });

  app.get("/api/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }
    res.json(req.user);
  });
}
