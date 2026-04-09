import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { hr_matchScore } from "@/lib/hr_match";
import { Check, X, UsersRound, ArrowLeft, BriefcaseBusiness } from "lucide-react";

type Row = {
  company_id?: string | null;
  company_name?: string | null;
  job_id: string;
  job_title: string;
  job_requirements: unknown;
  application_id: string;
  current_stage: string;
  application_status: string;
  feedback_notes: string | null;
  candidate_display_name: string;
  candidate_skills: unknown;
};

function skillsToArray(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  return skills.filter((x): x is string => typeof x === "string");
}

export default function ClientShortlist() {
  const { token } = useParams();
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const tokenTypeQuery = useQuery({
    queryKey: ["hr_portal_token_type", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hr_resolve_portal_token", {
        p_token: token,
      });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });

  const shortlistQuery = useQuery({
    queryKey: ["hr_portal_rows", token, tokenTypeQuery.data],
    enabled: !!token && tokenTypeQuery.isFetched,
    queryFn: async () => {
      const type = tokenTypeQuery.data;
      if (type === "client") {
        const { data, error } = await supabase.rpc("hr_client_get_portal_candidates", {
          p_token: token,
        });
        if (error) throw error;
        return (data ?? []) as Row[];
      }

      if (type === "job") {
        const { data, error } = await supabase.rpc("hr_guest_get_shortlist", {
          p_token: token,
        });
        if (error) throw error;
        return (data ?? []) as Row[];
      }

      return [] as Row[];
    },
  });

  const companyName = useMemo(
    () => shortlistQuery.data?.[0]?.company_name ?? "",
    [shortlistQuery.data]
  );

  const jobsInPortal = useMemo(() => {
    const map = new Map<string, { jobTitle: string; requirements: unknown; rows: Row[] }>();
    for (const r of shortlistQuery.data ?? []) {
      const key = r.job_id;
      const existing = map.get(key);
      if (existing) existing.rows.push(r);
      else map.set(key, { jobTitle: r.job_title, requirements: r.job_requirements, rows: [r] });
    }
    return Array.from(map.values());
  }, [shortlistQuery.data]);

  async function setStatus(applicationId: string, status: "APPROVED" | "REJECTED") {
    if (!token) return;
    setIsSaving(applicationId);
    try {
      const type = tokenTypeQuery.data;
      const notes = draftNotes[applicationId] ?? null;

      const rpcName = type === "client" ? "hr_client_set_application_status" : "hr_guest_set_application_status";
      const { error } = await supabase.rpc(rpcName, {
        p_token: token,
        p_application_id: applicationId,
        p_status: status,
        p_feedback_notes: notes,
      });
      if (error) throw error;
      await shortlistQuery.refetch();
    } finally {
      setIsSaving(null);
    }
  }

  const loading = tokenTypeQuery.isFetching || shortlistQuery.isFetching;
  const hasTokenError = !!tokenTypeQuery.error;
  const tokenType = tokenTypeQuery.data;

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 hr-glass"
            title="Home"
          >
            <HrLogo size="sm" />
          </Link>

          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Página inicial
          </Link>
        </header>

        <Card className="rounded-[28px] p-6 hr-glass">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                <UsersRound className="h-4 w-4" />
                Portal do Cliente
              </div>
              <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Aprovados para Triagem
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Você verá apenas os perfis liberados pelo recrutador — sem dados de contato.
              </p>
            </div>

            {companyName ? (
              <Badge className="w-fit rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-violet-500/15">
                {companyName}
              </Badge>
            ) : null}
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl bg-[#F8FAFC]/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
              Carregando…
            </div>
          ) : hasTokenError ? (
            <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
              {(tokenTypeQuery.error as any)?.message ?? String(tokenTypeQuery.error)}
            </div>
          ) : tokenType == null ? (
            <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900/40">
              Link inválido ou expirado.
            </div>
          ) : shortlistQuery.error ? (
            <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
              {(shortlistQuery.error as any)?.message ?? String(shortlistQuery.error)}
            </div>
          ) : (shortlistQuery.data ?? []).length === 0 ? (
            <div className="mt-6 rounded-3xl bg-[#F8FAFC]/80 p-6 text-center ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
              <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                Sem candidatos
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Ainda não há candidatos aprovados para triagem.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {jobsInPortal.map((group) => (
                <div key={group.jobTitle} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                      <BriefcaseBusiness className="h-4 w-4" />
                      {group.jobTitle}
                    </div>
                    <Badge className="rounded-full bg-[hsl(var(--electric-indigo))]/10 text-[hsl(var(--electric-indigo))] ring-1 ring-[hsl(var(--electric-indigo))]/20 dark:text-white">
                      {group.rows.length} perfil(s)
                    </Badge>
                  </div>

                  <div className="grid gap-4">
                    {group.rows.map((row) => {
                      const score = hr_matchScore(row.candidate_skills, group.requirements);
                      const skillList = skillsToArray(row.candidate_skills);
                      const notes = draftNotes[row.application_id] ?? row.feedback_notes ?? "";

                      return (
                        <div
                          key={row.application_id}
                          className="rounded-[28px] p-5 hr-glass"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="text-base font-semibold">
                                {row.candidate_display_name}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge className="rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                                  Match: {score}%
                                </Badge>
                                <Badge className="rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                                  {row.current_stage}
                                </Badge>
                                <Badge
                                  className={
                                    row.application_status === "APPROVED"
                                      ? "rounded-full bg-[#10B981] text-white shadow-lg shadow-emerald-500/20"
                                      : row.application_status === "REJECTED"
                                        ? "rounded-full bg-rose-600 text-white"
                                        : "rounded-full bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                                  }
                                >
                                  {row.application_status}
                                </Badge>
                              </div>

                              {skillList.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {skillList.slice(0, 10).map((s) => (
                                    <Badge
                                      key={s}
                                      className="rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
                                    >
                                      {s}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                className="h-10 rounded-xl hr-btn-secondary"
                                onClick={() => setStatus(row.application_id, "APPROVED")}
                                disabled={isSaving === row.application_id}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button
                                className="h-10 rounded-xl hr-btn-secondary"
                                onClick={() => setStatus(row.application_id, "REJECTED")}
                                disabled={isSaving === row.application_id}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Reprovar
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Feedback (opcional)
                            </div>
                            <Textarea
                              className="mt-2 min-h-[90px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                              value={notes}
                              onChange={(e) =>
                                setDraftNotes((prev) => ({
                                  ...prev,
                                  [row.application_id]: e.target.value,
                                }))
                              }
                              placeholder="Escreva um feedback curto para o recrutador…"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}