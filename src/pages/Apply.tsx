import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PublicJob = {
  id: string;
  tenant_id: string;
  company_id: string;
  title: string;
  status: string;
  requirements: unknown;
};

function sanitizeFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned || "resume.pdf";
}

function parseSkills(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    return raw
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function Apply() {
  const { jobId } = useParams();
  const [job, setJob] = useState<PublicJob | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Step 2
  const [skillQuery, setSkillQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<string>("");
  const [salaryExpectation, setSalaryExpectation] = useState<string>("");
  const [bio, setBio] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!jobId) return;
      setIsLoadingJob(true);
      setJobError(null);
      try {
        const { data, error } = await supabase.rpc("hr_get_public_job", {
          p_job_id: jobId,
        });
        if (error) throw error;
        const row = (Array.isArray(data) ? data[0] : data) as any;
        if (!row?.id) throw new Error("Vaga não encontrada ou encerrada.");
        if (cancelled) return;
        setJob(row as PublicJob);
      } catch (e: any) {
        if (cancelled) return;
        setJobError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setIsLoadingJob(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const jobSkills = useMemo(() => parseSkills(job?.requirements), [job?.requirements]);
  const allowedSkillsLower = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of jobSkills) map.set(s.toLowerCase(), s);
    return map;
  }, [jobSkills]);

  const suggestions = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    const selected = new Set(selectedSkills.map((s) => s.toLowerCase()));
    const list = (jobSkills.length ? jobSkills : [])
      .filter((s) => !selected.has(s.toLowerCase()))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 18);
    return list;
  }, [jobSkills, selectedSkills, skillQuery]);

  const step1Valid =
    !!job &&
    fullName.trim().length >= 2 &&
    email.includes("@") &&
    isValidUrl(linkedinUrl.trim()) &&
    !!file;

  const step2Valid = selectedSkills.length > 0 && !!seniority;

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (!trimmed) return;

    // Prefer the canonical spelling from the job requirements.
    const canonical = allowedSkillsLower.get(trimmed.toLowerCase()) ?? trimmed;

    if (jobSkills.length && !allowedSkillsLower.has(canonical.toLowerCase())) return;
    if (selectedSkills.some((s) => s.toLowerCase() === canonical.toLowerCase())) return;

    setSelectedSkills((prev) => [...prev, canonical]);
    setSkillQuery("");
  }

  function removeSkill(skill: string) {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
  }

  async function handleSubmit() {
    if (!job) return;
    setSubmitError(null);

    if (!step1Valid) {
      setSubmitError("Complete o Passo 1 para continuar.");
      return;
    }

    if (!step2Valid) {
      setSubmitError("Selecione suas competências e informe seu nível.");
      return;
    }

    if (!file) {
      setSubmitError("Envie seu currículo (PDF) para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const extOk =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!extOk) throw new Error("Envie um arquivo PDF.");

      const objectPath = `${job.tenant_id}/${job.id}/${crypto.randomUUID()}/${sanitizeFilename(
        file.name
      )}`;

      const { error: uploadErr } = await supabase.storage
        .from("hr_resumes")
        .upload(objectPath, file, {
          upsert: false,
          contentType: file.type || "application/pdf",
        });
      if (uploadErr) throw uploadErr;

      const salary = salaryExpectation.trim()
        ? Number(String(salaryExpectation).replace(/[^0-9.]/g, ""))
        : null;
      if (salary != null && (!Number.isFinite(salary) || salary < 0)) {
        throw new Error("Informe uma pretensão salarial válida.");
      }

      const { error: submitErr } = await supabase.rpc("hr_submit_application", {
        p_job_id: job.id,
        p_full_name: fullName.trim(),
        p_email: email.trim(),
        p_resume_url: objectPath,
        p_cover_letter: coverLetter.trim() || null,
        p_skills: selectedSkills,
        p_current_stage: "Triagem",
        p_linkedin_url: linkedinUrl.trim(),
        p_seniority_level: seniority,
        p_salary_expectation: salary,
        p_bio: bio.trim() || null,
      });
      if (submitErr) throw submitErr;

      setSuccess(true);
    } catch (e: any) {
      setSubmitError(e?.message ?? String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 hr-glass"
            title="Home"
          >
            <HrLogo size="sm" />
          </Link>

          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Voltar
          </Link>
        </header>

        <Card className="rounded-[28px] p-6 hr-glass">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Candidatura
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Um formulário curto, em duas etapas — para você concluir rápido.
              </p>
            </div>

            {job ? (
              <Badge className="mt-2 w-fit rounded-full bg-[#10B981] text-white shadow-lg shadow-emerald-500/20 sm:mt-0">
                {job.title}
              </Badge>
            ) : null}
          </div>

          {isLoadingJob ? (
            <div className="mt-5 rounded-2xl bg-[#F8FAFC]/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
              Carregando vaga…
            </div>
          ) : jobError ? (
            <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
              {jobError}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-3xl bg-emerald-50 p-6 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900/50">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white ring-1 ring-emerald-200 dark:bg-white/10 dark:ring-white/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-base font-semibold">Candidatura enviada</div>
                  <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
                    Obrigado! Sua candidatura foi registrada.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {submitError ? (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
                  {submitError}
                </div>
              ) : null}

              {/* Stepper */}
              <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
                      step === 1
                        ? "bg-[hsl(var(--primary))]/10 ring-1 ring-[hsl(var(--primary))]/15"
                        : "hover:bg-white/70 dark:hover:bg-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-2xl text-sm font-semibold",
                        step === 1
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "bg-white/70 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
                      )}
                    >
                      1
                    </span>
                    <div>
                      <div className="text-sm font-semibold">Dados & Currículo</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Básico para começar
                      </div>
                    </div>
                  </button>

                  <ChevronRight className="hidden h-4 w-4 text-slate-400 sm:block" />

                  <button
                    type="button"
                    onClick={() => (step1Valid ? setStep(2) : null)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
                      !step1Valid && "opacity-60",
                      step === 2
                        ? "bg-[hsl(var(--primary))]/10 ring-1 ring-[hsl(var(--primary))]/15"
                        : "hover:bg-white/70 dark:hover:bg-white/10"
                    )}
                    aria-disabled={!step1Valid}
                    title={!step1Valid ? "Complete o Passo 1" : ""}
                  >
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-2xl text-sm font-semibold",
                        step === 2
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "bg-white/70 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
                      )}
                    >
                      2
                    </span>
                    <div>
                      <div className="text-sm font-semibold">Skills & Experiência</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Nível e competências
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full bg-[hsl(var(--primary))] transition-all",
                      step === 1 ? "w-1/2" : "w-full"
                    )}
                  />
                </div>
              </div>

              {step === 1 ? (
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Nome completo
                      </div>
                      <Input
                        className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome"
                        disabled={!job}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        E-mail
                      </div>
                      <Input
                        className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@exemplo.com"
                        disabled={!job}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          LinkedIn
                        </div>
                        <Badge className="rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                          obrigatório
                        </Badge>
                      </div>
                      <Input
                        type="url"
                        className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://www.linkedin.com/in/seu-perfil"
                        disabled={!job}
                      />
                      {linkedinUrl.trim() && !isValidUrl(linkedinUrl.trim()) ? (
                        <div className="text-xs text-rose-600 dark:text-rose-300">
                          Informe uma URL válida.
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Mensagem (opcional)
                      </div>
                      <Textarea
                        className="min-h-[96px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Se quiser, deixe um recado rápido para o recrutador."
                        disabled={!job}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Currículo (PDF)
                      </div>
                      <label className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-slate-200 backdrop-blur-md transition hover:bg-white dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                            <Upload className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {file ? file.name : "Selecionar arquivo"}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                              PDF
                            </div>
                          </div>
                        </div>
                        <FileText className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          disabled={!job}
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Passo 1 de 2
                    </div>
                    <Button
                      className="h-11 rounded-xl hr-btn-primary"
                      disabled={!step1Valid}
                      onClick={() => setStep(2)}
                    >
                      Continuar
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Seleção de Skills</div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Selecione as competências que mais representam você.
                        </p>
                      </div>
                      <Badge className="rounded-full bg-[#FB923C]/10 text-[#FB923C] ring-1 ring-[#FB923C]/15 dark:bg-[#FB923C]/15">
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        match
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedSkills.length === 0 ? (
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          Nenhuma skill selecionada.
                        </div>
                      ) : (
                        selectedSkills.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => removeSkill(s)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-sm text-slate-800 ring-1 ring-slate-200 transition hover:bg-white dark:bg-white/10 dark:text-slate-100 dark:ring-white/10"
                            title="Remover"
                          >
                            {s}
                            <X className="h-4 w-4 opacity-70" />
                          </button>
                        ))
                      )}
                    </div>

                    <div className="mt-3 grid gap-2">
                      <Input
                        className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                        value={skillQuery}
                        onChange={(e) => setSkillQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill(skillQuery);
                          }
                        }}
                        placeholder={
                          jobSkills.length
                            ? "Buscar skills da vaga…"
                            : "Digite uma skill e pressione Enter…"
                        }
                      />

                      {jobSkills.length ? (
                        <div className="flex flex-wrap gap-2">
                          {suggestions.length === 0 ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Sem sugestões.
                            </span>
                          ) : (
                            suggestions.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => addSkill(s)}
                                className="rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 transition hover:bg-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white"
                              >
                                {s}
                              </button>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Se a vaga não tiver skills cadastradas, você pode inserir as suas.
                        </div>
                      )}

                      {jobSkills.length ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Dica: selecione skills da vaga para melhorar o match.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Nível
                      </div>
                      <Select value={seniority} onValueChange={setSeniority}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Júnior">Júnior</SelectItem>
                          <SelectItem value="Pleno">Pleno</SelectItem>
                          <SelectItem value="Sênior">Sênior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Pretensão salarial (opcional)
                      </div>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500 dark:text-slate-400">
                          R$
                        </div>
                        <Input
                          inputMode="numeric"
                          className="h-11 rounded-2xl bg-white/70 pl-10 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                          value={salaryExpectation}
                          onChange={(e) => setSalaryExpectation(e.target.value)}
                          placeholder="Ex.: 8500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Bio / Resumo
                      </div>
                      <Textarea
                        className="min-h-[96px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Escreva um resumo rápido (3–4 linhas) sobre sua experiência."
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      variant="secondary"
                      className="h-11 rounded-xl hr-btn-secondary"
                      onClick={() => setStep(1)}
                    >
                      Voltar
                    </Button>

                    <Button
                      className="h-11 rounded-xl hr-btn-primary"
                      disabled={isSubmitting || !step1Valid || !step2Valid}
                      onClick={handleSubmit}
                    >
                      {isSubmitting ? "Enviando…" : "Enviar candidatura"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}