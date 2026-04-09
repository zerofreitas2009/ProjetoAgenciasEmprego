import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Insight = {
  match_percent: number;
  resumo_fit: string;
  pontos_fortes: unknown;
  gap_tecnico: string | null;
  model: string;
};

function toList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string").slice(0, 3);
}

function ScoreRing({ value }: { value: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          strokeWidth="10"
          className="fill-none stroke-white/10"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          strokeWidth="10"
          strokeLinecap="round"
          className="fill-none stroke-[hsl(var(--electric-indigo))]"
          style={{
            strokeDasharray: `${dash} ${circumference - dash}`,
          }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold tracking-tight text-white">
          {pct}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          match
        </div>
      </div>
    </div>
  );
}

export function AiInsightsDialog({
  open,
  onOpenChange,
  applicationId,
  candidateName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string | null;
  candidateName?: string | null;
}) {
  const insightsQuery = useQuery({
    queryKey: ["hr_ai_insight", applicationId],
    enabled: open && !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_ai_insights")
        .select("match_percent, resumo_fit, pontos_fortes, gap_tecnico, model")
        .eq("application_id", applicationId as string)
        .maybeSingle();
      if (error) throw error;
      return data as Insight | null;
    },
    refetchInterval: (q) => (q.state.data ? false : 2000),
  });

  const strengths = useMemo(
    () => toList(insightsQuery.data?.pontos_fortes),
    [insightsQuery.data?.pontos_fortes]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-[32px] p-0 hr-glass">
        <div className="relative p-6">
          {/* neon blobs */}
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[hsl(var(--electric-indigo))]/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

          <DialogHeader>
            <DialogTitle className="text-xl tracking-tight">
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
                  <Bot className="h-5 w-5" />
                </span>
                AI Insights by Groq
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-1 text-sm text-slate-300">
            {candidateName ? (
              <span>
                Análise automática para <b className="text-white">{candidateName}</b>
              </span>
            ) : (
              "Análise automática do currículo vs vaga"
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
            <Card className="rounded-[28px] p-4 hr-glass bg-white/5 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-300">Score</div>
                <Badge className="rounded-full bg-white/10 text-slate-100 ring-1 ring-white/10">
                  llama3-70b
                </Badge>
              </div>

              <div className="mt-3 flex justify-center">
                {insightsQuery.isFetching ? (
                  <div className="py-4">
                    <Skeleton className="h-24 w-24 rounded-full bg-white/10" />
                  </div>
                ) : insightsQuery.data ? (
                  <ScoreRing value={insightsQuery.data.match_percent} />
                ) : (
                  <div className="py-4 text-center">
                    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-white">
                      Gerando…
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      A análise aparece em instantes.
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="rounded-[28px] p-5 hr-glass bg-white/5 ring-1 ring-white/10">
              {insightsQuery.isFetching ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-48 rounded-xl bg-white/10" />
                  <Skeleton className="h-4 w-full rounded-xl bg-white/10" />
                  <Skeleton className="h-4 w-4/5 rounded-xl bg-white/10" />
                </div>
              ) : insightsQuery.data ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-300">
                      Resumo do fit
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-100">
                      {insightsQuery.data.resumo_fit}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-300">
                      Pontos fortes
                    </div>
                    <ul className="mt-2 space-y-2">
                      {strengths.length === 0 ? (
                        <li className="text-sm text-slate-300">—</li>
                      ) : (
                        strengths.map((s) => (
                          <li
                            key={s}
                            className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10"
                          >
                            {s}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-300">
                      Gap técnico
                    </div>
                    <div className="mt-2 rounded-2xl bg-amber-400/10 px-3 py-2 text-sm text-amber-100 ring-1 ring-amber-400/15">
                      {insightsQuery.data.gap_tecnico ?? "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-300">
                  Sem insights ainda. (Pode levar alguns segundos após a inscrição.)
                </div>
              )}
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
