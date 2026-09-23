import { z } from 'zod';

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DIRECT_URL: z.string().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    AUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL').optional(),
    AUTH_URL: z.string().url('AUTH_URL must be a valid URL').optional(),
    VERCEL_URL: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
    GEMINI_REASONING_MODEL: z.string().optional(),
    GEMINI_ECONOMY_MODEL: z.string().optional(),
    AI_FALLBACK_ENABLED: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const authSecret = env.AUTH_SECRET || env.NEXTAUTH_SECRET;
    if (!authSecret || authSecret.length < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXTAUTH_SECRET'],
        message: 'AUTH_SECRET or NEXTAUTH_SECRET is required and must be at least 16 characters long',
      });
    }

    if (env.NODE_ENV === 'production') {
      if (!env.DIRECT_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DIRECT_URL'],
          message: 'DIRECT_URL is required in production for connection pooling migrations',
        });
      }
      if (!env.CRON_SECRET || env.CRON_SECRET.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CRON_SECRET'],
          message: 'CRON_SECRET is required in production and must be at least 8 characters',
        });
      }
      const appUrl = env.AUTH_URL || env.NEXTAUTH_URL || env.VERCEL_URL;
      if (!appUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NEXTAUTH_URL'],
          message: 'AUTH_URL or NEXTAUTH_URL is required in production',
        });
      }
      if (!env.GEMINI_API_KEY && !env.GOOGLE_GENERATIVE_AI_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GEMINI_API_KEY'],
          message: 'GEMINI_API_KEY is required in production to power the Two-Tier AI architecture',
        });
      }
    if (env.TWILIO_ACCOUNT_SID && !env.TWILIO_AUTH_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TWILIO_AUTH_TOKEN'],
        message: 'TWILIO_AUTH_TOKEN is required when TWILIO_ACCOUNT_SID is configured',
      });
    }
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function validateEnv(env: Record<string, string | undefined> = process.env): ServerEnv {
  if (
    env === process.env &&
    (process.env.NODE_ENV === 'test' ||
      process.env.SKIP_ENV_VALIDATION === 'true' ||
      process.env.npm_lifecycle_event === 'build' ||
      process.env.NEXT_PHASE === 'phase-production-build')
  ) {
    // In build or test runner environment, skip schema checks on process.env
    return env as unknown as ServerEnv;
  }

  const result = serverEnvSchema.safeParse(env);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `  - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');

    console.error(`\n🚨 CRITICAL CONFIGURATION ERROR: Invalid environment variables:\n${errorMessages}\n`);
    throw new Error(`Invalid environment variables:\n${errorMessages}`);
  }

  return result.data;
}
