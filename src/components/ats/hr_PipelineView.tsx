import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hr_matchScore } from "@/lib/hr_match";
import { Star, UserRound } from "lucide-react";

export type HrApplicationRow = {
  id: string;
  current_stage: string;
  feedback_notes: string | null;
  status: string;
  candidate: {
    id: string;
    full_name: string;
    email: string;
    status: string;
    skills: unknown;
  } | null;
};

type Props = {
  jobTitle: string;
  jobRequirements: unknown;
  applications: HrApplicationRow[];
  shortlistedIds: Set<string>;
  onToggleShortlist: (applicationId: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
};

function stageShell(stage: string) {
  const s = stage.toLowerCase();

  // Pastel in light, neon-soft in dark.
  if (s.includes("triag"))
    return "bg-indigo-50/70 ring-indigo-200 text-slate-900 dark:bg-[#1A1F3A] dark:ring-[#3B4BFF]/30 dark:text-slate-100";
  if (s.includes("entre"))
    return "bg-sky-50/70 ring-sky-200 text-slate-900 dark:bg-[#0E2430] dark:ring-cyan-400/20 dark:text-slate-100";
  if (s.includes("final"))
    return "bg-violet-50/70 ring-violet-200 text-slate-900 dark:bg-[#211332] dark:ring-fuchsia-400/20 dark:text-slate-100";
  if (s.includes("oferta") || s.includes("offer"))
    return "bg-emerald-50/70 ring-emerald-200 text-slate-900 dark:bg-[#0E2B22] dark:ring-emerald-400/20 dark:text-slate-100";
  if (s.includes("contrat") || s.includes("hired"))
    return "bg-amber-50/70 ring-amber-200 text-slate-900 dark:bg-[#2B220E] dark:ring-amber-400/20 dark:text-slate-100";

  return "bg-slate-50/70 ring-black/5 text-slate-900 dark:bg-white/5 dark:ring-white/10 dark:text-slate-100";
}

export function hr_PipelineView({
  jobTitle,
  jobRequirements,
  applications,
  shortlistedIds,
  onToggleShortlist,
  isLoading,
  errorMessage,
}: Props) {
  const { stages, grouped } = useMemo(() => {
    const map = new Map<string, HrApplicationRow[]>();

    for (const a of applications) {
      const stage = (a.current_stage || "Triagem").trim();
      map.set(stage, [...(map.get(stage) ?? []), a]);
    }

    const stageList = Array.from(map.keys());

    const preferred = ["Triagem", "Entrevista", "Finalista", "Oferta", "Contratado"];
    stageList.sort((a, b) => {
      const ia = preferred.indexOf(a);
      const ib = preferred.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return { stages: stageList, grouped: map };
  }, [applications]);

  return (
    <Card className="rounded-3xl border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Pipeline</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Candidatos da vaga: <span className="font-medium">{jobTitle}</span>
          </p>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-300">
          {isLoading ? "Carregando…" : `${applications.length} aplicação(ões)`}
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
          {errorMessage}
        </div>
      ) : null}

      {(!isLoading && applications.length === 0) || stages.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white/60 p-6 text-center ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
          <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
            Sem inscrições
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Quando houver candidaturas para esta vaga, elas aparecerão aqui
            agrupadas por etapa.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {stages.map((stage) => {
            const list = grouped.get(stage) ?? [];
            return (
              <div
                key={stage}
                className={cn(
                  "rounded-3xl p-3 ring-1 shadow-sm transition",
                  stageShell(stage)
                )}
              >
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <div className="text-sm font-semibold">{stage}</div>
                  <Badge className="rounded-full bg-white/70 text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                    {list.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {list.map((a) => {
                    const isShortlisted = shortlistedIds.has(a.id);
                    const score = hr_matchScore(a.candidate?.skills, jobRequirements);

                    return (
                      <div
                        key={a.id}
                        className={cn(
                          "rounded-2xl bg-white/70 p-3 shadow-sm ring-1 ring-black/5",
                          "transition hover:bg-white dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                              <UserRound className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                {a.candidate?.full_name ?? "Candidato"}
                              </div>
                              <div className="truncate text-xs text-slate-600 dark:text-slate-300">
                                {a.candidate?.email ?? ""}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge className="rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                                  Match: {score}%
                                </Badge>
                                <Badge
                                  className={
                                    a.status === "APPROVED"
                                      ? "rounded-full bg-emerald-600 text-white"
                                      : a.status === "REJECTED"
                                        ? "rounded-full bg-rose-600 text-white"
                                        : "rounded-full bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                                  }
                                >
                                  {a.status}
                                </Badge>
                              </div>

                              {a.feedback_notes ? (
                                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                  {a.feedback_notes}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <Button
                            variant="secondary"
                            className={cn(
                              "h-9 rounded-xl bg-white/70 px-3 ring-1 ring-black/5 hover:bg-white",
                              "dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10",
                              isShortlisted &&
                                "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-95 dark:bg-[hsl(var(--primary))]"
                            )}
                            onClick={() => onToggleShortlist(a.id)}
                            title={
                              isShortlisted
                                ? "Remover da shortlist"
                                : "Selecionar para o cliente"
                            }
                          >
                            <Star
                              className={cn(
                                "h-4 w-4",
                                isShortlisted && "fill-current"
                              )}
                            />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}