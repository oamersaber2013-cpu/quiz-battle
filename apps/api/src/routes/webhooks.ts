import { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { handleWebhook } from "../lib/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

export const webhooksRouter: FastifyPluginAsync = async (app) => {
  app.post("/stripe", async (req, reply) => {
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
