import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserRound } from "lucide-react";

export type HrApplicationRow = {
  id: string;
  current_stage: string;
  feedback_notes: string | null;
  candidate: {
    id: string;
    full_name: string;
    email: string;
    status: string;
  } | null;
};

type Props = {
  jobTitle: string;
  applications: HrApplicationRow[];
  isLoading?: boolean;
  errorMessage?: string | null;
};

export function hr_PipelineView({
  jobTitle,
  applications,
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

    // A default ordering that matches most ATS pipelines, but keeps custom stages too.
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
    <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Pipeline</h2>
          <p className="text-sm text-slate-600">
            Candidatos da vaga: <span className="font-medium">{jobTitle}</span>
          </p>
        </div>

        <div className="text-sm text-slate-600">
          {isLoading ? "Carregando…" : `${applications.length} aplicação(ões)`}
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {errorMessage}
        </div>
      ) : null}

      {(!isLoading && applications.length === 0) || stages.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-slate-50/70 p-6 text-center ring-1 ring-black/5">
          <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-2xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
            Sem inscrições
          </div>
          <p className="text-sm text-slate-600">
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
                className="rounded-3xl bg-slate-50/70 p-3 ring-1 ring-black/5"
              >
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {stage}
                  </div>
                  <Badge className="rounded-full bg-white text-slate-700 ring-1 ring-black/5">
                    {list.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {list.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "rounded-2xl bg-white/80 p-3 shadow-sm shadow-slate-900/5 ring-1 ring-black/5",
                        "transition hover:bg-white"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {a.candidate?.full_name ?? "Candidato"}
                          </div>
                          <div className="truncate text-xs text-slate-600">
                            {a.candidate?.email ?? ""}
                          </div>
                          {a.feedback_notes ? (
                            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                              {a.feedback_notes}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
