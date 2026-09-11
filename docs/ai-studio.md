# AI Studio & Copilot

## Architecture
EstateScale provides a multi-tenant AI Studio. It supports configurable `AIAgents` and an embedded `Copilot` chat interface.

The `AIAgent` acts autonomously on explicit triggers or workflows, mapped directly into the Prisma database with explicit scopes for tooling to avoid unrestricted AI SQL access.
The `Copilot` connects via `src/app/api/ai/studio/copilot`, using the Vercel AI SDK to securely expose CRM-native functions (`studioTools`) explicitly bound to the authenticated `organizationId`.

## Tool Security
All tools explicitly parse context via Zod structures and prepend the `organizationId` parameter directly inside the API route. This guarantees an AI cannot spoof a tool payload to modify or query records outside its tenant namespace.

## Future Hooks
Agents are modeled with `permissions` and `agentType` structures that can tie into the Phase 4 `Background Workers` to loop asynchronous actions securely without hitting synchronous timeout limits in Next.js Serverless functions.
