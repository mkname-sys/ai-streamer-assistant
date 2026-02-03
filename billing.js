// billing.js
import Stripe from "stripe";

const DEV_MODE = process.env.DEV_MODE === "true";

// If in dev mode, DO NOT initialize Stripe
let stripe = null;

if (!DEV_MODE) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY missing in production mode");
  }

  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Safe function export
export async function createCheckout(req, res) {
  if (DEV_MODE) {
    return res.json({
      dev: true,
      message: "Stripe disabled in DEV_MODE"
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Pro Plan" },
            unit_amount: 500,
            recurring: { interval: "month" }
          },
          quantity: 1
        }
      ],
      success_url: "http://localhost:3000/dashboard.html",
      cancel_url: "http://localhost:3000/"
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Stripe failed" });
  }
}
