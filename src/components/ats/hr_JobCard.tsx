import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BriefcaseBusiness, Building2 } from "lucide-react";

export type HrJob = {
  id: string;
  title: string;
  description: string | null;
  salary_range: string | null;
  requirements: unknown;
  status: string;
  created_at: string;
  company?: { name: string } | null;
};

export function hr_JobCard({
  job,
  selected,
  onSelect,
}: {
  job: HrJob;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full text-left",
        "rounded-[28px] p-5 hr-glass hr-card-hover",
        "transition",
        selected &&
          "ring-2 ring-[hsl(var(--primary))]/35 shadow-xl shadow-violet-500/10 dark:ring-[hsl(var(--primary))]/25"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
              <BriefcaseBusiness className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {job.title}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {job.company?.name ?? "Empresa"}
                </span>
              </div>
            </div>
          </div>

          {job.salary_range ? (
            <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
              {job.salary_range}
            </div>
          ) : null}
        </div>

        <Badge
          className={cn(
            "rounded-full",
            job.status === "OPEN"
              ? "bg-[#10B981] text-white shadow-lg shadow-emerald-500/20"
              : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200"
          )}
        >
          {job.status}
        </Badge>
      </div>

      {job.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
          {job.description}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(job.created_at).toLocaleDateString()}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
          requirements: {Array.isArray(job.requirements) ? job.requirements.length : 0}
        </span>
      </div>
    </button>
  );
}