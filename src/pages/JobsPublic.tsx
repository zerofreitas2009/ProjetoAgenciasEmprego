import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { SkillCombobox } from "@/components/jobs/SkillCombobox";
import {
  PublicJobCard,
  type PublicJobRow,
} from "@/components/jobs/PublicJobCard";
import { JobsEmptyState } from "@/components/jobs/JobsEmptyState";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
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

export default function JobsPublic() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const skill = params.get("skill");

  const jobsQuery = useQuery({
    queryKey: ["public_jobs", q, skill],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hr_list_public_jobs", {
        p_search: q.trim() ? q.trim() : null,
        p_skill: skill ? skill : null,
      });
      if (error) throw error;
      return (data ?? []) as unknown as PublicJobRow[];
    },
  });

  const allSkills = useMemo(() => {
    const list: string[] = [];
    for (const j of jobsQuery.data ?? []) {
      list.push(...skillsToArray(j.requirements));
    }
    return list;
  }, [jobsQuery.data]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <motion.header
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 rounded-2xl px-3 py-2 hr-glass transition hover:bg-white/80 dark:hover:bg-white/10"
            >
              <HrLogo size="sm" />
            </Link>

            <div className="flex items-center gap-2 sm:hidden">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Link
              to="/login"
              className="rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 backdrop-blur-md transition hover:bg-white dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/10"
            >
              Sou recrutador
            </Link>
          </div>
        </motion.header>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.06, type: "spring", stiffness: 240, damping: 22 }}
          className="mt-10"
        >
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Catálogo de Vagas
              </h1>
              <p className="mt-2 text-pretty text-sm text-slate-600 dark:text-slate-300">
                Um job board público com visual premium — encontre a vaga certa e
                candidate-se em poucos cliques.
              </p>
            </div>

            <Card className="w-full rounded-[28px] p-3 hr-glass md:w-[520px] md:sticky md:top-6 md:z-20">
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                  <Input
                    value={q}
                    onChange={(e) => {
                      const next = e.target.value;
                      setParams((prev) => {
                        const p = new URLSearchParams(prev);
                        if (next.trim()) p.set("q", next);
                        else p.delete("q");
                        return p;
                      });
                    }}
                    placeholder="Buscar por título, cliente…"
                    className="h-11 rounded-2xl bg-white/70 pl-10 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                  />
                </div>

                <SkillCombobox
                  skills={allSkills}
                  value={skill}
                  onChange={(v) => {
                    setParams((prev) => {
                      const p = new URLSearchParams(prev);
                      if (v) p.set("skill", v);
                      else p.delete("skill");
                      return p;
                    });
                  }}
                />
              </div>
            </Card>
          </div>
        </motion.div>

        <div className="mt-8">
          {jobsQuery.isFetching ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[260px] rounded-[26px] border border-slate-200/70 bg-white/60 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
                />
              ))}
            </div>
          ) : jobsQuery.error ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              {(jobsQuery.error as any)?.message ?? String(jobsQuery.error)}
            </div>
          ) : (jobsQuery.data ?? []).length === 0 ? (
            <JobsEmptyState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(jobsQuery.data ?? []).map((job) => (
                <PublicJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
