export default function AdminLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
        <div className="space-y-2">
          <div className="h-4 w-32 skeleton-shimmer rounded-lg" />
          <div className="h-8 w-64 skeleton-shimmer rounded-xl" />
        </div>
        <div className="h-10 w-36 skeleton-shimmer rounded-xl" />
      </div>

      {/* 4 Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-24 skeleton-shimmer rounded" />
              <div className="w-8 h-8 rounded-lg skeleton-shimmer" />
            </div>
            <div className="h-9 w-20 skeleton-shimmer rounded-xl" />
            <div className="h-3 w-28 skeleton-shimmer rounded" />
          </div>
        ))}
      </div>

      {/* Grid Panels Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="h-5 w-48 skeleton-shimmer rounded-lg" />
          <div className="space-y-3">
            <div className="h-12 skeleton-shimmer rounded-xl" />
            <div className="h-12 skeleton-shimmer rounded-xl" />
            <div className="h-12 skeleton-shimmer rounded-xl" />
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="h-5 w-48 skeleton-shimmer rounded-lg" />
          <div className="h-20 skeleton-shimmer rounded-xl" />
          <div className="h-10 skeleton-shimmer rounded-xl" />
        </div>
      </div>
    </div>
  );
}
