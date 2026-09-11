import { getAuthorizedTools } from "./tools";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function executeCopilotChat(
    organizationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: any[],
    allowedTools: string[] = ["searchLeads", "getPipelineSummary", "updateLeadStatus"]
) {
    const tools = getAuthorizedTools(allowedTools);

    // Vercel AI SDK handles tool execution automatically if maxSteps > 1
    // We just need to inject the context into the tools if we aren't using the experimental context hook natively.
    // To ensure strict multi-tenant security, we will wrap the tools to explicitly inject the organizationId context on execution.
    const securedTools = Object.fromEntries(
        Object.entries(tools).map(([key, tool]) => [
            key,
            {
                description: tool.description,
                parameters: tool.parameters,
                execute: async (args: unknown) => tool.execute(args, { organizationId })
            } as unknown as Record<string, unknown>
        ])
    ) as unknown as Record<string, unknown>;

    const securedResult = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: messages.map(m => `${m.role}: ${m.content}`).join("\n"),
        // @ts-expect-error Ignore complex Vercel AI SDK Type Mismatch internally on Record<string, Tool> vs ToolSet
        tools: securedTools,
        system: "You are an EstateScale real estate assistant. Answer concisely and use tools when you need CRM context."
    });

    return securedResult;
}
