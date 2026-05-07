import Stripe from "stripe";
import { prisma } from "@quiz-battle/db";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, {
  apiVersion: "2024-12-18.acacia",
}) : null;

const PRICE_ID = process.env.STRIPE_PRICE_ID || "price_xxx";

export async function createCheckoutSession(userId: string, email: string) {
  if (!stripe) throw new Error("Stripe not configured");
  
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    payment_method_types: ["card"],
    line_items: [
      {
        price: PRICE_ID,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.FRONTEND_URL}/profile?success=true`,
    cancel_url: `${process.env.FRONTEND_URL}/store?canceled=true`,
    metadata: {
      userId,
    },
  });

  return session;
}

export async function createCustomerPortalSession(customerId: string) {
  if (!stripe) throw new Error("Stripe not configured");
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/profile`,
  });

  return session;
}

export async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      
      if (userId && session.customer) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            role: "subscriber",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus: "active",
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          subscriptionStatus: subscription.status,
          subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          role: "free",
          subscriptionStatus: "canceled",
          subscriptionEndsAt: new Date(),
        },
      });
      break;
    }
  }
}
