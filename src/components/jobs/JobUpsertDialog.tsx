import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { RichTextEditor, sanitizeRichText } from "@/components/forms/RichTextEditor";
import {
  JobDnaRadarPreview,
  type DnaSkill,
  type DnaSkillLevel,
} from "@/components/jobs/JobDnaRadarPreview";
import {
  BriefcaseBusiness,
  Pencil,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ShieldOff,
} from "lucide-react";

export type AdminCompany = { id: string; name: string };

export type AdminJob = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  salary_range: string | null;
  requirements: unknown;
  dna_skills: unknown;
  status: string;
  work_model: string;
  seniority_level: string;
  application_deadline: string | null;
  confidential: boolean;
  company?: { name: string } | null;
};

function skillsFromRequirements(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    return raw
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function dnaSkillsFromRaw(raw: unknown): DnaSkill[] {
  if (!Array.isArray(raw)) return [];
  const list: DnaSkill[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as any;
    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    const level = String(obj.level ?? "").toUpperCase();
    if (!name) continue;
    if (level === "BASIC" || level === "INTERMEDIATE" || level === "ADVANCED") {
      list.push({ name, level } as DnaSkill);
    }
  }
  return list.slice(0, 5);
}

function normalizeSkillName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 32);
}

const STEPS = [
  { id: "basic", label: "Informações" },
  { id: "dna", label: "DNA Técnico" },
  { id: "publish", label: "Publicação" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function statusOptions(isEdit: boolean) {
  return isEdit
    ? [
        { value: "DRAFT", label: "Rascunho" },
        { value: "OPEN", label: "Ativa" },
        { value: "PAUSED", label: "Pausada" },
        { value: "CLOSED", label: "Finalizada" },
      ]
    : [
        { value: "DRAFT", label: "Rascunho" },
        { value: "OPEN", label: "Ativa" },
      ];
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
  const [step, setStep] = useState<StepId>("basic");

  const [companyId, setCompanyId] = useState(job?.company_id ?? "");
  const [title, setTitle] = useState(job?.title ?? "");
  const [workModel, setWorkModel] = useState(job?.work_model ?? "REMOTE");
  const [seniority, setSeniority] = useState(job?.seniority_level ?? "PL");
  const [salaryRange, setSalaryRange] = useState(job?.salary_range ?? "");
  const [descriptionHtml, setDescriptionHtml] = useState(job?.description ?? "");

  const [dnaSkills, setDnaSkills] = useState<DnaSkill[]>(
    dnaSkillsFromRaw(job?.dna_skills)
  );

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<DnaSkillLevel>("INTERMEDIATE");

  const [status, setStatus] = useState(job?.status ?? "DRAFT");
  const [deadline, setDeadline] = useState(job?.application_deadline ?? "");
  const [confidential, setConfidential] = useState(!!job?.confidential);

  const [saving, setSaving] = useState(false);

  const stepIndex = useMemo(
    () => STEPS.findIndex((s) => s.id === step),
    [step]
  );

  const canGoNext = useMemo(() => {
    if (step === "basic") {
      return !!companyId && !!title.trim();
    }
    if (step === "dna") {
      return dnaSkills.length > 0;
    }
    return true;
  }, [companyId, title, step, dnaSkills.length]);

  const saveLabel = useMemo(() => {
    const s = (status || "").toUpperCase();
    if (s === "OPEN") return "Salvar e Publicar";
    return "Salvar rascunho";
  }, [status]);

  function resetFromJob() {
    setStep("basic");
    setCompanyId(job?.company_id ?? "");
    setTitle(job?.title ?? "");
    setWorkModel(job?.work_model ?? "REMOTE");
    setSeniority(job?.seniority_level ?? "PL");
    setSalaryRange(job?.salary_range ?? "");
    setDescriptionHtml(job?.description ?? "");
    setDnaSkills(dnaSkillsFromRaw(job?.dna_skills));
    setNewSkillName("");
    setNewSkillLevel("INTERMEDIATE");
    setStatus(job?.status ?? "DRAFT");
    setDeadline(job?.application_deadline ?? "");
    setConfidential(!!job?.confidential);
  }

  function addSkill() {
    const name = normalizeSkillName(newSkillName);
    if (!name) return;
    if (dnaSkills.length >= 5) return;

    const exists = dnaSkills.some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (exists) return;

    setDnaSkills((prev) => [...prev, { name, level: newSkillLevel }]);
    setNewSkillName("");
    setNewSkillLevel("INTERMEDIATE");
  }

  function updateSkill(i: number, patch: Partial<DnaSkill>) {
    setDnaSkills((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );
  }

  function removeSkill(i: number) {
    setDnaSkills((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    try {
      const safeDescription = sanitizeRichText(descriptionHtml || "");
      const requirements = dnaSkills.map((s) => s.name);
      const payload = {
        company_id: companyId,
        title: title.trim(),
        work_model: workModel,
        seniority_level: seniority,
        salary_range: salaryRange.trim() ? salaryRange.trim() : null,
        description: safeDescription || null,
        requirements,
        dna_skills: dnaSkills,
        status,
        application_deadline: deadline ? deadline : null,
        confidential,
      } as const;

      if (!isEdit) {
        const { data: tenantId, error: tenantErr } = await supabase.rpc(
          "get_hr_tenant"
        );
        if (tenantErr) throw tenantErr;

        const { error } = await supabase.from("hr_jobs").insert({
          tenant_id: tenantId as string,
          ...payload,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hr_jobs")
          .update(payload)
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) resetFromJob();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          className={cn(
            "h-10 rounded-xl",
            triggerVariant === "secondary" && "hr-btn-secondary",
            triggerVariant === "default" &&
              "bg-[hsl(var(--electric-indigo))] text-white shadow-[0_18px_50px_-28px_rgba(111,0,255,0.85)] hover:shadow-[0_22px_60px_-32px_rgba(111,0,255,0.95)]"
          )}
        >
          {isEdit ? (
            <Pencil className="mr-2 h-4 w-4" />
          ) : (
            <BriefcaseBusiness className="mr-2 h-4 w-4" />
          )}
          {triggerLabel ?? (isEdit ? "Editar" : "Nova Vaga")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl rounded-[30px] p-0 hr-glass">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEdit ? "Editar vaga" : "Nova vaga"}
            </DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => {
                const active = s.id === step;
                const done = i < stepIndex;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      // allow going back freely; forward only if current step is valid
                      if (i <= stepIndex) setStep(s.id);
                      else if (canGoNext) setStep(s.id);
                    }}
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ring-1 transition",
                      active
                        ? "bg-[hsl(var(--electric-indigo))] text-white ring-[hsl(var(--electric-indigo))]/40"
                        : done
                          ? "bg-white/70 text-slate-800 ring-slate-200 hover:bg-white dark:bg-white/10 dark:text-slate-100 dark:ring-white/10"
                          : "bg-white/50 text-slate-600 ring-slate-200/80 hover:bg-white/70 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] ring-1",
                        active
                          ? "bg-white/15 ring-white/20"
                          : done
                            ? "bg-[hsl(var(--electric-indigo))]/10 text-[hsl(var(--electric-indigo))] ring-[hsl(var(--electric-indigo))]/20"
                            : "bg-white/60 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
                      )}
                    >
                      {i + 1}
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                IA Matchmaker-ready
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card className="rounded-[28px] p-5 hr-glass">
              {step === "basic" ? (
                <div className="space-y-4">
                  <div>
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

                  <div className="grid gap-3 sm:grid-cols-2">
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

                    <div>
                      <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Faixa salarial
                      </div>
                      <Input
                        value={salaryRange}
                        onChange={(e) => setSalaryRange(e.target.value)}
                        className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                        placeholder="Ex.: R$ 10.000 – R$ 14.000"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Descrição (Rich Text)
                    </div>
                    <RichTextEditor
                      value={descriptionHtml}
                      onChange={setDescriptionHtml}
                      placeholder="Contexto, responsabilidades, stack e diferenciais…"
                    />
                  </div>
                </div>
              ) : step === "dna" ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          DNA Técnico • 5 Skills principais
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Defina as habilidades centrais e o nível exigido para o
                          match e o Radar.
                        </p>
                      </div>
                      <div className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                        {dnaSkills.length}/5
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
                    <div>
                      <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Skill
                      </div>
                      <Input
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                        placeholder="Ex.: React"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                      />
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Nível exigido
                      </div>
                      <Select
                        value={newSkillLevel}
                        onValueChange={(v) => setNewSkillLevel(v as DnaSkillLevel)}
                      >
                        <SelectTrigger className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BASIC">Básico</SelectItem>
                          <SelectItem value="INTERMEDIATE">Intermediário</SelectItem>
                          <SelectItem value="ADVANCED">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:pt-[26px]">
                      <Button
                        type="button"
                        className={cn(
                          "h-11 rounded-xl px-4",
                          "bg-[hsl(var(--electric-indigo))] text-white",
                          "shadow-[0_14px_46px_-28px_rgba(111,0,255,0.85)]",
                          "transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
                        )}
                        onClick={addSkill}
                        disabled={dnaSkills.length >= 5 || !newSkillName.trim()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dnaSkills.length === 0 ? (
                      <div className="rounded-3xl bg-white/60 p-5 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                        Adicione de 1 a 5 skills para construir o DNA técnico.
                      </div>
                    ) : (
                      dnaSkills.map((s, i) => (
                        <div
                          key={s.name}
                          className="flex flex-col gap-2 rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {s.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                              Skill #{i + 1}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Select
                              value={s.level}
                              onValueChange={(v) =>
                                updateSkill(i, { level: v as DnaSkillLevel })
                              }
                            >
                              <SelectTrigger className="h-10 w-[190px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BASIC">Básico</SelectItem>
                                <SelectItem value="INTERMEDIATE">Intermediário</SelectItem>
                                <SelectItem value="ADVANCED">Avançado</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              type="button"
                              variant="secondary"
                              className="h-10 rounded-xl hr-btn-secondary"
                              onClick={() => removeSkill(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {dnaSkills.length > 0 ? (
                    <div className="rounded-3xl border border-[hsl(var(--electric-indigo))]/20 bg-[hsl(var(--electric-indigo))]/5 p-4 text-sm text-slate-700 dark:text-slate-200">
                      Essas 5 skills (com nível) alimentam o Radar e guiam o match.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Configurações de publicação
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Defina visibilidade, status e a data limite para candidaturas.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Status
                      </div>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions(isEdit).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Data limite
                      </div>
                      <Input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-start gap-3 rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                        <Checkbox
                          checked={confidential}
                          onCheckedChange={(v) => setConfidential(v === true)}
                          id="confidential"
                          className="mt-0.5"
                        />
                        <label htmlFor="confidential" className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                            <ShieldOff className="h-4 w-4 text-[hsl(var(--electric-indigo))]" />
                            Vaga confidencial
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Oculta o nome do cliente no catálogo público.
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/60 p-4 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                    Dica: vagas com data limite expirada não aparecem no Job Board.
                  </div>
                </div>
              )}
            </Card>

            {/* Right rail: always show radar */}
            <div className="space-y-4">
              <JobDnaRadarPreview skills={dnaSkills} />

              <Card className="rounded-[28px] p-5 hr-glass">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Checklist rápido
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span>Título + Cliente</span>
                    <span className={cn("font-semibold", title.trim() && companyId ? "text-emerald-600 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")}>
                      {title.trim() && companyId ? "OK" : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>DNA (skills)</span>
                    <span className={cn("font-semibold", dnaSkills.length ? "text-emerald-600 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")}>
                      {dnaSkills.length ? `${dnaSkills.length}/5` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Status</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {statusOptions(true).find((x) => x.value === status)?.label ?? status}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-xl hr-btn-secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-xl hr-btn-secondary"
                onClick={() => {
                  if (stepIndex <= 0) return;
                  setStep(STEPS[stepIndex - 1].id);
                }}
                disabled={stepIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-xl hr-btn-secondary"
                onClick={() => {
                  if (stepIndex >= STEPS.length - 1) return;
                  if (!canGoNext) return;
                  setStep(STEPS[stepIndex + 1].id);
                }}
                disabled={stepIndex >= STEPS.length - 1 || !canGoNext}
              >
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <Button
              className={cn(
                "h-11 rounded-xl px-6",
                "bg-[hsl(var(--electric-indigo))] text-white",
                "shadow-[0_18px_60px_-34px_rgba(111,0,255,0.95)]",
                "transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
              )}
              onClick={save}
              disabled={saving || !companyId || !title.trim() || dnaSkills.length === 0}
            >
              {saving ? "Salvando…" : saveLabel}
            </Button>
          </div>

          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Observação: a vaga só aparece no Job Board quando estiver <b>Ativa</b> e
            dentro da data limite (se definida).
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
