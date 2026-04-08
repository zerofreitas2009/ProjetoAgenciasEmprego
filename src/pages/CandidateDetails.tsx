import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, UserRound } from "lucide-react";

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  skills: unknown;
  resume_url: string | null;
  created_at: string;
};

export default function CandidateDetails() {
  const { candidateId } = useParams();
  const { session, isLoading } = useSession();
  const [isOpening, setIsOpening] = useState(false);

  const candidateQuery = useQuery({
    queryKey: ["hr_candidate", candidateId],
    enabled: !!session && !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_candidates")
        .select("id, full_name, email, status, skills, resume_url, created_at")
        .eq("id", candidateId as string)
        .single();

      if (error) throw error;
      return data as Candidate;
    },
  });

  const candidate = useMemo(() => candidateQuery.data ?? null, [candidateQuery.data]);

  if (!isLoading && !session) return <Navigate to="/login" replace />;

  async function openResume() {
    if (!candidate?.resume_url) return;
    setIsOpening(true);
    try {
      const { data, error } = await supabase.storage
        .from("hr_resumes")
        .createSignedUrl(candidate.resume_url, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--app-bg))] px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            className="rounded-2xl bg-white/70 ring-1 ring-black/5 hover:bg-white"
            asChild
          >
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>

          <div className="text-xs text-slate-600">
            <Link className="underline" to="/">Início</Link>
          </div>
        </div>

        <Card className="rounded-3xl border-black/5 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
          {candidateQuery.isFetching ? (
            <div className="rounded-2xl bg-slate-50/70 px-4 py-3 text-sm text-slate-700 ring-1 ring-black/5">
              Carregando candidato…
            </div>
          ) : candidateQuery.error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
              {(candidateQuery.error as any)?.message ?? String(candidateQuery.error)}
            </div>
          ) : candidate ? (
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                      {candidate.full_name}
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">{candidate.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="rounded-full bg-indigo-600 text-white">
                        {candidate.status}
                      </Badge>
                      <Badge className="rounded-full bg-white text-slate-700 ring-1 ring-black/5">
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button
                  className="h-11 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={openResume}
                  disabled={!candidate.resume_url || isOpening}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {candidate.resume_url ? (isOpening ? "Abrindo…" : "Abrir currículo") : "Sem currículo"}
                </Button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50/70 p-5 ring-1 ring-black/5">
                  <div className="text-xs font-semibold text-slate-700">Skills</div>
                  <pre className="mt-2 overflow-auto rounded-2xl bg-white/80 p-3 text-xs text-slate-700 ring-1 ring-black/5">
                    {JSON.stringify(candidate.skills ?? [], null, 2)}
                  </pre>
                </div>

                <div className="rounded-3xl bg-slate-50/70 p-5 ring-1 ring-black/5">
                  <div className="text-xs font-semibold text-slate-700">Storage path</div>
                  <p className="mt-2 break-all text-sm text-slate-700">
                    {candidate.resume_url ?? "—"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    O botão usa <span className="font-mono">createSignedUrl</span> para abrir o PDF em uma nova aba.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
