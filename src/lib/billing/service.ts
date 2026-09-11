import { stripe } from "./stripe";
import { prisma } from "@/lib/prisma";
import { getPlanByStripePriceId } from "./plans";

export class BillingService {
    static async createOrGetCustomer(organizationId: string, email?: string, name?: string) {
        let sub = await prisma.subscription.findUnique({
            where: { organizationId }
        });

        if (sub && sub.stripeCustomerId) {
            return sub.stripeCustomerId;
        }

        // Create new stripe customer
        const customer = await stripe.customers.create({
            email,
            name,
            metadata: { organizationId }
        });

        if (!sub) {
            sub = await prisma.subscription.create({
                data: {
                    organizationId,
                    stripeCustomerId: customer.id,
                    plan: "FREE",
                    status: "ACTIVE" // Free is technically always active
                }
            });
        } else {
            await prisma.subscription.update({
                where: { organizationId },
                data: { stripeCustomerId: customer.id }
            });
        }

        return customer.id;
    }

    static async createCheckoutSession(organizationId: string, priceId: string, successUrl: string, cancelUrl: string) {
        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: { memberships: { include: { user: true }, take: 1 } } // Get primary admin email
        });

        if (!org) throw new Error("Organization not found");

        const adminEmail = org.memberships[0]?.user?.email || undefined;
        const customerId = await this.createOrGetCustomer(organizationId, adminEmail, org.name);

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                { price: priceId, quantity: 1 }
            ],
            mode: "subscription",
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { organizationId }
        });

        return session;
    }

    static async createBillingPortalSession(organizationId: string, returnUrl: string) {
        const sub = await prisma.subscription.findUnique({
            where: { organizationId }
        });

        if (!sub || !sub.stripeCustomerId) {
            throw new Error("No billing customer associated with this organization");
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: sub.stripeCustomerId,
            return_url: returnUrl
        });

        return session;
    }

    static async syncSubscriptionFromStripe(stripeSubscriptionId: string) {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
            expand: ['items.data.price']
        });

        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const priceId = subscription.items.data[0].price.id;

        const planDef = getPlanByStripePriceId(priceId);

        // Map stripe status to our subset
        let status = subscription.status.toUpperCase();
        if (["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "UNPAID", "INCOMPLETE", "INCOMPLETE_EXPIRED"].indexOf(status) === -1) {
            status = "INCOMPLETE";
        }

        const dbSub = await prisma.subscription.findUnique({
            where: { stripeCustomerId: customerId }
        });

        const subObj = subscription as unknown as { current_period_start: number; current_period_end: number; cancel_at_period_end: boolean };

        if (dbSub) {
            await prisma.subscription.update({
                where: { id: dbSub.id },
                data: {
                    stripeSubscriptionId: subscription.id,
                    plan: planDef.id,
                    status,
                    currentPeriodStart: new Date(subObj.current_period_start * 1000),
                    currentPeriodEnd: new Date(subObj.current_period_end * 1000),
                    cancelAtPeriodEnd: subObj.cancel_at_period_end
                }
            });
        }
    }
}
