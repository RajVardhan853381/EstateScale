'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrganizationSetupState } from '@prisma/client';
import {
  Building2,
  Users,
  Layers,
  UploadCloud,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type WizardProps = {
  slug: string;
  initialState: OrganizationSetupState | null;
};

const steps = [
  { id: 'COMPANY', label: 'Company', icon: Building2 },
  { id: 'USERS', label: 'Team', icon: Users },
  { id: 'CRM', label: 'Pipeline', icon: Layers },
  { id: 'IMPORT', label: 'Import', icon: UploadCloud },
  { id: 'AI', label: 'AI Core', icon: Sparkles },
  { id: 'COMMUNICATION', label: 'Outreach', icon: MessageSquare },
  { id: 'REVIEW', label: 'Activation', icon: CheckCircle2 },
];

export function OnboardingWizard({ slug, initialState }: WizardProps) {
  const router = useRouter();
  const [currentStepIdx, setCurrentStepIdx] = useState(() => {
    const found = steps.findIndex((s) => s.id === initialState?.currentStep);
    return found >= 0 ? found : 0;
  });

  const [isActivating, setIsActivating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);

  // CSV Import State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    totalRecords: number;
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);

  const nextStep = async () => {
    setIsSaving(true);
    try {
      const currentStep = steps[currentStepIdx].id;
      let config = {};
      if (currentStep === 'AI') config = { enabled: aiEnabled };
      if (currentStep === 'COMMUNICATION') config = { enabled: smsEnabled };

      const advanceTo = currentStepIdx < steps.length - 1 ? steps[currentStepIdx + 1].id : currentStep;

      const res = await fetch(`/api/onboarding/${slug}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: currentStep, config, advanceTo }),
      });

      if (res.ok) {
        if (currentStepIdx < steps.length - 1) {
          setCurrentStepIdx(currentStepIdx + 1);
        }
      } else {
        console.error('Failed to save step configuration');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const prevStep = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const uploadCsv = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/onboarding/${slug}/import`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult(data.job);
      } else {
        alert('Import failed: ' + data.error);
      }
    } catch (e) {
      console.error('Upload error', e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const res = await fetch(`/api/onboarding/${slug}/activate`, {
        method: 'POST',
      });
      if (res.ok) {
        router.push(`/org/${slug}/dashboard`);
      } else {
        alert('Activation failed. Please check requirements.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsActivating(false);
    }
  };

  const currentStep = steps[currentStepIdx].id;

  return (
    <div className="max-w-3xl mx-auto glass-panel rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/90 overflow-hidden">
      {/* Top Stepper Bar */}
      <div className="border-b border-slate-200/80 bg-slate-50/70 p-4 sm:px-6 overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between min-w-[540px] gap-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'text-slate-400'
                  }`}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <span>{step.label}</span>
                </div>

                {idx < steps.length - 1 && (
                  <div
                    className={`w-4 h-0.5 rounded-full ${
                      idx < currentStepIdx ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Body */}
      <div className="p-6 sm:p-10 min-h-[380px] flex flex-col justify-between">
        {currentStep === 'COMPANY' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Brokerage Profile Initialized
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your isolated organization workspace has been created with cryptographic tenant guarantees.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Tenant Identifier</div>
                  <div className="text-xs font-mono text-slate-500">/org/{slug}</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200/70 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Multi-tenant schema boundaries verified</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'USERS' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Team Roles &amp; Permissions
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Owner privileges initialized. You can invite additional brokers, agents, and admins after platform activation.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Administrator Role</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                You hold full administrative authority to configure pipelines, review AI scoring parameters, and manage team members.
              </p>
            </div>
          </div>
        )}

        {currentStep === 'CRM' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Default Pipeline Stages
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                The institutional transaction state machine has been configured with real-time progression milestones.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="stage-pill-new">NEW INTAKE</span>
                <p className="text-[11px] text-slate-500 mt-2">Incoming web &amp; MLS inquiries</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="stage-pill-contacted">CONTACTED</span>
                <p className="text-[11px] text-slate-500 mt-2">Initial SMS outreach sent</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="stage-pill-qualified">QUALIFIED</span>
                <p className="text-[11px] text-slate-500 mt-2">AI Intent score &gt; 75 verified</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="stage-pill-contacted">TOUR BOOKED</span>
                <p className="text-[11px] text-slate-500 mt-2">Appointment scheduled</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="stage-pill-won">CLOSED WON</span>
                <p className="text-[11px] text-slate-500 mt-2">Transaction finalized</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="stage-pill-lost">ARCHIVED</span>
                <p className="text-[11px] text-slate-500 mt-2">Disqualified or cold lead</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'IMPORT' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Import Existing Client Portfolio
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload a CSV containing existing buyers, valuations, and contact information (optional).
              </p>
            </div>

            {uploadResult ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Portfolio Import Succeeded
                </div>
                <div className="grid grid-cols-2 gap-2 text-emerald-700 font-mono pt-1">
                  <div>Processed: {uploadResult.totalRecords}</div>
                  <div>Imported: {uploadResult.imported}</div>
                  <div>Skipped: {uploadResult.skipped}</div>
                  <div>Failed: {uploadResult.failed}</div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors text-center bg-slate-50/50">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-700 mb-1">
                  {file ? file.name : 'Select Client Portfolio CSV'}
                </p>
                <p className="text-[11px] text-slate-400 mb-4">
                  Columns supported: firstName, lastName, email, phone, budget, propertyType
                </p>
                <div className="flex items-center justify-center gap-3">
                  <label className="cursor-pointer px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
                    Browse File
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {file && (
                    <Button
                      size="sm"
                      onClick={uploadCsv}
                      disabled={isUploading}
                      className="text-xs font-semibold h-9 rounded-xl gap-1.5"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5" />
                      )}
                      <span>Upload &amp; Index</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'AI' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Autonomous AI Lead Qualification
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enable cognitive parsing of buyer inquiries, purchase capacity estimates, and response drafts.
              </p>
            </div>

            <div
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                aiEnabled
                  ? 'bg-indigo-50/60 border-indigo-300 shadow-xs'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Gemini Flash Cognitive Scorer</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Extract budget, timeline, and purchase intent signals automatically.
                  </div>
                </div>
              </div>

              <div
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  aiEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    aiEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 'COMMUNICATION' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Multi-Channel SMS Responder
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enable TCPA-compliant two-way messaging through carrier-verified 10DLC routes.
              </p>
            </div>

            <div
              onClick={() => setSmsEnabled(!smsEnabled)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                smsEnabled
                  ? 'bg-cyan-50/60 border-cyan-300 shadow-xs'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Twilio Carrier In-Process Route</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Immediate SMS response drafting and automated stop-word opt-out compliance.
                  </div>
                </div>
              </div>

              <div
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  smsEnabled ? 'bg-cyan-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    smsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 'REVIEW' && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Ready for Platform Activation
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                All foundational subsystems are verified and ready for live high-concurrence deal flow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Tenant Isolation Guaranteed</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>6 CRM Pipeline Stages Seeded</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>AI Cognitive Analysis: {aiEnabled ? 'Enabled' : 'Bypassed'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>SMS 10DLC Gateway: {smsEnabled ? 'Connected' : 'Bypassed'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Actions */}
        <div className="mt-8 pt-6 border-t border-slate-200/80 flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStepIdx === 0 || isSaving}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {currentStepIdx < steps.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 px-5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleActivate}
              disabled={isActivating || isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-6 rounded-xl shadow-sm shadow-emerald-600/30 gap-2 cursor-pointer"
            >
              {isActivating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating Workspace...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Activate EstateScale</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
