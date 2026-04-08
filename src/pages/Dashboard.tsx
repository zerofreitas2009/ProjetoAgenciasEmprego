import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  LogOut,
  BriefcaseBusiness,
  Link as LinkIcon,
  Copy,
} from "lucide-react";
import { hr_NewJobForm as HrNewJobForm } from "@/components/ats/hr_NewJobForm";
import { hr_JobCard as HrJobCard, type HrJob } from "@/components/ats/hr_JobCard";
import {
  hr_PipelineView as HrPipelineView,
  type HrApplicationRow,
} from "@/components/ats/hr_PipelineView";

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

export default function Dashboard() {
  const { session, isLoading } = useSession();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [guestLink, setGuestLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const email = session?.user.email ?? "";

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
        .filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0);

      if (diffs.length === 0) return null;
      return Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10;
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
          "id, current_stage, feedback_notes, status, candidate:hr_candidates!hr_applications_candidate_id_fkey(id, full_name, email, status, skills)"
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
    <div className="min-h-screen bg-[hsl(var(--app-bg))] px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-700 shadow-sm ring-1 ring-black/5">
              <Users className="h-4 w-4 text-indigo-600" />
              Recrutamento
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Logado como <span className="font-medium">{email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-2xl bg-white/70 ring-1 ring-black/5 hover:bg-white"
              asChild
            >
              <Link to="/">Início</Link>
            </Button>
            <Button
              className="rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
            <div className="text-xs font-semibold text-slate-700">Vagas ativas</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {openJobsCountQuery.data ?? 0}
            </div>
            <p className="mt-1 text-sm text-slate-600">hr_jobs com status OPEN</p>
          </Card>

          <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
            <div className="text-xs font-semibold text-slate-700">Funil geral</div>
            <div className="mt-3 space-y-2">
              {(funnelQuery.data ?? []).slice(0, 4).map((x) => (
                <div key={x.stage} className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-slate-700">{x.stage}</span>
                  <Badge className="rounded-full bg-white text-slate-700 ring-1 ring-black/5">
                    {x.count}
                  </Badge>
                </div>
              ))}
              {(funnelQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-slate-600">Sem aplicações ainda.</p>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
            <div className="text-xs font-semibold text-slate-700">Time-to-hire</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {timeToHireQuery.data == null ? "—" : `${timeToHireQuery.data}d`}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Média (opcional) até status HIRED
            </p>
          </Card>
        </div>

        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList className="w-full justify-start rounded-2xl bg-white/70 p-1 ring-1 ring-black/5">
            <TabsTrigger
              value="jobs"
              className="rounded-2xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <BriefcaseBusiness className="mr-2 h-4 w-4" />
              Vagas & Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="candidates"
              className="rounded-2xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Users className="mr-2 h-4 w-4" />
              Candidatos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            <HrNewJobForm
              companies={companiesQuery.data ?? []}
              onCreated={() => jobsQuery.refetch()}
            />

            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
              <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Vagas (hr_jobs)
                    </h2>
                    <p className="text-sm text-slate-600">
                      Selecione uma vaga para ver o pipeline.
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    {jobsQuery.isFetching
                      ? "Carregando…"
                      : `${(jobsQuery.data ?? []).length} vaga(s)`}
                  </div>
                </div>

                {jobsQuery.error ? (
                  <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                    {(jobsQuery.error as any)?.message ?? String(jobsQuery.error)}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {(jobsQuery.data ?? []).length === 0 && !jobsQuery.isFetching ? (
                    <div className="rounded-3xl bg-slate-50/70 p-6 text-center ring-1 ring-black/5">
                      <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-2xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                        Sem vagas
                      </div>
                      <p className="text-sm text-slate-600">
                        Crie sua primeira vaga para começar a receber aplicações.
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
                  <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">
                          Link compartilhável (cliente)
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Mostra apenas a shortlist e permite feedback.
                        </div>
                      </div>
                      <Button
                        className="h-11 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
                        onClick={generateGuestLink}
                        disabled={isGeneratingLink}
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        {isGeneratingLink ? "Gerando…" : "Gerar & copiar"}
                      </Button>
                    </div>

                    {guestLink ? (
                      <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-slate-50/70 p-3 ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 break-all text-xs text-slate-700">
                          {guestLink}
                        </div>
                        <Button
                          variant="secondary"
                          className="h-9 rounded-2xl bg-white/70 ring-1 ring-black/5 hover:bg-white"
                          onClick={() => navigator.clipboard.writeText(guestLink)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar
                        </Button>
                      </div>
                    ) : null}
                  </Card>

                  <HrPipelineView
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
                <Card className="rounded-3xl border-black/5 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
                  <div className="text-center">
                    <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-2xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                      Selecione uma vaga
                    </div>
                    <p className="text-sm text-slate-600">
                      Escolha uma vaga à esquerda para visualizar as aplicações por
                      etapa.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="candidates">
            <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Candidatos (hr_candidates)
                  </h2>
                  <p className="text-sm text-slate-600">
                    Lista dos últimos 50 candidatos do seu tenant.
                  </p>
                </div>

                <div className="text-sm text-slate-600">
                  {candidatesQuery.isFetching
                    ? "Carregando…"
                    : `${candidateRows.length} registro(s)`}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/5">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-slate-700">Nome</TableHead>
                      <TableHead className="text-slate-700">E-mail</TableHead>
                      <TableHead className="text-slate-700">Status</TableHead>
                      <TableHead className="text-right text-slate-700">
                        Criado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidatesQuery.error ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8">
                          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                            Falha ao carregar candidates (verifique login/RLS):{" "}
                            {(candidatesQuery.error as any)?.message ??
                              String(candidatesQuery.error)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : candidateRows.length === 0 && !candidatesQuery.isFetching ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10">
                          <div className="text-center">
                            <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-2xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                              Comece por aqui
                            </div>
                            <p className="text-sm text-slate-600">
                              Nenhum candidato encontrado ainda.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      candidateRows.map((c) => (
                        <TableRow key={c.id} className="hover:bg-slate-50/70">
                          <TableCell className="font-medium text-slate-900">
                            <Link
                              to={`/candidates/${c.id}`}
                              className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
                            >
                              {c.full_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-slate-700">{c.email}</TableCell>
                          <TableCell>
                            <Badge
                              className="rounded-full bg-indigo-600 text-white"
                              variant="default"
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
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
      </div>
    </div>
  );
}