import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
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

const schema = z.object({
  company_id: z.string().uuid({ message: "Selecione uma empresa" }),
  title: z.string().min(2, "Informe um título"),
  description: z.string().optional(),
  salary_range: z.string().optional(),
  requirements_text: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED"]),
});

type Props = {
  companies: { id: string; name: string }[];
  onCreated?: () => void;
};

function parseCsvToSkills(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hr_NewJobForm({ companies, onCreated }: Props) {
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = useMemo(() => companies.length === 0, [companies.length]);

  useEffect(() => {
    if (!companyId && companies[0]?.id) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  async function handleCreate() {
    setError(null);

    const parsed = schema.safeParse({
      company_id: companyId,
      title,
      description: description || undefined,
      salary_range: salaryRange || undefined,
      requirements_text: requirementsText || undefined,
      status,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setIsSaving(true);
    try {
      const { data: tenantId, error: tenantErr } = await supabase.rpc(
        "get_hr_tenant"
      );
      if (tenantErr) throw tenantErr;
      if (!tenantId) throw new Error("Tenant não encontrado para este usuário.");

      const requirements = parsed.data.requirements_text
        ? parseCsvToSkills(parsed.data.requirements_text)
        : [];

      const { error: insertErr } = await supabase.from("hr_jobs").insert({
        tenant_id: tenantId,
        company_id: parsed.data.company_id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        salary_range: parsed.data.salary_range ?? null,
        requirements,
        status: parsed.data.status,
      });
      if (insertErr) throw insertErr;

      setTitle("");
      setDescription("");
      setSalaryRange("");
      setRequirementsText("");
      setStatus("OPEN");
      onCreated?.();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Nova vaga (hr_jobs)
          </h2>
          <p className="text-sm text-slate-600">
            Salva a vaga com o <span className="font-medium">tenant_id</span> do
            usuário logado.
          </p>
        </div>
      </div>

      {isDisabled ? (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Você ainda não tem empresas em <span className="font-mono">hr_companies</span>.
          Crie uma empresa para cadastrar vagas.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">Empresa</div>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="h-11 rounded-2xl bg-white/80">
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

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">Status</div>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="h-11 rounded-2xl bg-white/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">OPEN</SelectItem>
              <SelectItem value="CLOSED">CLOSED</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="text-xs font-semibold text-slate-700">Título</div>
          <Input
            className="h-11 rounded-2xl bg-white/80"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Pessoa Desenvolvedora Fullstack"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="text-xs font-semibold text-slate-700">Descrição</div>
          <Textarea
            className="min-h-[110px] rounded-2xl bg-white/80"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Principais responsabilidades, requisitos, etc."
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="text-xs font-semibold text-slate-700">
            Requisitos técnicos (separe por vírgula)
          </div>
          <Input
            className="h-11 rounded-2xl bg-white/80"
            value={requirementsText}
            onChange={(e) => setRequirementsText(e.target.value)}
            placeholder="Ex: react, typescript, node, postgres"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="text-xs font-semibold text-slate-700">
            Faixa salarial
          </div>
          <Input
            className="h-11 rounded-2xl bg-white/80"
            value={salaryRange}
            onChange={(e) => setSalaryRange(e.target.value)}
            placeholder="Ex: R$ 12k–18k"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          className="h-11 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={handleCreate}
          disabled={isDisabled || isSaving}
        >
          {isSaving ? "Salvando…" : "Criar vaga"}
        </Button>
      </div>
    </Card>
  );
}