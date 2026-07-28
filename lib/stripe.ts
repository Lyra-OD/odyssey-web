import "server-only";

import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in environment.");
  }

  stripeSingleton = new Stripe(secretKey, {
    // Version API Stripe la plus recente au moment de l'implementation.
    apiVersion: "2026-04-22.dahlia",
  });

  return stripeSingleton;
}

