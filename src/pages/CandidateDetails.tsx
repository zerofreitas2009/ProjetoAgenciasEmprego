import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, FileText, UserRound } from "lucide-react";

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  skills: unknown;
  resume_url: string | null;
  created_at: string;
};

type HrDocument = {
  id: string;
  document_type: "RG" | "CPF" | "Comprovante" | string;
  status: "PENDING" | "UPLOADED" | "VALIDATED" | string;
  file_url: string | null;
};

export default function CandidateDetails() {
  const { candidateId } = useParams();
  const { session, isLoading } = useSession();
  const [isOpening, setIsOpening] = useState(false);
  const [savingDocId, setSavingDocId] = useState<string | null>(null);

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

  const documentsQuery = useQuery({
    queryKey: ["hr_documents", candidateId],
    enabled: !!session && !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_documents")
        .select("id, document_type, status, file_url")
        .eq("candidate_id", candidateId as string)
        .order("document_type", { ascending: true });

      if (error) throw error;
      return (data ?? []) as HrDocument[];
    },
  });

  const candidate = useMemo(
    () => candidateQuery.data ?? null,
    [candidateQuery.data]
  );

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

  async function updateDocStatus(docId: string, status: string) {
    setSavingDocId(docId);
    try {
      const { error } = await supabase
        .from("hr_documents")
        .update({ status })
        .eq("id", docId);
      if (error) throw error;
      await documentsQuery.refetch();
    } finally {
      setSavingDocId(null);
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <Card className="rounded-[28px] p-6 hr-glass">
          {candidateQuery.isFetching ? (
            <div className="space-y-3">
              <Skeleton className="h-7 w-1/2 rounded-xl" />
              <Skeleton className="h-4 w-1/3 rounded-xl" />
              <Skeleton className="h-10 w-40 rounded-xl" />
            </div>
          ) : candidateQuery.error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
              {(candidateQuery.error as any)?.message ?? String(candidateQuery.error)}
            </div>
          ) : candidate ? (
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                      {candidate.full_name}
                    </h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {candidate.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-violet-500/15">
                        {candidate.status}
                      </Badge>
                      <Badge className="rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button
                  className="h-11 rounded-xl hr-btn-primary"
                  onClick={openResume}
                  disabled={!candidate.resume_url || isOpening}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {candidate.resume_url
                    ? isOpening
                      ? "Abrindo…"
                      : "Abrir currículo"
                    : "Sem currículo"}
                </Button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Skills
                  </div>
                  <pre className="mt-2 overflow-auto rounded-3xl bg-white/70 p-3 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                    {JSON.stringify(candidate.skills ?? [], null, 2)}
                  </pre>
                </div>

                <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Storage path
                  </div>
                  <p className="mt-2 break-all text-sm text-slate-700 dark:text-slate-200">
                    {candidate.resume_url ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="rounded-[28px] p-5 hr-glass">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                <ClipboardCheck className="h-4 w-4" />
                Onboarding
              </div>
              <h2 className="mt-3 text-base font-semibold">
                Checklist de documentos
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Gerado automaticamente quando a aplicação vira HIRED.
              </p>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {(documentsQuery.data ?? []).length} item(ns)
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8FAFC]/80 dark:bg-white/5">
                  <TableHead className="text-slate-600 dark:text-slate-300">
                    Documento
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">
                    Status
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">
                    Arquivo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentsQuery.isFetching ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={3}>
                        <Skeleton className="h-8 w-full rounded-xl" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : documentsQuery.error ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8">
                      <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
                        {(documentsQuery.error as any)?.message ??
                          String(documentsQuery.error)}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (documentsQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Nenhum item ainda.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  (documentsQuery.data ?? []).map((d) => (
                    <TableRow
                      key={d.id}
                      className="transition hover:bg-[#F8FAFC]/80 dark:hover:bg-white/5"
                    >
                      <TableCell className="font-medium">
                        {d.document_type}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={d.status}
                          onValueChange={(v) => updateDocStatus(d.id, v)}
                          disabled={savingDocId === d.id}
                        >
                          <SelectTrigger className="h-10 w-[170px] rounded-xl bg-white/70 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                            <SelectItem value="UPLOADED">UPLOADED</SelectItem>
                            <SelectItem value="VALIDATED">VALIDATED</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                        {d.file_url ? (
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-white/20 dark:hover:decoration-white/40"
                          >
                            Abrir
                          </a>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}