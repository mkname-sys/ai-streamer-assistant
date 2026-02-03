import Stripe from "stripe";
import fs from "fs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const USERS_FILE = "./data/users.json";

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function setupWebhook(app) {
  app.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    (req, res) => {
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.headers["stripe-signature"],
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error("❌ Webhook signature failed");
        return res.sendStatus(400);
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const email = session.customer_email;

        const users = loadUsers();
        users[email] = { plan: "pro", active: true };
        saveUsers(users);

        console.log("✅ User upgraded:", email);
      }

      res.json({ received: true });
    }
  );
}
