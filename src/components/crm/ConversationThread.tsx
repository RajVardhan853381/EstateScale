"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { triggerSmsSend } from "@/lib/actions/sms";
import { useFormStatus } from "react-dom";

type Message = {
    id: string;
    body: string;
    direction: "INBOUND" | "OUTBOUND";
    status: string;
    createdAt: Date;
};

export function ConversationThread({
    organizationSlug,
    leadId,
    messages,
    isOptedOut
}: {
    organizationSlug: string;
    leadId: string;
    messages: Message[];
    isOptedOut: boolean;
}) {
    return (
        <Card className="flex flex-col h-[500px]">
            <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm font-semibold flex justify-between items-center">
                    <span>SMS Conversation</span>
                    {isOptedOut && <Badge variant="destructive">OPT-OUT</Badge>}
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No messages yet.</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.direction === "OUTBOUND" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                            <div className={`px-3 py-2 rounded-lg text-sm ${msg.direction === "OUTBOUND" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                {msg.body}
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">
                                {new Date(msg.createdAt).toLocaleTimeString()} · {msg.status}
                            </span>
                        </div>
                    ))
                )}
            </CardContent>

            <CardFooter className="p-3 border-t">
                <form
                    action={async (formData) => {
                        const body = formData.get("body") as string;
                        if (!body) return;
                        await triggerSmsSend(organizationSlug, leadId, body);
                    }}
                    className="flex w-full gap-2"
                >
                    <Input
                        name="body"
                        placeholder={isOptedOut ? "Lead has opted out" : "Type a message..."}
                        disabled={isOptedOut}
                        autoComplete="off"
                        className="flex-1"
                    />
                    <SubmitButton disabled={isOptedOut} />
                </form>
            </CardFooter>
        </Card>
    );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending || disabled}>
            {pending ? "Sending..." : "Send"}
        </Button>
    );
}
