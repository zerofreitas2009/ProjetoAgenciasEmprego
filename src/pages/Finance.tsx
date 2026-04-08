import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";

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
    <Layout>
      {roleQuery.data && roleQuery.data !== "ADMIN" ? (
        <Card className="rounded-3xl border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h1 className="text-2xl font-semibold tracking-tight">Acesso restrito</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            A página financeira está disponível apenas para usuários com role
            <span className="ml-2 rounded-full bg-white/60 px-2 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
              ADMIN
            </span>
            .
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="rounded-2xl border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Faturamento previsto
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {placementsQuery.isFetching ? (
                  <Skeleton className="h-8 w-44 rounded-xl" />
                ) : (
                  formatBRL(totals.previsto)
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Soma das fees não canceladas
              </p>
            </Card>

            <Card className="rounded-2xl border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Faturamento realizado
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {placementsQuery.isFetching ? (
                  <Skeleton className="h-8 w-44 rounded-xl" />
                ) : (
                  formatBRL(totals.realizado)
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Fees com status PAID
              </p>
            </Card>
          </div>

          <Card className="rounded-3xl border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Placements do mês</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {monthRange.start.toLocaleDateString()} – {monthRange.end.toLocaleDateString()}
                </p>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {placementsQuery.isFetching
                  ? "Carregando…"
                  : `${(placementsQuery.data ?? []).length} registro(s)`}
              </div>
            </div>

            {placementsQuery.error ? (
              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
                {(placementsQuery.error as any)?.message ??
                  String(placementsQuery.error)}
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 dark:bg-white/5">
                    <TableHead className="text-slate-600 dark:text-slate-300">
                      Cliente
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">
                      Vaga
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">
                      Candidato
                    </TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-300">
                      Fee
                    </TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placementsQuery.isFetching ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-8 w-full rounded-xl" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (placementsQuery.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Quando uma aplicação for marcada como HIRED, um placement
                          será criado automaticamente.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (placementsQuery.data ?? []).map((p) => {
                      const fee = feeValue(
                        p.salary_offered ?? 0,
                        p.fee_percentage ?? 0
                      );
                      return (
                        <TableRow
                          key={p.id}
                          className="transition hover:bg-slate-50/70 dark:hover:bg-white/5"
                        >
                          <TableCell className="font-medium">
                            {p.job?.company?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-200">
                            {p.job?.title ?? "—"}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-200">
                            {p.candidate?.full_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatBRL(fee)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={p.billing_status}
                              onValueChange={(v) => updateBillingStatus(p.id, v)}
                              disabled={savingId === p.id}
                            >
                              <SelectTrigger className="h-10 w-[160px] rounded-xl bg-white/70 dark:bg-white/5">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">PENDING</SelectItem>
                                <SelectItem value="PAID">PAID</SelectItem>
                                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="mt-2">
                              <Badge className="rounded-full bg-white text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
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
      )}
    </Layout>
  );
}
