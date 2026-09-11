import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as unknown as "2026-08-26.dahlia", // Workaround for TS type conflict
  appInfo: {
    name: 'EstateScale',
    version: '0.1.0',
  },
});
