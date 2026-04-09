import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function parseRequirements(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    return raw
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

type DnaLevel = "BASIC" | "INTERMEDIATE" | "ADVANCED";

function levelToTarget(level: DnaLevel): number {
  if (level === "BASIC") return 40;
  if (level === "INTERMEDIATE") return 70;
  return 100;
}

function parseDnaSkills(raw: unknown): { skill: string; target: number }[] {
  if (!Array.isArray(raw)) return [];
  const list: { skill: string; target: number }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as any;
    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    const level = String(obj.level ?? "").toUpperCase() as DnaLevel;
    if (!name) continue;
    if (level !== "BASIC" && level !== "INTERMEDIATE" && level !== "ADVANCED") continue;
    list.push({ skill: name, target: levelToTarget(level) });
  }
  return list.slice(0, 5);
}

function candidateSkillLevel(skills: unknown, targetSkill: string): number {
  if (!Array.isArray(skills)) return 0;

  for (const raw of skills) {
    if (typeof raw === "string") {
      if (raw.toLowerCase() === targetSkill.toLowerCase()) return 80;
    }

    if (raw && typeof raw === "object") {
      const obj = raw as any;
      const name = typeof obj.name === "string" ? obj.name : "";
      if (name.toLowerCase() !== targetSkill.toLowerCase()) continue;
      const level = typeof obj.level === "number" ? obj.level : 0;
      return Math.max(0, Math.min(100, level));
    }
  }

  return 0;
}

export function hr_MatchRadar({
  jobId,
  candidateId,
  className,
}: {
  jobId: string;
  candidateId: string;
  className?: string;
}) {
  const jobQuery = useQuery({
    queryKey: ["hr_job_requirements", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_jobs")
        .select("id, title, requirements, dna_skills")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        title: string;
        requirements: unknown;
        dna_skills: unknown;
      };
    },
  });

  const candidateQuery = useQuery({
    queryKey: ["hr_candidate_skills", candidateId],
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

  const chartData = useMemo(() => {
    const dna = parseDnaSkills(jobQuery.data?.dna_skills);
    if (dna.length) {
      const skills = candidateQuery.data?.skills;
      return dna.map((d) => ({
        skill: d.skill,
        target: d.target,
        candidate: candidateSkillLevel(skills, d.skill),
      }));
    }

    const req = parseRequirements(jobQuery.data?.requirements);
    const top = req.slice(0, 5);
    const skills = candidateQuery.data?.skills;

    return top.map((skill) => ({
      skill,
      target: 100,
      candidate: candidateSkillLevel(skills, skill),
    }));
  }, [jobQuery.data?.requirements, jobQuery.data?.dna_skills, candidateQuery.data?.skills]);

  const loading = jobQuery.isFetching || candidateQuery.isFetching;

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
            Match • Raio-X
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Comparativo rápido entre o DNA técnico da vaga e o perfil do candidato.
          </p>
        </div>
        <div className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
          5 competências
        </div>
      </div>

      <div className="mt-4 h-[240px]">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-3xl bg-white/60 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
            <Skeleton className="h-6 w-40 rounded-xl" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-3xl bg-white/60 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
            Sem dados suficientes.
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
                fill="rgba(111,0,255,0.12)"
                strokeWidth={2}
              />
              <Radar
                name="Candidato"
                dataKey="candidate"
                stroke="rgba(16,185,129,0.95)"
                fill="rgba(16,185,129,0.10)"
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Metas do DNA: Básico≈40 • Intermediário≈70 • Avançado≈100
      </div>
    </Card>
  );
}