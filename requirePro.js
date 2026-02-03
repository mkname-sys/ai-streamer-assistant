import fs from "fs";

export function requirePro(req, res, next) {
  const email = req.session?.user?.email;
  if (!email) return res.status(401).json({ error: "Not logged in" });

  const users = JSON.parse(fs.readFileSync("./data/users.json"));
  if (!users[email]?.active) {
    return res.status(403).json({ error: "Pro required" });
  }

  next();
}
