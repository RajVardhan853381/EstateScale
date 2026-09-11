# Voice AI Operations

## Twilio Setup
Ensure you configure your incoming Twilio phone number with the `/api/webhooks/twilio/voice` webhook route as an HTTP POST. Status Callbacks should point to `/api/webhooks/twilio/voice/status` to log completions.

## Idempotency and Webhooks
Twilio webhooks may retry if the server is slow. We use a Prisma `upsert` utilizing `providerCallId` (which maps to Twilio's `CallSid`) as the unique identifier to ensure that multiple retries don't create phantom duplicate calls in the database.

## Testing Mode
Avoid using real destination numbers when running tests. Outbound tests mock the BullMQ queue rather than initiating real Twilio API calls.
