import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

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
  const [requirementsCsv, setRequirementsCsv] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedRequirements = useMemo(() => {
    return requirementsCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [requirementsCsv]);

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
        requirements: normalizedRequirements,
        status: "OPEN",
      });

      if (error) throw error;

      setCompanyId(null);
      setTitle("");
      setSalaryRange("");
      setDescription("");
      setRequirementsCsv("");

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
            Criar vaga
            <Badge className="rounded-full bg-[#FB923C]/10 text-[#FB923C] ring-1 ring-[#FB923C]/15 dark:bg-[#FB923C]/15">
              rápido
            </Badge>
          </div>
          <h2 className="mt-3 text-base font-semibold">Nova vaga</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Requirements viram o "Raio‑X" do Matchmaker automaticamente.
          </p>
        </div>

        <Button
          className="h-11 rounded-xl hr-btn-primary"
          disabled={submitting || !companyId || !title}
          onClick={createJob}
        >
          {submitting ? "Criando…" : "Criar vaga"}
        </Button>
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
            Título
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
            placeholder="Ex: Senior Frontend"
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Faixa salarial
          </div>
          <Input
            value={salaryRange}
            onChange={(e) => setSalaryRange(e.target.value)}
            className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
            placeholder="Ex: R$ 18k – 25k"
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Requirements (CSV)
          </div>
          <Input
            value={requirementsCsv}
            onChange={(e) => setRequirementsCsv(e.target.value)}
            className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
            placeholder="Ex: React, TypeScript, Supabase, UX, Testing"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {normalizedRequirements.slice(0, 6).map((r) => (
              <Badge
                key={r}
                className="rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
              >
                {r}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Descrição
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[110px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
          placeholder="Contexto, responsabilidades, stack, etc."
        />
      </div>
    </Card>
  );
}