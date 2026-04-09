import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DnaSkillLevel = "BASIC" | "INTERMEDIATE" | "ADVANCED";

export type DnaSkill = {
  name: string;
  level: DnaSkillLevel;
};

export function levelToTarget(level: DnaSkillLevel): number {
  if (level === "BASIC") return 40;
  if (level === "INTERMEDIATE") return 70;
  return 100;
}

export function JobDnaRadarPreview({
  skills,
  className,
}: {
  skills: DnaSkill[];
  className?: string;
}) {
  const chartData = useMemo(() => {
    const top = skills.slice(0, 5);
    return top.map((s) => ({
      skill: s.name,
      target: levelToTarget(s.level),
    }));
  }, [skills]);

  return (
    <Card
      className={cn(
        "rounded-[28px] p-5 hr-glass",
        "ring-1 ring-slate-200/70 dark:ring-white/10",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Preview • Perfil ideal
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Radar com as metas do DNA técnico da vaga (sem dados de candidato).
          </p>
        </div>
        <div className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
          {Math.min(5, skills.length)}/5
        </div>
      </div>

      <div className="mt-4 h-[240px]">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-3xl bg-white/60 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
            Adicione skills para ver o radar.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} outerRadius="72%">
              <PolarGrid stroke="rgba(148,163,184,0.35)" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 11, fill: "rgba(148,163,184,0.95)" }}
              />
              <Radar
                name="Ideal"
                dataKey="target"
                stroke="rgb(111,0,255)"
                fill="rgba(111,0,255,0.18)"
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/60 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
          Básico ≈ 40
        </span>
        <span className="rounded-full bg-white/60 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
          Intermediário ≈ 70
        </span>
        <span className="rounded-full bg-white/60 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
          Avançado ≈ 100
        </span>
      </div>
    </Card>
  );
}
