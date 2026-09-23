import Link from 'next/link';
import { Building2, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8F9FF] text-slate-900 flex items-center justify-center p-6">
      <div className="glass-panel max-w-md w-full p-8 rounded-2xl border border-slate-200/80 shadow-md text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mx-auto">
          <Building2 className="w-7 h-7 text-slate-400" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono">
            404 Not Found
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Resource Does Not Exist
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            The requested workspace, lead dossier, or page could not be located or you do not have permission to view it.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/org/select"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Select Workspace</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
