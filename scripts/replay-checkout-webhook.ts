/**
 * QA ops — rejoue checkout.session.completed en local sans stripe listen.
 * Récupère la session Stripe réelle, signe l'event avec STRIPE_WEBHOOK_SECRET,
 * POST vers http://localhost:3000/api/stripe/webhook.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Stripe from "stripe";

const DEFAULT_SESSION_ID =
  "cs_test_b1Jc3wPHvdLL1uSgnLKIG8uLQL91VJY3BWkEHvFHYZrLqjFKQATgljSOrD";
const WEBHOOK_URL = "http://localhost:3000/api/stripe/webhook";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    /* .env.local absent */
  }
}

function resolveWebhookSecret(): string {
  const direct = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (direct) return direct;

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("STRIPE_WEBHOOK_SECRET") && value?.trim()) {
      return value.trim();
    }
  }

  throw new Error(
    "Missing STRIPE_WEBHOOK_SECRET in .env.local (whsec_ from stripe listen or Dashboard).",
  );
}

async function main() {
  loadEnvLocal();

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = resolveWebhookSecret();
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in .env.local.");
  }

  const sessionId = process.argv[2]?.trim() || DEFAULT_SESSION_ID;
  const stripe = new Stripe(secretKey, { apiVersion: "2026-04-22.dahlia" });

  console.log("[replay-webhook] Fetch session…", { sessionId });
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  if (session.payment_status !== "paid") {
    throw new Error(
      `Session not paid (payment_status=${session.payment_status}). Complete payment in Stripe first.`,
    );
  }

  const eventId = `evt_qa_replay_${Date.now()}`;
  const payload = {
    id: eventId,
    object: "event",
    api_version: "2026-04-22.dahlia",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    data: { object: session },
  };

  const body = JSON.stringify(payload);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: webhookSecret,
  });

  console.log("[replay-webhook] POST local webhook…", {
    eventId,
    project_id: session.metadata?.project_id ?? null,
    checkout_id: session.metadata?.checkout_id ?? null,
    amount_total: session.amount_total,
  });

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });

  const text = await res.text();
  console.log("[replay-webhook] Response:", { status: res.status, body: text });

  if (!res.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[replay-webhook] Échec:", error);
  process.exit(1);
});
