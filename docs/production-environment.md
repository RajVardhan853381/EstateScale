# Production Environment Constraints

EstateScale executes on Node.js relying dynamically on serverless paradigms for Front/API scaling coupled to a persistent state-machine background worker.

## 1. Required Variables

```bash
DATABASE_URL=postgres://...     # Neon/AWS Postgres
REDIS_URL=redis://...          # Upstash (BullMQ & Rate Limits)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
GEMINI_API_KEY=...
NEXTAUTH_SECRET=...            # Cryptographic salt for Auth.js sessions
NEXTAUTH_URL=https://...
```

## 2. Infrastructure Footprint

- **Web Host**: Vercel Serverless (Scales horizontally seamlessly, ephemeral memory).
- **Background Worker**: `npm run start:worker` executing on long-lived instances (Render/Railway/AWS EC2) polling Redis natively.
- **Relational DB**: Uses strict Prisma `organizationId` boundaries.

## 3. Storage Dependencies

EstateScale strictly assumes Zero local persistence due to serverless constraints. CSV imports process into memory, serialize JSON boundaries, and map efficiently to Prisma records dropping file buffers organically without relying on `/tmp` structures natively.
