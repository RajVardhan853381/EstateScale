'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { requestAiAnalysis } from '@/lib/actions/ai';
import { Sparkles, Loader2, Check, Copy, BrainCircuit, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { Prisma } from '@prisma/client';

type AssessmentPayload = Prisma.AiAssessmentGetPayload<Prisma.AiAssessmentDefaultArgs>;

export function AiLeadAssessment({
  slug,
  leadId,
  assessment,
  onApplySuggestedResponse,
}: {
  slug: string;
  leadId: string;
  assessment?: AssessmentPayload | null;
  onApplySuggestedResponse?: (text: string) => void;
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await requestAiAnalysis(slug, leadId);
      if (!res.success) {
        setError(res.error || 'Failed to trigger AI scoring.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown Error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score?: number | null) => {
    if (!score) return 'text-slate-400 bg-slate-50 border-slate-200';
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  const modelDisplay = assessment?.model
    ? assessment.model
        .replace('gemini-3.8-flash', 'Gemini 3.8 Flash')
        .replace('gemini-1.5-flash-8b', 'Gemini 1.5 Flash 8B')
        .replace(/-/g, ' ')
    : 'Gemini 3.8 Flash';

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-indigo-100 shadow-xs">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 p-5 border-b border-indigo-100/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
              <span>Cognitive Lead Assessment</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                {modelDisplay}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Autonomous qualification analysis &amp; personalized response recommendation.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200/80 shadow-2xs text-xs font-semibold h-9 px-3.5 rounded-xl cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <BrainCircuit className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <span>{assessment ? 'Recalculate Score' : 'Run AI Analysis'}</span>
            </>
          )}
        </Button>
      </div>

      <div className="p-5 space-y-5 text-sm">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!assessment ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No Assessment Recorded</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Click &quot;Run AI Analysis&quot; to evaluate this lead&apos;s purchasing capacity, intent signal, and generate draft recommendations.
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Analyze Lead Now
            </Button>
          </div>
        ) : (
          <>
            {/* KPI Triad */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-4 rounded-xl border ${getScoreColor(assessment.score)} flex flex-col justify-between`}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Intent Score</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="text-3xl font-black font-mono tracking-tight tabular-nums mt-1">
                  {assessment.score ?? '—'}<span className="text-base font-normal text-slate-400">/100</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Detected Intent</span>
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-1 capitalize truncate">
                  {assessment.intent?.replace(/_/g, ' ') || 'High Buying Intent'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Stage Status</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                </div>
                <div className="text-sm font-extrabold text-indigo-700 mt-1 uppercase tracking-wide">
                  {assessment.qualificationStatus || 'QUALIFIED'}
                </div>
              </div>
            </div>

            {/* Score Reasoning */}
            {assessment.scoreReasoning && (
              <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/70">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Evaluation Logic &amp; Signals
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {assessment.scoreReasoning}
                </p>
              </div>
            )}

            {/* Suggested Response Draft */}
            {assessment.suggestedResponse && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-cyan-50/40 border border-indigo-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    AI Suggested Client Outreach
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(assessment.suggestedResponse!)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-indigo-200/80 text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-indigo-600" />
                          <span>Copy Draft</span>
                        </>
                      )}
                    </button>
                    {onApplySuggestedResponse && (
                      <button
                        type="button"
                        onClick={() => onApplySuggestedResponse(assessment.suggestedResponse!)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        Insert into SMS
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed italic bg-white/80 p-3 rounded-lg border border-indigo-100">
                  &ldquo;{assessment.suggestedResponse}&rdquo;
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
