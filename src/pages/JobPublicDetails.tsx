import { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { JobsEmptyState } from "@/components/jobs/JobsEmptyState";

type PublicJobDetails = {
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

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function JobPublicDetails() {
  const { jobId } = useParams();
  const location = useLocation();

  const from = (location.state as any)?.from as string | undefined;
  const backTo = from && from.startsWith("/vagas") ? from : "/vagas";

  const jobQuery = useQuery({
    queryKey: ["public_job_details", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hr_get_public_job_details", {
        p_job_id: jobId as string,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as any;
      if (!row?.id) return null;
      return row as PublicJobDetails;
    },
  });

  const skills = useMemo(
    () => skillsToArray(jobQuery.data?.requirements),
    [jobQuery.data?.requirements]
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <motion.header
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="flex items-center justify-between gap-3"
        >
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-2xl px-3 py-2 hr-glass transition hover:bg-white/80 dark:hover:bg-white/10"
          >
            <HrLogo size="sm" />
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" className="h-10 rounded-xl hr-btn-secondary" asChild>
              <Link to={backTo}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        </motion.header>

        <div className="mt-8">
          {jobQuery.isFetching ? (
            <div className="h-[320px] rounded-[28px] border border-slate-200/70 bg-white/60 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-white/10 dark:bg-white/5" />
          ) : jobQuery.error ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              {(jobQuery.error as any)?.message ?? String(jobQuery.error)}
            </div>
          ) : !jobQuery.data ? (
            <JobsEmptyState
              title="Vaga não encontrada"
              subtitle="Essa vaga pode ter sido encerrada ou removida do catálogo."
            />
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ delay: 0.05, type: "spring", stiffness: 240, damping: 22 }}
              className="space-y-4"
            >
              <Card className="rounded-[28px] p-6 hr-glass">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-balance text-3xl font-semibold tracking-tight">
                      {jobQuery.data.title}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-2 rounded-2xl bg-white/60 px-3 py-1 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{jobQuery.data.company_name}</span>
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Publicada em {new Date(jobQuery.data.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(() => {
                        const w = chipForWorkModel(jobQuery.data.work_model);
                        const l = chipForLevel(jobQuery.data.seniority_level);
                        return (
                          <>
                            <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", w.className)}>
                              {w.label}
                            </Badge>
                            <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", l.className)}>
                              {l.label}
                            </Badge>
                          </>
                        );
                      })()}
                      {jobQuery.data.salary_range ? (
                        <Badge className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                          {jobQuery.data.salary_range}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    className={cn(
                      "h-11 rounded-xl px-5",
                      "bg-[hsl(var(--electric-indigo))] text-white",
                      "shadow-[0_14px_46px_-26px_rgba(111,0,255,0.85)]",
                      "transition-transform duration-200 hover:scale-[1.03] active:scale-[0.99]"
                    )}
                    asChild
                  >
                    <Link to={`/apply/${jobQuery.data.id}`}>
                      Candidatar-se <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                {jobQuery.data.description ? (
                  <div className="mt-6">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Sobre a vaga
                    </div>
                    <div className="prose prose-slate mt-2 max-w-none text-sm dark:prose-invert">
                      <p className="whitespace-pre-wrap">{jobQuery.data.description}</p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Skills / Requisitos
                  </div>
                  {skills.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-white/60 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Requisitos em breve.
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
