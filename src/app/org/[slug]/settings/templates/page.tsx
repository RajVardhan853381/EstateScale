'use client';

import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  FileText,
  Copy,
  Sparkles,
  MessageSquare,
  GitBranch,
  Loader2,
} from 'lucide-react';

type Template = {
  id: string;
  organizationId: string | null;
  type: string;
  name: string;
  description: string | null;
};

export default function TemplatesSettingsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = use(props.params);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/org/${params.slug}/settings/templates`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .finally(() => setLoading(false));
  }, [params.slug]);

  const handleDuplicate = async (templateId: string, name: string) => {
    setDuplicatingId(templateId);
    try {
      const res = await fetch(`/api/org/${params.slug}/settings/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DUPLICATE', templateId, newName: `${name} (Copy)` }),
      });
      if (res.ok) {
        const newT = await res.json();
        setTemplates([newT, ...templates]);
      }
    } finally {
      setDuplicatingId(null);
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SMS':
      case 'MESSAGE':
        return <MessageSquare className="w-5 h-5 text-cyan-600" />;
      case 'AI':
      case 'PROMPT':
        return <Sparkles className="w-5 h-5 text-indigo-600" />;
      case 'JOURNEY':
      case 'PIPELINE':
        return <GitBranch className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Workspace Configuration
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Template &amp; Outreach Defaults
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage CRM pipeline configurations, autonomous AI prompts, and carrier SMS communication blueprints.
          </p>
        </div>

        {/* Sub-nav switcher */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80">
          <Link
            href={`/org/${params.slug}/settings/security`}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Security &amp; Roles
          </Link>
          <Link
            href={`/org/${params.slug}/settings/templates`}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-700 shadow-2xs"
          >
            Templates
          </Link>
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Available Blueprint Templates ({templates.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Tenant Inherited</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading template blueprints...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {templates.map((t) => (
              <div
                key={t.id}
                className="glass-panel p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-xs flex-shrink-0">
                        {getTemplateIcon(t.type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{t.name}</h3>
                        <span className="font-mono text-[10px] text-slate-400 uppercase">
                          Type: {t.type}
                        </span>
                      </div>
                    </div>

                    {!t.organizationId ? (
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        Global Standard
                      </Badge>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Custom Tenant
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-5">
                    {t.description || 'Configured messaging blueprint for automated deal outreach.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={duplicatingId === t.id}
                    onClick={() => handleDuplicate(t.id, t.name)}
                    className="text-xs font-semibold gap-1.5 h-8 px-3 rounded-xl cursor-pointer"
                  >
                    {duplicatingId === t.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Duplicating...</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Duplicate to Customize</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}

            {templates.length === 0 && (
              <div className="col-span-full glass-panel p-10 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-200/80">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No Templates Found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Standard templates can be seeded or created for automated journey responses.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
