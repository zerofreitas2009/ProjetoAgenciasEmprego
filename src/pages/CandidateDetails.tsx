import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Mail } from "lucide-react";

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  skills: unknown;
  resume_url: string | null;
  created_at: string;
};

type ApplicationRow = {
  id: string;
  job_title: string;
  current_stage: string;
  status: string;
  created_at: string;
};

function skillsToArray(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  return skills.filter((x): x is string => typeof x === "string");
}

export default function CandidateDetails() {
  const { session, isLoading } = useSession();
  const { candidateId } = useParams();

  const candidateQuery = useQuery({
    queryKey: ["hr_candidate", candidateId],
    enabled: !!session && !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_candidates")
        .select("id, full_name, email, status, skills, resume_url, created_at")
        .eq("id", candidateId as string)
        .single();

      if (error) throw error;
      return data as Candidate;
    },
  });

  const applicationsQuery = useQuery({
    queryKey: ["hr_candidate_applications", candidateId],
    enabled: !!session && !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_applications")
        .select(
          "id, current_stage, status, created_at, job:hr_jobs!hr_applications_job_id_fkey(title)"
        )
        .eq("candidate_id", candidateId as string)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        job_title: row.job?.title ?? "—",
        current_stage: row.current_stage ?? "Triagem",
        status: row.status ?? "—",
        created_at: row.created_at,
      })) as ApplicationRow[];
    },
  });

  const resumeUrlQuery = useQuery({
    queryKey: ["hr_candidate_resume_signed", candidateId],
    enabled: !!session && !!candidateId,
    queryFn: async () => {
      const candidate = candidateQuery.data;
      if (!candidate?.resume_url) return null;

      const { data, error } = await supabase.storage
        .from("hr_resumes")
        .createSignedUrl(candidate.resume_url, 60 * 5);

      if (error) throw error;
      return data.signedUrl;
    },
  });

  const skillList = useMemo(
    () => skillsToArray(candidateQuery.data?.skills ?? []),
    [candidateQuery.data?.skills]
  );

  if (!isLoading && !session) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <div className="space-y-4">
        <Card className="rounded-[28px] p-6 hr-glass">
          {candidateQuery.isFetching ? (
            <div className="space-y-3">
              <Skeleton className="h-7 w-64 rounded-xl" />
              <Skeleton className="h-5 w-80 rounded-xl" />
            </div>
          ) : candidateQuery.error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
              {(candidateQuery.error as any)?.message ??
                String(candidateQuery.error)}
            </div>
          ) : candidateQuery.data ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {candidateQuery.data.full_name}
                  </h1>
                  <Badge className="rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-violet-500/15">
                    {candidateQuery.data.status}
                  </Badge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a
                      href={`mailto:${candidateQuery.data.email}`}
                      className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-white/20 dark:hover:decoration-white/40"
                    >
                      {candidateQuery.data.email}
                    </a>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500">•</span>
                  <span>
                    Cadastrado em{" "}
                    {new Date(candidateQuery.data.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Competências
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skillList.length === 0 ? (
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          —
                        </span>
                      ) : (
                        skillList.slice(0, 18).map((s) => (
                          <Badge
                            key={s}
                            className="rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
                          >
                            {s}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Currículo
                    </div>
                    <div className="mt-3">
                      {resumeUrlQuery.isFetching ? (
                        <Skeleton className="h-10 w-full rounded-2xl" />
                      ) : resumeUrlQuery.data ? (
                        <Button
                          className="h-10 w-full rounded-xl hr-btn-primary"
                          asChild
                        >
                          <a href={resumeUrlQuery.data} target="_blank" rel="noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Baixar
                          </a>
                        </Button>
                      ) : (
                        <div className="rounded-2xl bg-[#F8FAFC]/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                          Não enviado.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                className="h-10 rounded-xl hr-btn-secondary"
                asChild
              >
                <Link to="/dashboard">Voltar</Link>
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="rounded-[28px] p-5 hr-glass">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Histórico</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Vagas e etapas em que o candidato passou.
              </p>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {applicationsQuery.isFetching
                ? "Carregando…"
                : `${(applicationsQuery.data ?? []).length} item(ns)`}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8FAFC]/80 dark:bg-white/5">
                  <TableHead className="text-slate-600 dark:text-slate-300">
                    Vaga
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">
                    Etapa
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-300">
                    Data
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicationsQuery.isFetching ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-8 w-full rounded-xl" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : applicationsQuery.error ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8">
                      <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
                        {(applicationsQuery.error as any)?.message ??
                          String(applicationsQuery.error)}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (applicationsQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Sem movimentações ainda.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  (applicationsQuery.data ?? []).map((row) => (
                    <TableRow
                      key={row.id}
                      className="transition hover:bg-[#F8FAFC]/80 dark:hover:bg-white/5"
                    >
                      <TableCell className="font-medium">
                        {row.job_title}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-200">
                        {row.current_stage}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.status}
                          onValueChange={async (val) => {
                            await supabase
                              .from("hr_applications")
                              .update({
                                status: val,
                                status_changed_at: new Date().toISOString(),
                              })
                              .eq("id", row.id);
                            applicationsQuery.refetch();
                          }}
                        >
                          <SelectTrigger className="h-10 w-[170px] rounded-xl bg-white/70 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="APPLIED">Aplicado</SelectItem>
                            <SelectItem value="IN_REVIEW">Em análise</SelectItem>
                            <SelectItem value="INTERVIEW">Entrevista</SelectItem>
                            <SelectItem value="OFFER">Proposta</SelectItem>
                            <SelectItem value="HIRED">Contratado</SelectItem>
                            <SelectItem value="REJECTED">Reprovado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right text-slate-600 dark:text-slate-300">
                        {new Date(row.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}