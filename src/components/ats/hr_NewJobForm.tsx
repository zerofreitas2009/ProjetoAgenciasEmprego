import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BriefcaseBusiness, Sparkles } from "lucide-react";

type Company = {
  id: string;
  name: string;
};

type Props = {
  companies: Company[];
  onCreated: () => void;
};

export function hr_NewJobForm({ companies, onCreated }: Props) {
  const queryClient = useQueryClient();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [description, setDescription] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const skills = useMemo(() => {
    return skillsText
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [skillsText]);

  async function createJob() {
    setSubmitting(true);
    try {
      const { data: tenantId, error: tenantErr } = await supabase.rpc(
        "get_hr_tenant"
      );
      if (tenantErr) throw tenantErr;

      const { error } = await supabase.from("hr_jobs").insert({
        tenant_id: tenantId as string,
        company_id: companyId,
        title,
        salary_range: salaryRange || null,
        description: description || null,
        requirements: skills,
        status: "OPEN",
      });

      if (error) throw error;

      setCompanyId(null);
      setTitle("");
      setSalaryRange("");
      setDescription("");
      setSkillsText("");

      queryClient.invalidateQueries({ queryKey: ["hr_jobs"] });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-[28px] p-5 hr-glass">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            Nova vaga
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Defina a vaga e acompanhe os candidatos no pipeline.
          </p>
        </div>

        <Badge className="rounded-full bg-[#FB923C]/10 text-[#FB923C] ring-1 ring-[#FB923C]/15 dark:bg-[#FB923C]/15">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Match automático
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Empresa
          </div>
          <Select value={companyId ?? ""} onValueChange={(v) => setCompanyId(v)}>
            <SelectTrigger className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Título da vaga
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
            placeholder="Ex.: Analista de Suporte"
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Faixa salarial (opcional)
          </div>
          <Input
            value={salaryRange}
            onChange={(e) => setSalaryRange(e.target.value)}
            className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
            placeholder="Ex.: R$ 6.000 – R$ 8.500"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Competências-chave
          </div>
          <Textarea
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            className="min-h-[90px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
            placeholder="Separe por vírgulas. Ex.: React, Atendimento, SQL"
          />
          {skills.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.slice(0, 10).map((s) => (
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
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Descrição (opcional)
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[110px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
          placeholder="Contexto, responsabilidades, perfil…"
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Você pode ajustar a vaga a qualquer momento.
        </div>
        <Button
          className="h-11 rounded-xl hr-btn-primary"
          disabled={submitting || !companyId || !title.trim()}
          onClick={createJob}
        >
          {submitting ? "Salvando…" : "Criar vaga"}
        </Button>
      </div>
    </Card>
  );
}
