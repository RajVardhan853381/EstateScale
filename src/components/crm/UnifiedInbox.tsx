"use client";

import { useState } from "react";
import { MessageSquare, MoreVertical, Send, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type InboxConversation = {
    id: string;
    channel: string;
    status: string;
    contact: { firstName: string | null; lastName: string | null };
    messages: { id: string; body: string; direction: string; createdAt: Date }[];
};

export function UnifiedInbox({ conversations }: { conversations: InboxConversation[] }) {
    const [selectedId, setSelectedId] = useState<string | null>(conversations.length > 0 ? conversations[0].id : null);
    const [replyText, setReplyText] = useState("");
    const isSending = false;

    const selectedConv = conversations.find(c => c.id === selectedId);

    // In a real implementation, you'd fetch the full thread here
    // We mock it for the UI structure based on the initial loaded single message

    return (
        <div className="flex flex-1 overflow-hidden bg-white">
            {/* Conversation List Sidebar */}
            <div className="w-full md:w-80 border-r flex flex-col h-full bg-gray-50">
                <div className="p-4 border-b bg-white">
                    <h2 className="text-lg font-bold tracking-tight text-gray-900">Unified Inbox</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                         <div className="p-8 text-center text-sm text-gray-500">No conversations found.</div>
                    ) : (
                        conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedId(conv.id)}
                                className={`w-full text-left p-4 border-b hover:bg-gray-100 transition-colors ${selectedId === conv.id ? "bg-white border-l-4 border-l-blue-600 shadow-sm" : ""}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-gray-900 text-sm truncate">
                                        {conv.contact?.firstName} {conv.contact?.lastName}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                        {conv.messages[0] ? new Date(conv.messages[0].createdAt).toLocaleDateString() : ""}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-600 truncate max-w-[180px]">
                                        {conv.messages[0]?.body || "No messages"}
                                    </p>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 bg-gray-100">{conv.channel}</Badge>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Conversation Detail View */}
            <div className="hidden md:flex flex-1 flex-col h-full bg-white relative">
                {selectedConv ? (
                    <>
                        <div className="h-16 px-6 border-b flex items-center justify-between bg-white shadow-sm z-10">
                            <div>
                                <h3 className="font-semibold text-gray-900 text-lg">
                                    {selectedConv.contact?.firstName} {selectedConv.contact?.lastName}
                                </h3>
                                <div className="flex gap-2 mt-1">
                                    <Badge variant="secondary" className="text-[10px]">{selectedConv.channel}</Badge>
                                    {selectedConv.status === "OPT_OUT" && <Badge variant="destructive" className="text-[10px]">Opted Out</Badge>}
                                </div>
                            </div>
                            <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {/* Dummy structural messages since full load is deferred to Phase 12 scope API routing */}
                            <div className="space-y-4">
                                {selectedConv.messages.map((msg) => (
                                    <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.direction === "OUTBOUND" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                                        <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${msg.direction === "OUTBOUND" ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"}`}>
                                            {msg.body}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 px-1 font-medium">
                                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50">
                            <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); }}>
                                <Input
                                    placeholder={selectedConv.status === "OPT_OUT" ? `Lead opted out of ${selectedConv.channel}` : `Type a ${selectedConv.channel} message...`}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    disabled={selectedConv.status === "OPT_OUT" || isSending}
                                    className="bg-white"
                                />
                                <Button type="submit" disabled={!replyText.trim() || selectedConv.status === "OPT_OUT" || isSending}>
                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
                        <p>Select a conversation to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
}
