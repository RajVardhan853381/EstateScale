import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  CheckCircle2,
  Building2,
  TrendingUp,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8F9FF] text-slate-900 selection:bg-indigo-500/20 selection:text-indigo-900 flex flex-col">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Estate<span className="text-indigo-600">Scale</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                Enterprise
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Platform Features
            </a>
            <a href="#preview" className="hover:text-indigo-600 transition-colors">
              CRM Intelligence
            </a>
            <a href="#architecture" className="hover:text-indigo-600 transition-colors">
              Security Architecture
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/70 rounded-lg transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/30 hover:shadow-md hover:shadow-indigo-600/40 transition-all active:scale-[0.98]"
            >
              Launch Platform <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Subtle Background Radial Mesh */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-500/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm shadow-slate-100 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wide uppercase text-slate-700">
              EstateScale Intelligence &bull; Real-Time Deal Velocity
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Institutional Real Estate CRM &{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              Autonomous AI Client Journeys
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            Engineered specifically for high-velocity real estate brokerages, development firms, and luxury asset advisors. Predict buyer qualification in real time, orchestrate TCPA-compliant messaging, and close high-value deals faster.
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/35 hover:-translate-y-0.5 transition-all"
            >
              Get Started with EstateScale <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm hover:border-slate-300 hover:-translate-y-0.5 transition-all"
            >
              Explore Live Demo
            </Link>
          </div>

          {/* Social Proof Stats Banner */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
            <div className="glass-card p-5 rounded-xl border border-slate-200/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                $4.2B+
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Asset Volume Managed
              </div>
            </div>
            <div className="glass-card p-5 rounded-xl border border-slate-200/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 tabular-nums">
                &lt; 90s
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                AI Auto-Qualification
              </div>
            </div>
            <div className="glass-card p-5 rounded-xl border border-slate-200/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-600 tabular-nums">
                99.4%
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                SMS Delivery Rate
              </div>
            </div>
            <div className="glass-card p-5 rounded-xl border border-slate-200/80">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tabular-nums">
                100%
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Multi-Tenant Isolation
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Product Preview Mockup */}
        <div id="preview" className="max-w-6xl mx-auto mt-16 px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-indigo-900/10 p-2 sm:p-4 overflow-hidden backdrop-blur-md">
            {/* Window Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400 font-mono ml-2">
                  estatescale.app/org/demo/dashboard
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                MLS Live Pipeline Active
              </div>
            </div>

            {/* Simulated Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 uppercase">Active Pipeline</span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
                  $18,450,000
                </div>
                <span className="text-xs text-emerald-600 font-medium">↑ +14.2% this month</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 uppercase">AI Scored Leads</span>
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
                  142 Active
                </div>
                <span className="text-xs text-cyan-700 font-medium">88 avg confidence score</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 uppercase">Avg Response Time</span>
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
                  1m 42s
                </div>
                <span className="text-xs text-emerald-600 font-medium">99.8% SLA adherence</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 uppercase">Closed / Won</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
                  $6,120,000
                </div>
                <span className="text-xs text-slate-500 font-medium">7 deals finalized</span>
              </div>
            </div>

            {/* Pipeline Stage Preview Row */}
            <div className="mt-4 p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="stage-pill-new px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> NEW (18)
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <span className="stage-pill-contacted px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  CONTACTED (34)
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <span className="stage-pill-qualified px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  QUALIFIED (42)
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
                <span className="stage-pill-won px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  CLOSED-WON (12)
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Deterministic State Machine</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">
              Institutional Platform Features
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Built for high-stakes residential & commercial transactions
            </h3>
            <p className="mt-4 text-base text-slate-600">
              EstateScale eliminates administrative friction, synchronizes team communications, and deploys intelligent autonomous agent followups directly to your leads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-card p-8 rounded-2xl border border-slate-200/80 glass-card-hover">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">
                Predictive AI Lead Qualification
              </h4>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Extract intent, budget constraints, timeline, and property types automatically from unstructured client notes and communication threads. Get actionable score gauges and tailored response drafts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-8 rounded-2xl border border-slate-200/80 glass-card-hover">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">
                TCPA-Compliant Client Journeys
              </h4>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Automate multi-stage SMS communications with carrier opt-out protection and instant status tracking. Send instant responses or schedule progressive drip touchpoints.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8 rounded-2xl border border-slate-200/80 glass-card-hover">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">
                Multi-Tenant Cryptographic Isolation
              </h4>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Absolute tenant boundaries guaranteed at the database schema and session verification layer. Each brokerage client operates in a secure, isolated workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 bg-[#F8F9FF]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white text-center shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Ready to accelerate your brokerage?
              </h3>
              <p className="mt-4 text-slate-300 text-base">
                Sign in to access your organization dashboard or activate a new tenant portal in seconds.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white shadow-lg transition-all"
                >
                  Enter Platform
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 font-semibold rounded-xl text-white backdrop-blur-sm transition-all"
                >
                  Sign In to Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-900">EstateScale</span> &bull; Institutional Real Estate Technology
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> All Systems Operational
            </span>
            <span>&copy; 2026 EstateScale, Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
