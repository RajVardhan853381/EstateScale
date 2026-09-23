'use client';

import { useState } from 'react';
import {
  Zap,
  Sparkles,
  Hourglass,
  MessageSquare,
  CheckCircle2,
  Mail,
  Play,
  RotateCcw,
  Check,
  ShieldCheck,
  Layers,
} from 'lucide-react';

export function VisualJourneyCanvas() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simLog, setSimLog] = useState<string | null>(null);

  const runSimulation = () => {
    if (simulating) return;
    setSimulating(true);
    setActiveStep(1);
    setSimLog('Triggering evaluation for Marcus Vance (Budget: $3.4M, Score: 92)...');

    setTimeout(() => {
      setActiveStep(2);
      setSimLog('AI Intelligence matched 3 off-market Beverly Hills listings with 99% affinity.');
    }, 1200);

    setTimeout(() => {
      setActiveStep(3);
      setSimLog('Smart delay validated local time window (11:42 AM PST). Scheduled immediately.');
    }, 2400);

    setTimeout(() => {
      setActiveStep(4);
      setSimLog('Personalized SMS dispatched via Twilio 10DLC carrier route.');
    }, 3600);

    setTimeout(() => {
      setActiveStep(5);
      setSimLog('Inbound response detected: "Interested in touring this Saturday". Routed to Advisor!');
      setSimulating(false);
    }, 4800);
  };

  const resetSimulation = () => {
    setActiveStep(null);
    setSimulating(false);
    setSimLog(null);
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
      {/* Canvas Header */}
      <div className="p-5 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-sm shadow-indigo-500/20 flex-shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                VIP Luxury Buyer Nurture
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACTIVE FLOW
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Autonomous multi-stage deal acceleration &bull; 89 luxury buyers enrolled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeStep !== null && (
            <button
              onClick={resetSimulation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={runSimulation}
            disabled={simulating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {simulating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate Journey Run</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Simulation Live Telemetry Banner */}
      {simLog && (
        <div className="px-5 py-2.5 bg-indigo-900 text-indigo-100 text-xs flex items-center justify-between border-b border-indigo-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-[11px] text-cyan-300">TELEMETRY:</span>
            <span>{simLog}</span>
          </div>
          <span className="text-[10px] font-mono text-indigo-300 hidden sm:inline">
            Stage {activeStep} of 5 Complete
          </span>
        </div>
      )}

      {/* Visual Interactive Graph */}
      <div className="p-6 md:p-10 bg-slate-50/40 flex flex-col items-center">
        <div className="w-full max-w-xl flex flex-col items-center space-y-3">
          {/* Node 1: Trigger */}
          <div
            className={`w-full p-4 rounded-2xl border transition-all duration-300 ${
              activeStep === 1
                ? 'bg-white border-emerald-500 shadow-md shadow-emerald-500/10 scale-[1.02]'
                : activeStep && activeStep > 1
                  ? 'bg-white border-emerald-200/80 shadow-2xs'
                  : 'bg-white border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Step 1 &bull; Entry Trigger
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Lead Score &gt; 80 &amp; Budget &gt; $2,000,000
                  </div>
                </div>
              </div>
              {activeStep && activeStep > 1 ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="text-xs font-mono font-bold text-slate-400">100% Filter</span>
              )}
            </div>
          </div>

          {/* Animated Connector */}
          <div className="h-6 w-0.5 bg-slate-300 relative flex items-center justify-center">
            <div
              className={`w-2 h-2 rounded-full ${
                activeStep && activeStep >= 2 ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-slate-400'
              } transition-colors`}
            />
          </div>

          {/* Node 2: AI Intelligence Match */}
          <div
            className={`w-full p-4 rounded-2xl border transition-all duration-300 ${
              activeStep === 2
                ? 'bg-white border-indigo-500 shadow-md shadow-indigo-500/10 scale-[1.02]'
                : activeStep && activeStep > 2
                  ? 'bg-white border-indigo-200/80 shadow-2xs'
                  : 'bg-white border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    Step 2 &bull; Autonomous Match
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    AI Analysis of Buyer Inquiries &amp; Off-Market Assets
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold font-mono">
                99% Match
              </span>
            </div>
          </div>

          {/* Animated Connector */}
          <div className="h-6 w-0.5 bg-slate-300 relative flex items-center justify-center">
            <div
              className={`w-2 h-2 rounded-full ${
                activeStep && activeStep >= 3 ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-slate-400'
              } transition-colors`}
            />
          </div>

          {/* Node 3: Smart Delay */}
          <div
            className={`w-full p-4 rounded-2xl border transition-all duration-300 ${
              activeStep === 3
                ? 'bg-white border-amber-500 shadow-md shadow-amber-500/10 scale-[1.02]'
                : activeStep && activeStep > 3
                  ? 'bg-white border-amber-200/80 shadow-2xs'
                  : 'bg-white border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <Hourglass className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Step 3 &bull; TCPA Guardrail
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Wait 2 Hours &bull; Active Hours Gate (9 AM – 6 PM)
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">Time-Zone Sync</span>
            </div>
          </div>

          {/* Animated Connector */}
          <div className="h-6 w-0.5 bg-slate-300 relative flex items-center justify-center">
            <div
              className={`w-2 h-2 rounded-full ${
                activeStep && activeStep >= 4 ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-slate-400'
              } transition-colors`}
            />
          </div>

          {/* Node 4: SMS Communication */}
          <div
            className={`w-full p-4 rounded-2xl border transition-all duration-300 ${
              activeStep === 4
                ? 'bg-white border-cyan-500 shadow-md shadow-cyan-500/10 scale-[1.02]'
                : activeStep && activeStep > 4
                  ? 'bg-white border-cyan-200/80 shadow-2xs'
                  : 'bg-white border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">
                    Step 4 &bull; Direct Touchpoint
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Dispatch Personalized SMS from Advisor
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-bold">
                10DLC Verified
              </span>
            </div>
          </div>

          {/* Split T-Connector */}
          <div className="w-full flex flex-col items-center pt-2">
            <svg
              className="w-64 h-8 text-slate-300 stroke-current"
              fill="none"
              strokeWidth="2"
              viewBox="0 0 256 32"
            >
              <path d="M128 0 V14 M128 14 H36 V32 M128 14 H220 V32" />
            </svg>

            {/* Decision Outcomes */}
            <div className="grid grid-cols-2 gap-4 w-full mt-2">
              {/* Branch A: Replied */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  activeStep === 5
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-md scale-[1.02]'
                    : 'bg-white border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    If Client Replied
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Alert Advisor</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      Advance to Qualified
                    </div>
                  </div>
                </div>
              </div>

              {/* Branch B: No Reply */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    No Reply in 48h
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Email Video Tour</div>
                    <div className="text-[10px] text-slate-400">Off-market property link</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Health Strip */}
      <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Deterministic Journey Execution &bull; 0 failed state transitions</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>BullMQ Worker: Active</span>
          <span>&bull;</span>
          <span className="text-indigo-600 font-bold">Latency &lt; 85ms</span>
        </div>
      </div>
    </div>
  );
}
