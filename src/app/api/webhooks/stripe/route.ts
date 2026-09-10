import { NextResponse } from "next/server";
import { stripe } from "@/lib/billing/stripe";
import { BillingService } from "@/lib/billing/service";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_mock";

export async function POST(req: Request) {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return NextResponse.json({ error: "Missing stripe signature" }, { status: 400 });
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    } catch (err: unknown) {
        return NextResponse.json({ error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}` }, { status: 400 });
    }

    // We process only specific subscription related events
    const supportedEvents = [
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted"
    ];

    if (!supportedEvents.includes(event.type)) {
        // Acknowledge receipt of unsupported event gracefully
        return NextResponse.json({ received: true });
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as import('stripe').Stripe.Checkout.Session;
            if (session.subscription) {
               await BillingService.syncSubscriptionFromStripe(session.subscription as string);
            }
        } else {
            const subscription = event.data.object as import('stripe').Stripe.Subscription;
            await BillingService.syncSubscriptionFromStripe(subscription.id);
        }

        return NextResponse.json({ received: true });
    } catch (err: unknown) {
        console.error("Webhook processing failed", err);
        return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
    }
}
