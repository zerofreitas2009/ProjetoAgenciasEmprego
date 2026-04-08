import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  jobId: string;
  candidateId: string;
};

type RadarDatum = {
  skill: string;
  required: number;
  candidate: number;
};

function clamp01to100(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function normalizeRequirements(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const out: string[] = [];
  for (const item of input) {
    if (typeof item === "string") out.push(item);
    else if (item && typeof item === "object") {
      const anyItem = item as any;
      const name = anyItem.name ?? anyItem.skill ?? anyItem.title;
      if (typeof name === "string" && name.trim()) out.push(name.trim());
    }
  }

  // Unique, keep order
  return Array.from(new Set(out.map((s) => s.trim()).filter(Boolean)));
}

function candidateSkillLevel(skills: unknown, targetSkill: string): number {
  const t = targetSkill.trim().toLowerCase();
  if (!t) return 0;

  if (!Array.isArray(skills)) return 0;

  // Common formats:
  // ["React", "TypeScript"]
  // [{ name: "React", level: 80 }]
  // [{ skill: "React", proficiency: 3 }]
  for (const raw of skills) {
    if (typeof raw === "string") {
      if (raw.trim().toLowerCase() === t) return 70;
      continue;
    }

    if (raw && typeof raw === "object") {
      const anyRaw = raw as any;
      const name = (anyRaw.name ?? anyRaw.skill ?? anyRaw.title ?? "") as string;
      if (typeof name !== "string") continue;
      if (name.trim().toLowerCase() !== t) continue;

      const level = anyRaw.level ?? anyRaw.score ?? anyRaw.value;
      if (typeof level === "number") return clamp01to100(level);

      const proficiency = anyRaw.proficiency;
      if (typeof proficiency === "number") {
        // If stored as 1–5, map to 20–100
        if (proficiency >= 0 && proficiency <= 5)
          return clamp01to100(proficiency * 20);
        return clamp01to100(proficiency);
      }

      return 70;
    }
  }

  return 0;
}

export function hr_MatchRadar({ jobId, candidateId }: Props) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;

  const jobQuery = useQuery({
    queryKey: ["hr_job_requirements", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_jobs")
        .select("id, title, requirements")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data as { id: string; title: string; requirements: unknown };
    },
  });

  const candidateQuery = useQuery({
    queryKey: ["hr_candidate_skills", candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_candidates")
        .select("id, full_name, skills")
        .eq("id", candidateId)
        .single();
      if (error) throw error;
      return data as { id: string; full_name: string; skills: unknown };
    },
  });

  const chartData = useMemo((): RadarDatum[] => {
    const req = normalizeRequirements(jobQuery.data?.requirements).slice(0, 5);
    const skills = candidateQuery.data?.skills;

    return req.map((skill) => ({
      skill,
      required: 100,
      candidate: candidateSkillLevel(skills, skill),
    }));
  }, [jobQuery.data?.requirements, candidateQuery.data?.skills]);

  const colors = useMemo(() => {
    if (currentTheme === "dark") {
      return {
        axis: "rgba(226,232,240,0.80)",
        grid: "rgba(255,255,255,0.10)",
        fill: "url(#neonFill)",
        stroke: "url(#neonStroke)",
      };
    }

    return {
      axis: "rgba(30,41,59,0.70)",
      grid: "rgba(2,6,23,0.08)",
      fill: "rgba(37,99,235,0.18)",
      stroke: "rgba(37,99,235,0.85)",
    };
  }, [currentTheme]);

  return (
    <Card className="rounded-3xl border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            IA Matchmaker • Raio-X
          </div>
          <h3 className="mt-2 text-base font-semibold">
            {jobQuery.isFetching ? (
              <Skeleton className="h-5 w-44 rounded-xl" />
            ) : (
              jobQuery.data?.title ?? "Vaga"
            )}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {candidateQuery.isFetching ? (
              <span className="inline-block">
                <Skeleton className="h-4 w-40 rounded-xl" />
              </span>
            ) : (
              <>Candidato: {candidateQuery.data?.full_name ?? "—"}</>
            )}

          </p>
        </div>

        <div className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
          5 skills
        </div>
      </div>

      <div className="mt-4 h-[280px]">
        {jobQuery.isFetching || candidateQuery.isFetching ? (
          <Skeleton className="h-full w-full rounded-3xl" />
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-3xl bg-white/60 text-sm text-slate-600 ring-1 ring-black/5 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
            A vaga ainda não tem requirements.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} outerRadius={95}>
              <defs>
                <linearGradient id="neonFill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.20} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.20} />
                </linearGradient>
                <linearGradient id="neonStroke" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.95} />
                </linearGradient>
              </defs>

              <PolarGrid stroke={colors.grid} />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fill: colors.axis, fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />

              <Radar
                name="Candidato"
                dataKey="candidate"
                stroke={colors.stroke}
                fill={colors.fill}
                fillOpacity={1}
                strokeWidth={2}
                dot={{ r: 2, fill: "rgba(255,255,255,0.85)", stroke: "none" }}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
                }}
                formatter={(v: any) => [`${v}%`, "Nível"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {chartData.map((d) => (
          <div
            key={d.skill}
            className="flex items-center justify-between rounded-2xl bg-white/60 px-3 py-2 text-sm ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10"
          >
            <span className="truncate text-slate-700 dark:text-slate-200">
              {d.skill}
            </span>
            <span className="ml-3 font-semibold text-slate-900 dark:text-white">
              {d.candidate}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
