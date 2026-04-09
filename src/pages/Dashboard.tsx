import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hr_NewJobForm as HrNewJobForm } from "@/components/ats/hr_NewJobForm";
import { hr_JobCard as HrJobCard, type HrJob } from "@/components/ats/hr_JobCard";
import {
  hr_PipelineView as HrPipelineView,
  type HrApplicationRow,
} from "@/components/ats/hr_PipelineView";
import { Copy, Link as LinkIcon } from "lucide-react";

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  skills: unknown;
  created_at: string;
};

type Company = {
  id: string;
  name: string;
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { session, isLoading } = useSession();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [guestLink, setGuestLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const tenantIdQuery = useQuery({
    queryKey: ["hr_tenant_id"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_hr_tenant");
      if (error) throw error;
      return data as string;
    },
  });

  const openJobsCountQuery = useQuery({
    queryKey: ["hr_kpi_open_jobs"],
    enabled: !!session,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("hr_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "OPEN");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const funnelQuery = useQuery({
    queryKey: ["hr_kpi_funnel"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_applications")
        .select("current_stage")
        .limit(5000);
      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        const stage = (row as any).current_stage ?? "Triagem";
        counts.set(stage, (counts.get(stage) ?? 0) + 1);
      }

      const list = Array.from(counts.entries()).map(([stage, count]) => ({
        stage,
        count,
      }));
      list.sort((a, b) => b.count - a.count);
      return list;
    },
  });

  const timeToHireQuery = useQuery({
    queryKey: ["hr_kpi_time_to_hire"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_applications")
        .select(
          "status, status_changed_at, job:hr_jobs!hr_applications_job_id_fkey(created_at)"
        )
        .eq("status", "HIRED")
        .limit(500);
      if (error) throw error;

      const diffs = (data ?? [])
        .map((row: any) => {
          const jobCreatedAt = row?.job?.created_at;
          const hiredAt = row?.status_changed_at;
          if (!jobCreatedAt || !hiredAt) return null;
          const start = new Date(jobCreatedAt).getTime();
          const end = new Date(hiredAt).getTime();
          const days = (end - start) / (1000 * 60 * 60 * 24);
          return days;
        })
        .filter(
          (x): x is number =>
            typeof x === "number" && Number.isFinite(x) && x >= 0
        );

      if (diffs.length === 0) return null;
      return (
        Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10
      );
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["hr_companies"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_companies")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data ?? []) as Company[];
    },
  });

  const jobsQuery = useQuery({
    queryKey: ["hr_jobs"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_jobs")
        .select(
          "id, title, description, salary_range, requirements, status, created_at, company:hr_companies!hr_jobs_company_id_fkey(name)"
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as unknown as HrJob[];
    },
  });

  const candidatesQuery = useQuery({
    queryKey: ["hr_candidates"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_candidates")
        .select("id, full_name, email, status, skills, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  });

  const selectedJob = useMemo(() => {
    const jobs = jobsQuery.data ?? [];
    return jobs.find((j) => j.id === selectedJobId) ?? null;
  }, [jobsQuery.data, selectedJobId]);

  const applicationsQuery = useQuery({
    queryKey: ["hr_applications", selectedJobId],
    enabled: !!session && !!selectedJobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_applications")
        .select(
          "id, current_stage, feedback_notes, status, updated_at, status_changed_at, candidate:hr_candidates!hr_applications_candidate_id_fkey(id, full_name, email, status, skills)"
        )
        .eq("job_id", selectedJobId as string);

      if (error) throw error;
      return (data ?? []) as unknown as HrApplicationRow[];
    },
  });

  const shortlistQuery = useQuery({
    queryKey: ["hr_shortlists", selectedJobId],
    enabled: !!session && !!selectedJobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_shortlists")
        .select("application_id")
        .eq("job_id", selectedJobId as string);
      if (error) throw error;
      return (data ?? []) as { application_id: string }[];
    },
  });

  const shortlistedIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of shortlistQuery.data ?? []) set.add(r.application_id);
    return set;
  }, [shortlistQuery.data]);

  async function toggleShortlist(applicationId: string) {
    if (!selectedJobId) return;

    if (shortlistedIds.has(applicationId)) {
      const { error } = await supabase
        .from("hr_shortlists")
        .delete()
        .eq("application_id", applicationId);
      if (!error) shortlistQuery.refetch();
      return;
    }

    const tenantId = tenantIdQuery.data;
    if (!tenantId) return;

    const { error } = await supabase.from("hr_shortlists").insert({
      tenant_id: tenantId,
      job_id: selectedJobId,
      application_id: applicationId,
    });

    if (!error) shortlistQuery.refetch();
  }

  async function generateGuestLink() {
    if (!selectedJob) return;
    setIsGeneratingLink(true);
    try {
      const { data, error } = await supabase.rpc("hr_get_or_create_guest_link", {
        p_job_id: selectedJob.id,
      });
      if (error) throw error;
      const token = data as string;
      const url = `${window.location.origin}/client/${token}`;
      setGuestLink(url);
      await navigator.clipboard.writeText(url);
    } finally {
      setIsGeneratingLink(false);
    }
  }

  const candidateRows = useMemo(
    () => candidatesQuery.data ?? [],
    [candidatesQuery.data]
  );

  if (!isLoading && !session) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="space-y-5"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="rounded-3xl p-5 hr-glass">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Vagas ativas
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">
              {openJobsCountQuery.isFetching ? (
                <Skeleton className="h-8 w-16 rounded-xl" />
              ) : (
                openJobsCountQuery.data ?? 0
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Total de vagas abertas no momento.
            </p>
          </Card>

          <Card className="rounded-3xl p-5 hr-glass">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Funil geral
            </div>
            <div className="mt-3 space-y-2">
              {funnelQuery.isFetching ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-xl" />
                  <Skeleton className="h-4 w-4/5 rounded-xl" />
                  <Skeleton className="h-4 w-3/5 rounded-xl" />
                </div>
              ) : (funnelQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Sem candidaturas ainda.
                </p>
              ) : (
                (funnelQuery.data ?? []).slice(0, 4).map((x) => (
                  <div
                    key={x.stage}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                      {x.stage}
                    </span>
                    <Badge className="rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                      {x.count}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="rounded-3xl p-5 hr-glass">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tempo médio de contratação
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">
              {timeToHireQuery.isFetching ? (
                <Skeleton className="h-8 w-20 rounded-xl" />
              ) : timeToHireQuery.data == null ? (
                "—"
              ) : (
                `${timeToHireQuery.data}d`
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Média de dias até a contratação.
            </p>
          </Card>
        </div>

        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList className="w-full justify-start rounded-2xl bg-[#F8FAFC]/80 p-1 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
            <TabsTrigger
              value="jobs"
              className="rounded-xl data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))]"
            >
              Vagas & Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="candidates"
              className="rounded-xl data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))]"
            >
              Candidatos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            <HrNewJobForm
              companies={companiesQuery.data ?? []}
              onCreated={() => jobsQuery.refetch()}
            />

            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
              <Card className="rounded-[28px] p-5 hr-glass">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Vagas</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Selecione uma vaga para ver o pipeline.
                    </p>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {jobsQuery.isFetching
                      ? "Carregando…"
                      : `${(jobsQuery.data ?? []).length} vaga(s)`}
                  </div>
                </div>

                {jobsQuery.error ? (
                  <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
                    {(jobsQuery.error as any)?.message ?? String(jobsQuery.error)}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {jobsQuery.isFetching ? (
                    <div className="space-y-3">
                      <Skeleton className="h-[110px] w-full rounded-3xl" />
                      <Skeleton className="h-[110px] w-full rounded-3xl" />
                      <Skeleton className="h-[110px] w-full rounded-3xl" />
                    </div>
                  ) : (jobsQuery.data ?? []).length === 0 ? (
                    <div className="rounded-3xl bg-white/60 p-6 text-center ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Crie sua primeira vaga para começar.
                      </p>
                    </div>
                  ) : (
                    (jobsQuery.data ?? []).map((job) => (
                      <HrJobCard
                        key={job.id}
                        job={job}
                        selected={job.id === selectedJobId}
                        onSelect={() => {
                          setSelectedJobId(job.id);
                          setGuestLink(null);
                        }}
                      />
                    ))
                  )}
                </div>
              </Card>

              {selectedJob ? (
                <div className="space-y-4">
                  <Card className="rounded-[28px] p-5 hr-glass">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Link para o cliente
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Compartilhe a shortlist e receba feedbacks em 1 clique.
                        </div>
                      </div>
                      <Button
                        className="h-11 rounded-xl hr-btn-primary"
                        onClick={generateGuestLink}
                        disabled={isGeneratingLink}
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        {isGeneratingLink ? "Gerando…" : "Gerar & copiar"}
                      </Button>
                    </div>

                    {guestLink ? (
                      <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white/60 p-3 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 break-all text-xs text-slate-700 dark:text-slate-200">
                          {guestLink}
                        </div>
                        <Button
                          variant="secondary"
                          className="h-9 rounded-xl hr-btn-secondary"
                          onClick={() => navigator.clipboard.writeText(guestLink)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar
                        </Button>
                      </div>
                    ) : null}
                  </Card>

                  <HrPipelineView
                    jobId={selectedJob.id}
                    jobTitle={selectedJob.title}
                    jobRequirements={selectedJob.requirements}
                    applications={applicationsQuery.data ?? []}
                    shortlistedIds={shortlistedIds}
                    onToggleShortlist={toggleShortlist}
                    isLoading={applicationsQuery.isFetching}
                    errorMessage={
                      applicationsQuery.error
                        ? (applicationsQuery.error as any)?.message ??
                          String(applicationsQuery.error)
                        : null
                    }
                  />
                </div>
              ) : (
                <Card className="rounded-[28px] p-6 text-center hr-glass">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Selecione uma vaga para visualizar as etapas.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="candidates">
            <Card className="rounded-[28px] p-5 hr-glass">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Candidatos</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Últimos 50 candidatos cadastrados.
                  </p>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {candidatesQuery.isFetching
                    ? "Carregando…"
                    : `${candidateRows.length} registro(s)`}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F8FAFC]/80 dark:bg-white/5">
                      <TableHead className="text-slate-600 dark:text-slate-300">
                        Nome
                      </TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-300">
                        E-mail
                      </TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-300">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-slate-600 dark:text-slate-300">
                        Criado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidatesQuery.isFetching ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}>
                            <Skeleton className="h-8 w-full rounded-xl" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : candidatesQuery.error ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8">
                          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
                            {(candidatesQuery.error as any)?.message ??
                              String(candidatesQuery.error)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : candidateRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Nenhum candidato ainda.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      candidateRows.map((c) => (
                        <TableRow
                          key={c.id}
                          className="transition hover:bg-[#F8FAFC]/80 dark:hover:bg-white/5"
                        >
                          <TableCell className="font-medium">
                            <Link
                              to={`/candidates/${c.id}`}
                              className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-white/20 dark:hover:decoration-white/40"
                            >
                              {c.full_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-200">
                            {c.email}
                          </TableCell>
                          <TableCell>
                            <Badge className="rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-violet-500/15">
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-600 dark:text-slate-300">
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </Layout>
  );
}