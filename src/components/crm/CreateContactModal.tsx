'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createContactAction } from '@/lib/actions/crm';
import { UserPlus, Plus, Loader2, Mail, Phone, User, Sparkles } from 'lucide-react';

interface CreateContactModalProps {
  slug: string;
  triggerButton?: React.ReactElement;
}

export function CreateContactModal({ slug, triggerButton }: CreateContactModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() && !formData.email.trim() && !formData.phone.trim()) {
      setError('Provide at least a name, email address, or phone number.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createContactAction(slug, {
      firstName: formData.firstName.trim() || undefined,
      lastName: formData.lastName.trim() || undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
    });

    setLoading(false);

    if (res.success) {
      setOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '' });
    } else {
      setError(res.error || 'Failed to save contact');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          triggerButton || (
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm hover:shadow-indigo-500/20 shadow-indigo-600/30 gap-2 h-10 px-4 rounded-xl transition-all cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Add Contact</span>
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                Add Client to Directory
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Store client contact details for multi-property association.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              Full Name
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                className="rounded-xl border-slate-200 text-sm h-10"
              />
              <Input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                className="rounded-xl border-slate-200 text-sm h-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Address
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="client@luxuryportfolio.com"
                className="rounded-xl border-slate-200 text-sm h-10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number
              </label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 234-5678"
                className="rounded-xl border-slate-200 text-sm h-10"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl border-slate-200 text-slate-600 text-sm h-10 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold h-10 px-5 shadow-sm shadow-indigo-600/30 gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Contact</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
