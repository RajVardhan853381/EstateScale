"use client";

import { createOrgAction } from "../_actions/create-org";
import { Building2, Globe, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreateOrgForm() {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Provision New Organization
          </h2>
          <p className="text-xs text-slate-400">Initialize a multi-tenant client portal</p>
        </div>
      </div>

      <form action={createOrgAction} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            Brokerage Name *
          </label>
          <input
            type="text"
            name="name"
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            placeholder="e.g. Apex Luxury Real Estate"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            Workspace Slug (URL Path) *
          </label>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500">
            <span className="px-3 py-2.5 bg-slate-50 border-r border-slate-200 text-xs text-slate-400 font-mono">
              /org/
            </span>
            <input
              type="text"
              name="slug"
              required
              className="flex-1 px-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
              placeholder="apex-luxury"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            Primary Admin Email
          </label>
          <input
            type="email"
            name="adminEmail"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            placeholder="admin@brokerage.com"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            An encrypted activation invitation will be dispatched to this email.
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create &amp; Provision Tenant</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
