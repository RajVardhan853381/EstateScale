import { NextResponse } from "next/server";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { executeCopilotChat } from "@/lib/ai/studio/copilot";

export async function POST(req: Request) {
    try {
        const { messages, slug } = await req.json();

        if (!slug || !messages) {
             return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { organization, membership } = await requireOrganizationMember(slug);

        if (membership.role !== "OWNER" && membership.role !== "ADMIN" && membership.role !== "AGENT") {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const result = await executeCopilotChat(organization.id, messages);

        return NextResponse.json({ message: result.text });

    } catch (error: unknown) {
        console.error("Copilot Error:", error);
        return NextResponse.json({ error: "Failed to generate AI response." }, { status: 500 });
    }
}
