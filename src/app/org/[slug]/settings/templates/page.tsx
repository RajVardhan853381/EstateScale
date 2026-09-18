'use client';

import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Template = {
  id: string;
  organizationId: string | null;
  type: string;
  name: string;
  description: string | null;
};

export default function TemplatesSettingsPage(props: { params: Promise<{ slug: string }> }) {
  const params = use(props.params);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetch(`/api/org/${params.slug}/settings/templates`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setTemplates(data) : setTemplates([])));
  }, [params.slug]);

  const handleDuplicate = async (templateId: string, name: string) => {
    const res = await fetch(`/api/org/${params.slug}/settings/templates`, {
      method: 'POST',
      body: JSON.stringify({ action: 'DUPLICATE', templateId, newName: `${name} (Copy)` }),
    });
    if (res.ok) {
      const newT = await res.json();
      setTemplates([newT, ...templates]);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Template & Workspace Configuration</h1>
      <p className="text-slate-600 mb-8">
        Manage CRM pipelines, AI Agents, Journeys, and Communication defaults.
      </p>

      <div className="space-y-4">
        {templates.map((t) => (
          <div
            key={t.id}
            className="p-4 bg-white border rounded-lg flex items-center justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{t.name}</h3>
                {!t.organizationId && <Badge variant="secondary">Global Default</Badge>}
                {t.organizationId && (
                  <Badge variant="outline" className="border-green-500 text-green-700">
                    Custom Tenant
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Type: {t.type} | {t.description}
              </p>
            </div>
            <div>
              <Button onClick={() => handleDuplicate(t.id, t.name)} variant="outline">
                Duplicate to Edit
              </Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="text-slate-500">No templates found.</p>}
      </div>
    </div>
  );
}
