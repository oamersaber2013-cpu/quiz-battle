import { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { handleWebhook } from "../lib/stripe";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, {
  apiVersion: "2024-12-18.acacia",
}) : null;

export const webhooksRouter: FastifyPluginAsync = async (app) => {
  app.post("/stripe", async (req, reply) => {
    if (!stripe) {
      return reply.status(503).send({ error: "Stripe not configured" });
    }

    const sig = req.headers["stripe-signature"];

    if (!sig) {
      return reply.status(400).send({ error: "No signature" });
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body as any,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );

      await handleWebhook(event);

      return reply.send({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err.message);
      return reply.status(400).send({ error: err.message });
    }
  });
};
