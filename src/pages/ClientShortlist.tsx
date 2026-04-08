import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hr_matchScore } from "@/lib/hr_match";
import { Check, X, UsersRound } from "lucide-react";

type Row = {
  job_id: string;
  job_title: string;
  job_requirements: unknown;
  application_id: string;
  current_stage: string;
  application_status: string;
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

  const shortlistQuery = useQuery({
    queryKey: ["hr_guest_shortlist", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hr_guest_get_shortlist", {
        p_token: token,
      });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const jobTitle = useMemo(() => shortlistQuery.data?.[0]?.job_title ?? "", [
    shortlistQuery.data,
  ]);

  async function setStatus(applicationId: string, status: "APPROVED" | "REJECTED") {
    if (!token) return;
    setIsSaving(applicationId);
    try {
      const { error } = await supabase.rpc("hr_guest_set_application_status", {
        p_token: token,
        p_application_id: applicationId,
        p_status: status,
      });
      if (error) throw error;
      await shortlistQuery.refetch();
    } finally {
      setIsSaving(null);
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--app-bg))] px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-sm ring-1 ring-black/5">
            <UsersRound className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold tracking-wide text-slate-800">
              Portal do Cliente
            </span>
          </div>
          <Button
            variant="secondary"
            className="rounded-2xl bg-white/70 ring-1 ring-black/5 hover:bg-white"
            asChild
          >
            <Link to="/">Página inicial</Link>
          </Button>
        </header>

        <Card className="rounded-3xl border-black/5 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Shortlist
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Você verá apenas os perfis selecionados — sem dados de contato.
              </p>
            </div>
            {jobTitle ? (
              <Badge className="w-fit rounded-full bg-indigo-600 text-white">
                {jobTitle}
              </Badge>
            ) : null}
          </div>

          {shortlistQuery.isFetching ? (
            <div className="mt-5 rounded-2xl bg-slate-50/70 px-4 py-3 text-sm text-slate-700 ring-1 ring-black/5">
              Carregando shortlist…
            </div>
          ) : shortlistQuery.error ? (
            <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
              {(shortlistQuery.error as any)?.message ?? String(shortlistQuery.error)}
            </div>
          ) : (shortlistQuery.data ?? []).length === 0 ? (
            <div className="mt-6 rounded-3xl bg-slate-50/70 p-6 text-center ring-1 ring-black/5">
              <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-2xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                Sem candidatos
              </div>
              <p className="text-sm text-slate-600">
                A shortlist ainda não possui candidatos.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {(shortlistQuery.data ?? []).map((row) => {
                const score = hr_matchScore(
                  row.candidate_skills,
                  row.job_requirements
                );
                const skills = skillsToArray(row.candidate_skills);
                return (
                  <div
                    key={row.application_id}
                    className="rounded-3xl bg-white/80 p-5 ring-1 ring-black/5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          {row.candidate_display_name}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge className="rounded-full bg-white text-slate-700 ring-1 ring-black/5">
                            Etapa: {row.current_stage}
                          </Badge>
                          <Badge
                            className={
                              row.application_status === "APPROVED"
                                ? "rounded-full bg-emerald-600 text-white"
                                : row.application_status === "REJECTED"
                                  ? "rounded-full bg-rose-600 text-white"
                                  : "rounded-full bg-slate-200 text-slate-700"
                            }
                          >
                            {row.application_status}
                          </Badge>
                          <Badge className="rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                            Match: {score}%
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          className="h-10 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={isSaving === row.application_id}
                          onClick={() => setStatus(row.application_id, "APPROVED")}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-10 rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                          disabled={isSaving === row.application_id}
                          onClick={() => setStatus(row.application_id, "REJECTED")}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Reprovar
                        </Button>
                      </div>
                    </div>

                    {skills.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {skills.slice(0, 12).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-black/5"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-600">
                        Skills não informadas.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Este portal é um link seguro e específico para esta vaga.
        </p>
      </div>
    </div>
  );
}