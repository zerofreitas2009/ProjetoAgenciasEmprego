import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

const MASTER_EMAIL = "zerofreitas2009@gmail.com";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

type TenantRow = {
  tenant_id: string;
  tenant_name: string;
  owner_email: string | null;
  plan_status: "trial" | "active" | string;
  created_at: string;
};

export default function MasterDashboard() {
  const { session, isLoading } = useSession();
  const [savingTenantId, setSavingTenantId] = useState<string | null>(null);

  const isMaster = (session?.user.email ?? "").toLowerCase() === MASTER_EMAIL;

  const tenantsQuery = useQuery({
    queryKey: ["hr_master_tenants"],
    enabled: !!session && isMaster,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hr_master_list_tenants");
      if (error) throw error;
      return (data ?? []) as TenantRow[];
    },
  });

  const stats = useMemo(() => {
    const rows = tenantsQuery.data ?? [];
    const trial = rows.filter((r) => (r.plan_status ?? "").toLowerCase() === "trial").length;
    const active = rows.filter((r) => (r.plan_status ?? "").toLowerCase() === "active").length;
    return { total: rows.length, trial, active };
  }, [tenantsQuery.data]);

  if (!isLoading && !session) return <Navigate to="/login" replace />;
  if (!isLoading && session && !isMaster) return <Navigate to="/dashboard" replace />;

  async function setPlan(tenantId: string, next: "trial" | "active") {
    setSavingTenantId(tenantId);
    try {
      const { error } = await supabase.rpc("hr_master_set_tenant_plan_status", {
        p_tenant_id: tenantId,
        p_plan_status: next,
      });
      if (error) throw error;
      await tenantsQuery.refetch();
    } catch (e: any) {
      toast({
        title: "Não foi possível atualizar o plano",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setSavingTenantId(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[hsl(var(--primary))]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-14 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 ring-1 ring-white/10">
                <Crown className="h-3.5 w-3.5" />
                Dashboard Master
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                Gestão de Tenants
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Controle de ativação do plano vitalício (active) por tenant.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-white/10 text-slate-100 ring-1 ring-white/10">
                Total: {stats.total}
              </Badge>
              <Badge className="rounded-full bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/15">
                Active: {stats.active}
              </Badge>
              <Badge className="rounded-full bg-amber-400/10 text-amber-200 ring-1 ring-amber-400/15">
                Trial: {stats.trial}
              </Badge>
              <Button
                className="h-10 rounded-xl hr-btn-primary"
                onClick={() => tenantsQuery.refetch()}
                disabled={tenantsQuery.isFetching}
              >
                Atualizar
              </Button>
            </div>
          </div>

          {tenantsQuery.error ? (
            <Card className="rounded-[28px] p-6 hr-glass">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/20">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold">Falha ao carregar</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {(tenantsQuery.error as any)?.message ?? String(tenantsQuery.error)}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="rounded-[28px] p-0 hr-glass">
            <div className="overflow-hidden rounded-[28px] ring-1 ring-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/5">
                    <TableHead className="text-slate-300">Agência</TableHead>
                    <TableHead className="text-slate-300">Responsável</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-right text-slate-300">
                      Vitalício
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tenantsQuery.data ?? []).map((t) => {
                    const isActive = (t.plan_status ?? "").toLowerCase() === "active";
                    const isSaving = savingTenantId === t.tenant_id;
                    return (
                      <TableRow key={t.tenant_id} className="hover:bg-white/5">
                        <TableCell className="font-medium text-slate-100">
                          {t.tenant_name}
                        </TableCell>
                        <TableCell className="text-slate-200">
                          {t.owner_email ?? "—"}
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge className="rounded-full bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/15">
                              active
                            </Badge>
                          ) : (
                            <Badge className="rounded-full bg-amber-400/10 text-amber-200 ring-1 ring-amber-400/15">
                              trial
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-3">
                            <Switch
                              checked={isActive}
                              disabled={isSaving}
                              onCheckedChange={(checked) =>
                                setPlan(t.tenant_id, checked ? "active" : "trial")
                              }
                            />
                            <span className="text-xs text-slate-300">
                              {isActive ? "Ativo" : "Trial"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
