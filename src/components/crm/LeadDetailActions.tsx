'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { updateLeadStatusAction, addLeadNoteAction } from '@/lib/actions/crm';
import { LeadStatus } from '@prisma/client';
import { Loader2, Plus } from 'lucide-react';

export function LeadStatusSelector({
  slug,
  leadId,
  currentStatus,
}: {
  slug: string;
  leadId: string;
  currentStatus: LeadStatus;
}) {
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as LeadStatus;
    setStatus(nextStatus);
    setUpdating(true);
    await updateLeadStatusAction(slug, leadId, nextStatus);
    setUpdating(false);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">Stage:</span>
      <div className="relative">
        <select
          value={status}
          disabled={updating}
          onChange={handleStatusChange}
          className="h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer disabled:opacity-50"
        >
          <option value="NEW">New Intake</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="FOLLOW_UP">Follow Up</option>
          <option value="APPOINTMENT_BOOKED">Tour Booked</option>
          <option value="CLOSED_WON">Closed Won</option>
          <option value="CLOSED_LOST">Archived</option>
        </select>
        {updating && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
          </div>
        )}
      </div>
    </div>
  );
}

export function LeadNoteComposer({
  slug,
  leadId,
}: {
  slug: string;
  leadId: string;
}) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    setError(null);

    const res = await addLeadNoteAction(slug, leadId, content.trim());
    setSaving(false);

    if (res.success) {
      setContent('');
    } else {
      setError(res.error || 'Failed to save note');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs">{error}</div>
      )}
      <textarea
        rows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add private advisor memo or property discussion notes..."
        className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none placeholder:text-slate-400"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={saving || !content.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3 rounded-xl gap-1.5 cursor-pointer shadow-2xs"
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memo</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
