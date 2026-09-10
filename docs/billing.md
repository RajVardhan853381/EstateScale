# Billing & Subscriptions

## Architecture
EstateScale uses Stripe for subscription management and billing. The `Subscription` Prisma model represents a subset of the customer's Stripe state, acting as a local cache to authorize features based on `plan` and `status`.

## Webhooks
All webhooks route to `/api/webhooks/stripe`. The system verifies the Stripe signature securely using the `STRIPE_WEBHOOK_SECRET`. Only specific events (`checkout.session.completed`, `customer.subscription.updated`, etc.) update the database, effectively creating an idempotent synchronization flow.

## Access Policy
A tenant's subscription `status` determines their available functionality. If a payment fails (`PAST_DUE`), core application areas remain readable, but writes and usage (like sending SMS) are suspended based on existing quota implementations.
