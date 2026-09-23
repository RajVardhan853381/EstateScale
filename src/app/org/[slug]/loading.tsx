export default function OrganizationLoading() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3.5 w-28 rounded-md skeleton-shimmer"></div>
          <div className="h-8 w-60 rounded-xl skeleton-shimmer"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 rounded-xl skeleton-shimmer"></div>
          <div className="h-10 w-36 rounded-xl skeleton-shimmer"></div>
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 rounded skeleton-shimmer"></div>
              <div className="w-9 h-9 rounded-xl skeleton-shimmer"></div>
            </div>
            <div className="h-8 w-32 rounded-lg skeleton-shimmer"></div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 rounded skeleton-shimmer"></div>
              <div className="h-3 w-20 rounded skeleton-shimmer"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel / Analytics Skeleton Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="h-5 w-48 rounded-lg skeleton-shimmer"></div>
            <div className="h-7 w-24 rounded-lg skeleton-shimmer"></div>
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((bar) => (
              <div key={bar} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <div className="h-3 w-24 rounded skeleton-shimmer"></div>
                  <div className="h-3 w-16 rounded skeleton-shimmer"></div>
                </div>
                <div className="h-3.5 w-full rounded-full skeleton-shimmer"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="h-5 w-32 rounded-lg skeleton-shimmer"></div>
            <div className="w-5 h-5 rounded-md skeleton-shimmer"></div>
          </div>
          <div className="space-y-3.5 pt-1">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/60">
                <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0"></div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3.5 w-28 rounded skeleton-shimmer"></div>
                  <div className="h-2.5 w-20 rounded skeleton-shimmer"></div>
                </div>
                <div className="h-5 w-14 rounded-full skeleton-shimmer shrink-0"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table / Record List Skeleton */}
      <div className="p-6 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div className="h-5 w-44 rounded-lg skeleton-shimmer"></div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="h-9 w-48 rounded-xl skeleton-shimmer"></div>
            <div className="h-9 w-24 rounded-xl skeleton-shimmer"></div>
          </div>
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-100/60"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0"></div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 rounded skeleton-shimmer"></div>
                  <div className="h-2.5 w-24 rounded skeleton-shimmer"></div>
                </div>
              </div>
              <div className="hidden sm:block h-6 w-24 rounded-full skeleton-shimmer"></div>
              <div className="hidden md:block h-4 w-28 rounded skeleton-shimmer"></div>
              <div className="h-8 w-20 rounded-lg skeleton-shimmer"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
