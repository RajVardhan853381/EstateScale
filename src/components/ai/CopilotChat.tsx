"use client";

import { useState } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopilotChat({ slug }: { slug: string }) {
    const [messages, setMessages] = useState<{ role: string, content: string }[]>([
        { role: "assistant", content: "Hi! I'm your EstateScale AI Copilot. How can I help you manage your leads today?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const newMessages = [...messages, { role: "user", content: input }];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/ai/studio/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug, messages: newMessages })
            });
            const data = await res.json();
            if (data.message) {
                setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: "assistant", content: "Failed to communicate with AI." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] border rounded-lg bg-white shadow-sm overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {messages.map((m, idx) => (
                    <div key={idx} className={`flex gap-4 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-slate-200" : "bg-blue-600 text-white"}`}>
                            {m.role === "user" ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-sm ${m.role === "user" ? "bg-slate-100 text-slate-900 rounded-tr-sm" : "bg-white border text-slate-800 rounded-tl-sm shadow-sm"}`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-white border rounded-tl-sm shadow-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> <span className="text-sm text-gray-500">Thinking...</span>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-4 bg-white border-t">
                <form onSubmit={sendMessage} className="flex gap-3">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Copilot (e.g. 'Show me hot leads')"
                        className="bg-gray-50"
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
