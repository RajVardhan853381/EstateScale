'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-slate-900 flex items-center justify-center p-6">
      <div className="glass-panel max-w-lg w-full p-8 rounded-2xl border border-slate-200/80 shadow-lg text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-rose-600 font-mono">
            System Interruption
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Unexpected Workspace Exception
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            EstateScale encountered an unexpected condition while processing your request. Tenant data remains securely isolated.
          </p>
        </div>

        {error.digest && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[10px] font-mono text-slate-400">
            Error Digest: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-xs gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>

          <Link
            href="/org/select"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Workspace Switcher</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
