import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobsEmptyState } from "@/components/jobs/JobsEmptyState";
import {
  JobUpsertDialog,
  type AdminCompany,
  type AdminJob,
} from "@/components/jobs/JobUpsertDialog";
import {
  PauseCircle,
  PlayCircle,
  GitBranch,
  Search,
  BriefcaseBusiness,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function statusMeta(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "OPEN") {
    return {
      label: "Aberta",
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
    };
  }
  if (s === "PAUSED") {
    return {
      label: "Pausada",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    };
  }
  return {
    label: "Finalizada",
    className:
      "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  };
}

export default function JobsAdmin() {
  const { session, isLoading } = useSession();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | "ALL">("ALL");

  const companiesQuery = useQuery({
    queryKey: ["hr_companies"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_companies")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AdminCompany[];
    },
  });

  const jobsQuery = useQuery({
    queryKey: ["hr_jobs_admin"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_jobs")
        .select(
          "id, company_id, title, status, work_model, seniority_level, created_at, company:hr_companies!hr_jobs_company_id_fkey(name)"
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AdminJob[];
    },
  });

  const applicationsQuery = useQuery({
    queryKey: ["hr_applications_counts"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_applications")
        .select("job_id")
        .limit(5000);
      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        const id = (row as any).job_id as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return counts;
    },
  });

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = jobsQuery.data ?? [];

    return list.filter((j) => {
      if (status !== "ALL" && (j.status || "").toUpperCase() !== status) return false;
      if (!query) return true;
      const company = j.company?.name ?? "";
      return (
        j.title.toLowerCase().includes(query) || company.toLowerCase().includes(query)
      );
    });
  }, [jobsQuery.data, q, status]);

  async function togglePause(job: AdminJob) {
    const current = (job.status || "").toUpperCase();
    const next = current === "PAUSED" ? "OPEN" : "PAUSED";
    const { error } = await supabase.from("hr_jobs").update({ status: next }).eq("id", job.id);
    if (!error) jobsQuery.refetch();
  }

  if (!isLoading && !session) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Gerenciador de Vagas
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Vagas</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Controle o status, edite dados e navegue direto para o pipeline.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[340px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por título ou cliente…"
                className="h-11 rounded-2xl bg-white/70 pl-10 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
              />
            </div>

            <div className="flex items-center gap-2">
              {(["ALL", "OPEN", "PAUSED", "CLOSED"] as const).map((s) => {
                const active = status === s;
                const label =
                  s === "ALL" ? "Todas" : statusMeta(s === "CLOSED" ? "CLOSED" : s).label;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "rounded-full px-3 py-2 text-xs font-semibold ring-1 transition",
                      active
                        ? "bg-[hsl(var(--electric-indigo))] text-white ring-[hsl(var(--electric-indigo))]/40"
                        : "bg-white/60 text-slate-700 ring-slate-200 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <JobUpsertDialog
              companies={companiesQuery.data ?? []}
              triggerVariant="default"
              triggerLabel="Nova Vaga"
            />
          </div>
        </div>

        <Card className="rounded-[28px] p-0 hr-glass">
          <div className="flex items-center justify-between gap-3 p-5">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {jobsQuery.isFetching
                ? "Carregando…"
                : `${rows.length} vaga(s)`}
            </div>
            <Link
              to="/vagas"
              className="text-sm font-semibold text-[hsl(var(--electric-indigo))] underline decoration-[hsl(var(--electric-indigo))]/35 underline-offset-4 hover:decoration-[hsl(var(--electric-indigo))]/70"
            >
              Ver Job Board Público
            </Link>
          </div>

          {jobsQuery.error ? (
            <div className="px-5 pb-5">
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
                {(jobsQuery.error as any)?.message ?? String(jobsQuery.error)}
              </div>
            </div>
          ) : null}

          {jobsQuery.isFetching ? (
            <div className="px-5 pb-6">
              <div className="h-[340px] rounded-2xl border border-slate-200/70 bg-white/60 dark:border-white/10 dark:bg-white/5" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 pb-6">
              <JobsEmptyState />
            </div>
          ) : (
            <div className="overflow-hidden rounded-b-[28px] ring-1 ring-slate-200/70 dark:ring-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8FAFC]/80 dark:bg-white/5">
                    <TableHead className="text-slate-600 dark:text-slate-300">
                      Título da Vaga
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">
                      Cliente
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-300">
                      Candidatos
                    </TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-300">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((job) => {
                    const meta = statusMeta(job.status);
                    const count = applicationsQuery.data?.get(job.id) ?? 0;
                    const paused = (job.status || "").toUpperCase() === "PAUSED";
                    return (
                      <TableRow
                        key={job.id}
                        className="transition hover:bg-[#F8FAFC]/80 dark:hover:bg-white/5"
                      >
                        <TableCell className="font-medium">
                          {job.title}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {job.company?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", meta.className)}>
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center justify-center rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                            {count}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <JobUpsertDialog
                              companies={companiesQuery.data ?? []}
                              job={job}
                              onSaved={() => jobsQuery.refetch()}
                            />

                            <Button
                              variant="secondary"
                              className="h-10 rounded-xl hr-btn-secondary"
                              onClick={() => togglePause(job)}
                            >
                              {paused ? (
                                <PlayCircle className="mr-2 h-4 w-4" />
                              ) : (
                                <PauseCircle className="mr-2 h-4 w-4" />
                              )}
                              {paused ? "Retomar" : "Pausar"}
                            </Button>

                            <Button
                              className={cn(
                                "h-10 rounded-xl",
                                "bg-[hsl(var(--electric-indigo))] text-white",
                                "shadow-[0_12px_40px_-24px_rgba(111,0,255,0.75)]"
                              )}
                              asChild
                            >
                              <Link to={`/dashboard?jobId=${job.id}`}>
                                <GitBranch className="mr-2 h-4 w-4" />
                                Ver Pipeline
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </motion.div>
    </Layout>
  );
}
