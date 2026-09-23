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
import { createLeadAction } from '@/lib/actions/crm';
import { Plus, UserPlus, Loader2, Sparkles, Building, DollarSign, MapPin, Calendar, Mail, Phone, User } from 'lucide-react';

interface CreateLeadModalProps {
  slug: string;
  triggerButton?: React.ReactElement;
}

export function CreateLeadModal({ slug, triggerButton }: CreateLeadModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    budget: '',
    propertyType: 'Single Family Luxury',
    location: '',
    timeline: '1-3 Months',
    notesText: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Please provide both first and last name.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createLeadAction(slug, {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      propertyType: formData.propertyType || undefined,
      location: formData.location.trim() || undefined,
      timeline: formData.timeline || undefined,
      notesText: formData.notesText.trim() || undefined,
    });

    setLoading(false);

    if (res.success) {
      setOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        budget: '',
        propertyType: 'Single Family Luxury',
        location: '',
        timeline: '1-3 Months',
        notesText: '',
      });
    } else {
      setError(res.error || 'Failed to create lead');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          triggerButton || (
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm hover:shadow-indigo-500/20 shadow-indigo-600/30 gap-2 h-10 px-4 rounded-xl transition-all cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Create Lead</span>
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                Register New Client Lead
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Instantly connect to MLS pipeline and trigger AI scoring engine.
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

          {/* Contact Identity */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              Client Identity
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  required
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name *"
                  className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 text-sm h-10"
                />
              </div>
              <div>
                <Input
                  required
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name *"
                  className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 text-sm h-10"
                />
              </div>
            </div>
          </div>

          {/* Contact Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="client@luxuryestate.com"
                className="rounded-xl border-slate-200 focus:border-indigo-500 text-sm h-10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone (SMS Capable)
              </label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 345-6789"
                className="rounded-xl border-slate-200 focus:border-indigo-500 text-sm h-10"
              />
            </div>
          </div>

          {/* Property Interests & Budget */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-500" />
              Property Preferences
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-slate-400" />
                  Estimated Budget (USD)
                </label>
                <Input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="e.g. 1750000"
                  className="rounded-xl border-slate-200 focus:border-indigo-500 font-mono text-sm h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  Property Type
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Single Family Luxury">Single Family Luxury</option>
                  <option value="Penthouse & High-Rise">Penthouse & High-Rise</option>
                  <option value="Waterfront Villa">Waterfront Villa</option>
                  <option value="Modern Architectural">Modern Architectural</option>
                  <option value="Multi-Family Investment">Multi-Family Investment</option>
                  <option value="Commercial Real Estate">Commercial Real Estate</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Target Location / Submarket
                </label>
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Beverly Hills, CA or Aspen, CO"
                  className="rounded-xl border-slate-200 focus:border-indigo-500 text-sm h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Target Purchase Timeline
                </label>
                <select
                  name="timeline"
                  value={formData.timeline}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Immediate (<30 Days)">Immediate (&lt;30 Days)</option>
                  <option value="1-3 Months">1-3 Months</option>
                  <option value="3-6 Months">3-6 Months</option>
                  <option value="Exploring & Researching">Exploring &amp; Researching</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes & Context */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              Lead Notes &amp; Specific Inquiries
            </label>
            <textarea
              name="notesText"
              rows={2}
              value={formData.notesText}
              onChange={handleChange}
              placeholder="Prefers high ceilings, minimum 4 garage bays, pre-approved with JPMorgan..."
              className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 text-sm h-10 px-4 cursor-pointer"
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
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create &amp; Index Lead</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
