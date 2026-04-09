import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BriefcaseBusiness, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminCompany = { id: string; name: string };

export type AdminJob = {
  id: string;
  title: string;
  description: string | null;
  salary_range: string | null;
  requirements: unknown;
  status: string;
  work_model: string;
  seniority_level: string;
  company?: { name: string } | null;
  company_id?: string;
};

function skillsToText(raw: unknown): string {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string").join(", ");
  if (typeof raw === "string") return raw;
  return "";
}

function skillsFromText(text: string): string[] {
  return text
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function JobUpsertDialog({
  companies,
  job,
  triggerVariant = "secondary",
  triggerLabel,
  onSaved,
}: {
  companies: AdminCompany[];
  job?: AdminJob;
  triggerVariant?: "secondary" | "default";
  triggerLabel?: string;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!job;

  const [open, setOpen] = useState(false);

  const [companyId, setCompanyId] = useState<string>(
    (job as any)?.company_id ?? ""
  );
  const [title, setTitle] = useState(job?.title ?? "");
  const [salaryRange, setSalaryRange] = useState(job?.salary_range ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [skillsText, setSkillsText] = useState(skillsToText(job?.requirements));
  const [workModel, setWorkModel] = useState(job?.work_model ?? "REMOTE");
  const [seniority, setSeniority] = useState(job?.seniority_level ?? "PL");
  const [status, setStatus] = useState(job?.status ?? "OPEN");

  const [saving, setSaving] = useState(false);

  const skillsPreview = useMemo(() => skillsFromText(skillsText), [skillsText]);

  async function save() {
    setSaving(true);
    try {
      if (!isEdit) {
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
          requirements: skillsFromText(skillsText),
          status,
          work_model: workModel,
          seniority_level: seniority,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hr_jobs")
          .update({
            company_id: companyId,
            title,
            salary_range: salaryRange || null,
            description: description || null,
            requirements: skillsFromText(skillsText),
            status,
            work_model: workModel,
            seniority_level: seniority,
          })
          .eq("id", job!.id);

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["hr_jobs"] });
      queryClient.invalidateQueries({ queryKey: ["hr_jobs_admin"] });
      onSaved?.();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          className={cn(
            "h-10 rounded-xl",
            triggerVariant === "secondary" && "hr-btn-secondary",
            triggerVariant === "default" &&
              "bg-[hsl(var(--electric-indigo))] text-white shadow-[0_18px_50px_-28px_rgba(111,0,255,0.85)] hover:shadow-[0_22px_60px_-32px_rgba(111,0,255,0.95)]"
          )}
          onClick={() => {
            setCompanyId((job as any)?.company_id ?? "");
            setTitle(job?.title ?? "");
            setSalaryRange(job?.salary_range ?? "");
            setDescription(job?.description ?? "");
            setSkillsText(skillsToText(job?.requirements));
            setWorkModel(job?.work_model ?? "REMOTE");
            setSeniority(job?.seniority_level ?? "PL");
            setStatus(job?.status ?? "OPEN");
          }}
        >
          {isEdit ? (
            <Pencil className="mr-2 h-4 w-4" />
          ) : (
            <BriefcaseBusiness className="mr-2 h-4 w-4" />
          )}
          {triggerLabel ?? (isEdit ? "Editar" : "Nova Vaga")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl rounded-[28px] p-0 hr-glass">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEdit ? "Editar vaga" : "Nova vaga"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Cliente (empresa)
              </div>
              <Select value={companyId} onValueChange={setCompanyId}>
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
                Status
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Aberta</SelectItem>
                  <SelectItem value="PAUSED">Pausada</SelectItem>
                  <SelectItem value="CLOSED">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Título da vaga
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                placeholder="Ex.: Engenheiro(a) de Software"
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Modelo de trabalho
              </div>
              <Select value={workModel} onValueChange={setWorkModel}>
                <SelectTrigger className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REMOTE">Remoto</SelectItem>
                  <SelectItem value="HYBRID">Híbrido</SelectItem>
                  <SelectItem value="ONSITE">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Nível
              </div>
              <Select value={seniority} onValueChange={setSeniority}>
                <SelectTrigger className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JR">Jr</SelectItem>
                  <SelectItem value="PL">Pl</SelectItem>
                  <SelectItem value="SR">Sr</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Faixa salarial (opcional)
              </div>
              <Input
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                placeholder="Ex.: R$ 10.000 – R$ 14.000"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Skills (separe por vírgula)
              </div>
              <Textarea
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className="min-h-[90px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                placeholder="React, TypeScript, SQL…"
              />
              {skillsPreview.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {skillsPreview.slice(0, 10).map((s) => (
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

            <div className="sm:col-span-2">
              <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Descrição (opcional)
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                placeholder="Contexto, responsabilidades, perfil…"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? "Ajuste os campos e salve para atualizar a vaga."
                : "Crie a vaga e publique no catálogo público automaticamente."}
            </div>
            <Button
              className={cn(
                "h-11 rounded-xl",
                "bg-[hsl(var(--electric-indigo))] text-white",
                "shadow-[0_12px_40px_-22px_rgba(111,0,255,0.75)]"
              )}
              disabled={saving || !companyId || !title.trim()}
              onClick={save}
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}