import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, ArrowRight } from "lucide-react";

export type PublicJobRow = {
  id: string;
  title: string;
  description: string | null;
  salary_range: string | null;
  created_at: string;
  company_name: string;
  work_model: string;
  seniority_level: string;
  requirements: unknown;
};

function skillsToArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    return raw
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function chipForWorkModel(model: string) {
  const m = (model || "").toUpperCase();
  if (m === "HYBRID" || m === "HÍBRIDO" || m === "HIBRIDO") {
    return {
      label: "Híbrido",
      className:
        "bg-[hsl(var(--mint))]/10 text-[hsl(var(--mint))] ring-1 ring-[hsl(var(--mint))]/20 dark:bg-[hsl(var(--mint))]/15",
    };
  }
  if (m === "ONSITE" || m === "PRESENCIAL") {
    return {
      label: "Presencial",
      className:
        "bg-[hsl(var(--neon-orange))]/10 text-[hsl(var(--neon-orange))] ring-1 ring-[hsl(var(--neon-orange))]/20 dark:bg-[hsl(var(--neon-orange))]/15",
    };
  }
  return {
    label: "Remoto",
    className:
      "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/20 dark:bg-[hsl(var(--primary))]/15 dark:text-white",
  };
}

function chipForLevel(level: string) {
  const l = (level || "").toUpperCase();
  if (l === "JR" || l === "JUNIOR" || l === "JÚNIOR") {
    return {
      label: "Jr",
      className:
        "bg-[#10B981]/10 text-[#10B981] ring-1 ring-[#10B981]/20 dark:bg-[#10B981]/15",
    };
  }
  if (l === "SR" || l === "SENIOR" || l === "SÊNIOR") {
    return {
      label: "Sr",
      className:
        "bg-[#FB923C]/10 text-[#FB923C] ring-1 ring-[#FB923C]/20 dark:bg-[#FB923C]/15",
    };
  }
  return {
    label: "Pl",
    className:
      "bg-[hsl(var(--electric-indigo))]/10 text-[hsl(var(--electric-indigo))] ring-1 ring-[hsl(var(--electric-indigo))]/25 dark:bg-[hsl(var(--electric-indigo))]/15",
  };
}

export function PublicJobCard({ job }: { job: PublicJobRow }) {
  const navigate = useNavigate();
  const location = useLocation();

  const work = chipForWorkModel(job.work_model);
  const lvl = chipForLevel(job.seniority_level);
  const skills = skillsToArray(job.requirements);
  const initial = (job.company_name || "").trim().slice(0, 1).toUpperCase() || "C";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[26px] p-5",
        "hr-glass",
        "transition-all duration-200",
        "hover:-translate-y-1",
        "hover:shadow-[0_18px_50px_-24px_rgba(111,0,255,0.50)]",
        "hover:ring-1 hover:ring-[hsl(var(--electric-indigo))]/55"
      )}
    >
      <button
        type="button"
        onClick={() =>
          navigate(`/vagas/${job.id}`, {
            state: { from: location.pathname + location.search },
          })
        }
        className="absolute inset-0"
        aria-label={`Ver detalhes da vaga: ${job.title}`}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              {job.title}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white/70 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                {initial}
              </span>
              <span className="truncate">{job.company_name}</span>
            </div>
          </div>

          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-slate-700 ring-1 ring-slate-200 backdrop-blur-md transition group-hover:ring-[hsl(var(--electric-indigo))]/45 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
            <Building2 className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", work.className)}>
            {work.label}
          </Badge>
          <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", lvl.className)}>
            {lvl.label}
          </Badge>

          {job.salary_range ? (
            <Badge className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
              {job.salary_range}
            </Badge>
          ) : null}
        </div>

        {job.description ? (
          <p className="mt-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {job.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {skills.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded-full bg-white/60 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
            >
              {s}
            </span>
          ))}
          {skills.length > 4 ? (
            <span className="rounded-full bg-white/40 px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
              +{skills.length - 4}
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Link
            to={`/vagas/${job.id}`}
            state={{ from: location.pathname + location.search }}
            className="relative z-20 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--electric-indigo))] underline decoration-[hsl(var(--electric-indigo))]/35 underline-offset-4 hover:decoration-[hsl(var(--electric-indigo))]/70"
            onClick={(e) => e.stopPropagation()}
          >
            Detalhes <ArrowRight className="h-4 w-4" />
          </Link>

          <Button
            className={cn(
              "relative z-20 h-10 rounded-xl px-4",
              "bg-[hsl(var(--electric-indigo))] text-white",
              "shadow-[0_10px_30px_-18px_rgba(111,0,255,0.7)]",
              "transition-transform duration-200 hover:scale-[1.03] active:scale-[0.99]"
            )}
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <Link to={`/apply/${job.id}`}>Candidatar-se</Link>
          </Button>
        </div>
      </div>

    </div>
  );
}
