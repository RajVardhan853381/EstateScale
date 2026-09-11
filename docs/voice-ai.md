# Voice AI

## Architecture
EstateScale uses Twilio Voice APIs combined with WebSockets (Media Streams) to stream real-time audio to and from the AI Provider. Outbound calls are executed asynchronously through BullMQ, maintaining non-blocking event loops, while inbound calls are connected immediately via Webhooks.

## Tools
The Voice Agent has access to specific tools like `updateLeadStatus` and `addLeadNote`. These tools strictly use Zod parameters and are enforced server-side. Agents must be explicitly granted access to a tool via their `allowedTools` configuration.

## Tenant Isolation
All calls, agents, webhooks, and tool executions are explicitly bound to the `organizationId`. A webhook lookup securely verifies that the destination phone number belongs to the active organization before instantiating an AI session.
