import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

export type HrJob = {
  id: string;
  title: string;
  description: string | null;
  salary_range: string | null;
  requirements?: unknown;
  status: "OPEN" | "CLOSED" | string;
  created_at: string;
  company?: { name: string } | null;
};

type Props = {
  job: HrJob;
  selected?: boolean;
  onSelect?: () => void;
};

export function hr_JobCard({ job, selected, onSelect }: Props) {
  const isOpen = job.status === "OPEN";

  return (
    <Card
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={cn(
        "group rounded-3xl border-black/5 bg-white/80 p-5 shadow-sm shadow-slate-900/5 backdrop-blur transition",
        "hover:-translate-y-0.5 hover:bg-white hover:shadow-md",
        selected && "ring-2 ring-indigo-500/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-slate-900">
              {job.title}
            </h3>
            <Badge
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px]",
                isOpen
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-700"
              )}
            >
              {isOpen ? "OPEN" : "CLOSED"}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-black/5">
              <Building2 className="h-3.5 w-3.5 text-indigo-600" />
              {job.company?.name ?? "Empresa"}
            </span>
            {job.salary_range ? (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 ring-1 ring-indigo-200">
                {job.salary_range}
              </span>
            ) : null}
            <span className="ml-auto text-slate-500">
              {new Date(job.created_at).toLocaleDateString()}
            </span>
          </div>

          {job.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
              {job.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Sem descrição.</p>
          )}
        </div>
      </div>

      <div className="mt-4 h-px w-full bg-slate-200/80" />
      <p className="mt-3 text-xs font-medium text-slate-600">
        Clique para ver o pipeline
      </p>
    </Card>
  );
}