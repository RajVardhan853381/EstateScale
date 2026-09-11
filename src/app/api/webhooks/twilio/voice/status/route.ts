import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const callSid = formData.get("CallSid")?.toString();
        const status = formData.get("CallStatus")?.toString();
        const durationStr = formData.get("CallDuration")?.toString();

        if (!callSid || !status) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const call = await prisma.voiceCall.findUnique({
             where: { providerCallId: callSid }
        });

        if (!call) {
             return NextResponse.json({ received: true, note: "Call record not found locally" });
        }

        let mappedStatus = "COMPLETED";
        if (status === "failed") mappedStatus = "FAILED";
        if (status === "canceled" || status === "no-answer") mappedStatus = "CANCELED";

        const duration = durationStr ? parseInt(durationStr, 10) : undefined;

        await prisma.voiceCall.update({
            where: { id: call.id },
            data: {
                status: mappedStatus,
                duration: duration,
                endedAt: new Date()
            }
        });

        // Generate Lead Activity if completed successfully
        if (mappedStatus === "COMPLETED" && call.leadId) {
             await prisma.leadActivity.create({
                 data: {
                     organizationId: call.organizationId,
                     leadId: call.leadId,
                     type: "CONTACTED",
                     description: `Voice call completed (${duration || 0}s).`,
                 }
             });
        }

        return NextResponse.json({ received: true });

    } catch (error: unknown) {
        console.error("Twilio Voice Status Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
