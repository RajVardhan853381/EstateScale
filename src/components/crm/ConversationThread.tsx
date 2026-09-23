'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { triggerSmsSend } from '@/lib/actions/sms';
import { Send, MessageSquare, CheckCheck, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type Message = {
  id: string;
  body: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: string;
  createdAt: Date;
};

export function ConversationThread({
  organizationSlug,
  leadId,
  messages,
  isOptedOut,
}: {
  organizationSlug: string;
  leadId: string;
  messages: Message[];
  isOptedOut: boolean;
}) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    setError(null);
    try {
      const res = await triggerSmsSend(organizationSlug, leadId, inputText.trim());
      if (res.success) {
        setInputText('');
      } else {
        setError(res.error || 'Failed to dispatch message');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown communication error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[520px] overflow-hidden border border-slate-200/80 shadow-xs">
      {/* Header */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Direct SMS Channel
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Twilio In-Process Carrier Linked</span>
            </div>
          </div>
        </div>

        {isOptedOut ? (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Client Opted Out
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Compliant A2P 10DLC
          </span>
        )}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-2 text-slate-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No Messages Exchanged</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Outbound texts or replies received via webhook will appear chronologically here.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'OUTBOUND';
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[82%] ${isOutbound ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    isOutbound
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs'
                  }`}
                >
                  {msg.body}
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400 font-mono">
                  <span>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                  {isOutbound && (
                    <span className="flex items-center gap-0.5 text-indigo-500 font-semibold">
                      <CheckCheck className="w-3 h-3" />
                      {msg.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Composer Footer */}
      <div className="p-3 bg-white border-t border-slate-200/80">
        {error && (
          <div className="mb-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isOptedOut || isSending}
            placeholder={
              isOptedOut
                ? 'Client has opted out of SMS messages'
                : 'Type message to client...'
            }
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100"
          />
          <Button
            type="submit"
            disabled={isOptedOut || isSending || !inputText.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
