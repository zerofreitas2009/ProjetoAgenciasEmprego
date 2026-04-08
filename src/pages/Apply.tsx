import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, ArrowLeft } from "lucide-react";

type PublicJob = {
  id: string;
  tenant_id: string;
  company_id: string;
  title: string;
  status: string;
};

function sanitizeFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned || "resume.pdf";
}

export default function Apply() {
  const { jobId } = useParams();
  const [job, setJob] = useState<PublicJob | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [file, setFile] = useState<File | null>(null);

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

  const canSubmit = !!job && fullName.trim().length >= 2 && email.includes("@");

  async function handleSubmit() {
    if (!job) return;
    setSubmitError(null);

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

      const { error: submitErr } = await supabase.rpc("hr_submit_application", {
        p_job_id: job.id,
        p_full_name: fullName.trim(),
        p_email: email.trim(),
        p_resume_url: objectPath,
        p_cover_letter: coverLetter.trim() || null,
        p_skills: [],
        p_current_stage: "Triagem",
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
                Envie seus dados e currículo. O arquivo será armazenado com
                segurança.
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
                    Obrigado! Seu currículo foi enviado e sua aplicação foi registrada.
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Nome completo</div>
                  <Input
                    className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    disabled={!job}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">E-mail</div>
                  <Input
                    className="h-11 rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    disabled={!job}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Mensagem (opcional)</div>
                  <Textarea
                    className="min-h-[120px] rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur-md dark:bg-white/5 dark:ring-white/10"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Conte brevemente por que você é um bom fit para a vaga."
                    disabled={!job}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Currículo (PDF)</div>
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
                          Apenas PDF
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

                <div className="sm:col-span-2">
                  <Button
                    className="h-11 w-full rounded-xl hr-btn-primary"
                    disabled={!canSubmit || isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? "Enviando…" : "Enviar candidatura"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}