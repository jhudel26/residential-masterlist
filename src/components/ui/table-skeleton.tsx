import React from "react";

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="w-full rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] overflow-hidden shadow-subtle animate-pulse">
      {/* Table Header skeleton */}
      <div className="p-5 border-b border-slate-100 dark:border-[#1e2f4d] flex items-center justify-between gap-4">
        <div className="w-48 h-5 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="w-32 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-slate-100 dark:divide-[#1e2f4d]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-1/3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="space-y-1.5 w-full">
                <div className="w-3/4 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-1/2 h-3 rounded bg-slate-100 dark:bg-slate-800/60" />
              </div>
            </div>

            <div className="hidden sm:block w-1/4 space-y-1.5">
              <div className="w-2/3 h-4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-1/3 h-3 rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>

            <div className="w-20 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}