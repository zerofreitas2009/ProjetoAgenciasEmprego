import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wallet } from "lucide-react";

type PlacementRow = {
  id: string;
  salary_offered: number;
  fee_percentage: number;
  billing_status: "PENDING" | "PAID" | "CANCELLED" | string;
  start_date: string | null;
  created_at: string;
  job: {
    title: string;
    company: { name: string } | null;
  } | null;
  candidate: {
    full_name: string;
  } | null;
};

function feeValue(salary: number, feePct: number) {
  return salary * (feePct / 100);
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Finance() {
  const { session, isLoading } = useSession();
  const [savingId, setSavingId] = useState<string | null>(null);

  const roleQuery = useQuery({
    queryKey: ["hr_role"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_hr_role");
      if (error) throw error;
      return (data as string) ?? null;
    },
  });

  const monthRange = useMemo(() => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end };
  }, []);

  const placementsQuery = useQuery({
    queryKey: ["hr_placements_month", monthRange.start.toISOString()],
    enabled: !!session && roleQuery.data === "ADMIN",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_placements")
        .select(
          "id, salary_offered, fee_percentage, billing_status, start_date, created_at, job:hr_jobs!hr_placements_job_id_fkey(title, company:hr_companies!hr_jobs_company_id_fkey(name)), candidate:hr_candidates!hr_placements_candidate_id_fkey(full_name)"
        )
        .gte("created_at", monthRange.start.toISOString())
        .lt("created_at", monthRange.end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as PlacementRow[];
    },
  });

  const totals = useMemo(() => {
    const rows = placementsQuery.data ?? [];
    let previsto = 0;
    let realizado = 0;

    for (const r of rows) {
      const fee = feeValue(r.salary_offered ?? 0, r.fee_percentage ?? 0);
      if (r.billing_status !== "CANCELLED") previsto += fee;
      if (r.billing_status === "PAID") realizado += fee;
    }

    return { previsto, realizado };
  }, [placementsQuery.data]);

  if (!isLoading && !session) return <Navigate to="/login" replace />;
  if (roleQuery.data && roleQuery.data !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[hsl(var(--app-bg))] px-4 py-10">
        <div className="mx-auto w-full max-w-xl">
          <Card className="rounded-3xl border-black/5 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Acesso restrito
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              A página financeira está disponível apenas para usuários com role
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-black/5">
                ADMIN
              </span>
              .
            </p>
            <div className="mt-5">
              <Button
                className="h-11 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
                asChild
              >
                <Link to="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Dashboard
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  async function updateBillingStatus(id: string, next: string) {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from("hr_placements")
        .update({ billing_status: next })
        .eq("id", id);
      if (error) throw error;
      await placementsQuery.refetch();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--app-bg))] px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-700 shadow-sm ring-1 ring-black/5">
              <Wallet className="h-4 w-4 text-indigo-600" />
              Financeiro
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Contratações do mês
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Relatório simples de faturamento previsto vs realizado.
            </p>
          </div>

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
        </header>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
            <div className="text-xs font-semibold text-slate-700">
              Faturamento previsto
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {formatBRL(totals.previsto)}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Soma das fees não canceladas
            </p>
          </Card>

          <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-sm shadow-slate-900/5 backdrop-blur">
            <div className="text-xs font-semibold text-slate-700">
              Faturamento realizado
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {formatBRL(totals.realizado)}
            </div>
            <p className="mt-1 text-sm text-slate-600">Fees com status PAID</p>
          </Card>
        </div>

        <Card className="rounded-3xl border-black/5 bg-white/80 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Placements</h2>
              <p className="text-sm text-slate-600">
                {monthRange.start.toLocaleDateString()} – {monthRange.end.toLocaleDateString()}
              </p>
            </div>
            <div className="text-sm text-slate-600">
              {placementsQuery.isFetching
                ? "Carregando…"
                : `${(placementsQuery.data ?? []).length} registro(s)`}
            </div>
          </div>

          {placementsQuery.error ? (
            <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
              {(placementsQuery.error as any)?.message ??
                String(placementsQuery.error)}
            </div>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/5">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-slate-700">Cliente</TableHead>
                  <TableHead className="text-slate-700">Vaga</TableHead>
                  <TableHead className="text-slate-700">Candidato</TableHead>
                  <TableHead className="text-right text-slate-700">
                    Fee (R$)
                  </TableHead>
                  <TableHead className="text-slate-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(placementsQuery.data ?? []).length === 0 && !placementsQuery.isFetching ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10">
                      <div className="text-center">
                        <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-2xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                          Sem dados
                        </div>
                        <p className="text-sm text-slate-600">
                          Quando uma aplicação for marcada como HIRED, um placement
                          será criado automaticamente.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (placementsQuery.data ?? []).map((p) => {
                    const fee = feeValue(p.salary_offered ?? 0, p.fee_percentage ?? 0);
                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50/70">
                        <TableCell className="font-medium text-slate-900">
                          {p.job?.company?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {p.job?.title ?? "—"}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {p.candidate?.full_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          {formatBRL(fee)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={p.billing_status}
                            onValueChange={(v) => updateBillingStatus(p.id, v)}
                            disabled={savingId === p.id}
                          >
                            <SelectTrigger className="h-10 w-[160px] rounded-2xl bg-white/80">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">PENDING</SelectItem>
                              <SelectItem value="PAID">PAID</SelectItem>
                              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="mt-2">
                            <Badge className="rounded-full bg-white text-slate-700 ring-1 ring-black/5">
                              {p.fee_percentage}% de {formatBRL(p.salary_offered ?? 0)}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
