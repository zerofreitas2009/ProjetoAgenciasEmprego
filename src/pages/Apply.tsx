import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2 } from "lucide-react";

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
    <div className="min-h-screen bg-[hsl(var(--app-bg))] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-sm ring-1 ring-black/5">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <span className="text-sm font-semibold tracking-wide text-slate-800">
              HR SaaS
            </span>
          </div>
          <Button
            variant="secondary"
            className="rounded-2xl bg-white/70 ring-1 ring-black/5 hover:bg-white"
            asChild
          >
            <Link to="/">Voltar</Link>
          </Button>
        </header>

        <Card className="rounded-3xl border-black/5 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Candidatura
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Envie seus dados e currículo. O arquivo será armazenado com
                segurança em <span className="font-mono">hr_resumes</span>.
              </p>
            </div>

            {job ? (
              <Badge className="mt-2 w-fit rounded-full bg-emerald-600 text-white sm:mt-0">
                {job.title}
              </Badge>
            ) : null}
          </div>

          {isLoadingJob ? (
            <div className="mt-5 rounded-2xl bg-slate-50/70 px-4 py-3 text-sm text-slate-700 ring-1 ring-black/5">
              Carregando vaga…
            </div>
          ) : jobError ? (
            <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
              {jobError}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-3xl bg-emerald-50 p-6 text-emerald-900 ring-1 ring-emerald-200">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-base font-semibold">Candidatura enviada</div>
                  <p className="mt-1 text-sm text-emerald-800/80">
                    Obrigado! Seu currículo foi enviado e sua aplicação foi registrada.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {submitError ? (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                  {submitError}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold text-slate-700">Nome completo</div>
                  <Input
                    className="h-11 rounded-2xl bg-white/80"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    disabled={!job}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold text-slate-700">E-mail</div>
                  <Input
                    className="h-11 rounded-2xl bg-white/80"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    disabled={!job}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold text-slate-700">Carta de apresentação (opcional)</div>
                  <Textarea
                    className="min-h-[120px] rounded-2xl bg-white/80"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Conte rapidamente por que você é uma boa opção para a vaga."
                    disabled={!job}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="text-xs font-semibold text-slate-700">Currículo (PDF)</div>

                  <label className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-black/5 transition hover:bg-white">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {file ? file.name : "Clique para selecionar um PDF"}
                        </div>
                        <div className="truncate text-xs text-slate-600">
                          {file ? `${Math.round(file.size / 1024)} KB` : "Apenas PDF"}
                        </div>
                      </div>
                    </div>
                    <FileText className="h-4 w-4 text-slate-500" />
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

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  className="h-11 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Enviando…" : "Enviar candidatura"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Área do recrutador? <Link className="underline" to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}