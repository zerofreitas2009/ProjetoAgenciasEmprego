import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Sparkles,
  UserRound,
  BriefcaseBusiness,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { toast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

type Me = {
  id: string;
  tenant_id: string;
  job_title: string | null;
  avatar_data_url: string | null;
  onboarding_completed: boolean;
};

type Tenant = {
  id: string;
  name: string;
  logo_data_url: string | null;
};

export default function Welcome() {
  const { session, isLoading } = useSession();
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);

  const tenantIdQuery = useQuery({
    queryKey: ["hr_tenant_id"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_hr_tenant");
      if (error) throw error;
      return data as string;
    },
  });

  const meQuery = useQuery({
    queryKey: ["hr_me_for_onboarding"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_profiles")
        .select("id, tenant_id, job_title, avatar_data_url, onboarding_completed")
        .eq("id", session!.user.id)
        .single();
      if (error) throw error;
      return data as Me;
    },
  });

  const tenantQuery = useQuery({
    queryKey: ["hr_tenant_for_onboarding", tenantIdQuery.data],
    enabled: !!session && !!tenantIdQuery.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_tenants")
        .select("id, name, logo_data_url")
        .eq("id", tenantIdQuery.data as string)
        .single();
      if (error) throw error;
      return data as Tenant;
    },
  });

  const jobsCountQuery = useQuery({
    queryKey: ["hr_jobs_count"],
    enabled: !!session,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("hr_jobs")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const profileDone = useMemo(() => {
    const me = meQuery.data;
    if (!me) return false;
    return !!me.avatar_data_url && !!me.job_title;
  }, [meQuery.data]);

  const brandDone = useMemo(() => {
    const t = tenantQuery.data;
    if (!t) return false;
    return !!t.logo_data_url;
  }, [tenantQuery.data]);

  const firstJobDone = (jobsCountQuery.data ?? 0) > 0;

  const allDone = profileDone && brandDone && firstJobDone;

  if (!isLoading && !session) return <Navigate to="/login" replace />;

  async function dismissAndGo() {
    if (!session) return;

    try {
      await supabase
        .from("hr_profiles")
        .update({ onboarding_completed: true })
        .eq("id", session.user.id);
    } finally {
      navigate("/dashboard", { replace: true });
    }
  }

  async function seedDemoData() {
    if (!session) return;
    const tenantId = tenantIdQuery.data;
    if (!tenantId) return;

    setSeeding(true);
    try {
      const { data: existingJobs, error: existingErr } = await supabase
        .from("hr_jobs")
        .select("id")
        .ilike("title", "%Demo:%")
        .limit(1);
      if (existingErr) throw existingErr;
      if ((existingJobs ?? []).length > 0) {
        toast({
          title: "Dados de teste já existem",
          description: "Seu tenant já possui uma vaga demo. Pode seguir explorando o dashboard.",
        });
        return;
      }

      const { data: companyRow, error: companyErr } = await supabase
        .from("hr_companies")
        .insert({
          tenant_id: tenantId,
          name: "Nautilus Tech (Demo)",
          cpf_cnpj: "12.345.678/0001-90",
          contact_email: `demo.${tenantId.slice(0, 6)}@nautilus.tech`,
          contact_phone: "(11) 91234-5678",
        })
        .select("id")
        .single();
      if (companyErr) throw companyErr;

      const { data: jobRow, error: jobErr } = await supabase
        .from("hr_jobs")
        .insert({
          tenant_id: tenantId,
          company_id: companyRow.id,
          title: "Demo: Especialista em IA Aplicada",
          description:
            "Vaga fictícia para você ver o pipeline, shortlist e o match por radar em ação.",
          salary_range: "R$ 14k – R$ 20k",
          requirements: ["Python", "LLMs", "RAG", "Prompting", "AWS"],
        })
        .select("id")
        .single();
      if (jobErr) throw jobErr;

      const suffix = tenantId.slice(0, 8);
      const candidates = [
        {
          tenant_id: tenantId,
          full_name: "Lívia Souza",
          email: `livia.${suffix}@demo.agency`,
          status: "NEW",
          skills: ["Python", "RAG", "Vector DB"],
          bio: "3 anos construindo assistentes de IA para operações e RH.",
        },
        {
          tenant_id: tenantId,
          full_name: "Rafael Lima",
          email: `rafael.${suffix}@demo.agency`,
          status: "NEW",
          skills: ["LLMs", "Prompt Engineering", "TypeScript"],
          bio: "Focado em produtos com IA e interfaces rápidas para times internos.",
        },
        {
          tenant_id: tenantId,
          full_name: "Camila Pereira",
          email: `camila.${suffix}@demo.agency`,
          status: "NEW",
          skills: ["AWS", "MLOps", "APIs"],
          bio: "Implementação e observabilidade de IA em produção, ponta a ponta.",
        },
      ];

      const { data: insertedCandidates, error: candErr } = await supabase
        .from("hr_candidates")
        .insert(candidates)
        .select("id");
      if (candErr) throw candErr;

      const stages = ["Triagem", "Entrevista", "Final"]; // só para dar vida ao funil
      const apps = (insertedCandidates ?? []).map((c: any, idx: number) => ({
        tenant_id: tenantId,
        job_id: jobRow.id,
        candidate_id: c.id,
        current_stage: stages[idx] ?? "Triagem",
        status: "PENDING",
      }));

      const { error: appErr } = await supabase.from("hr_applications").insert(apps);
      if (appErr) throw appErr;

      toast({
        title: "Dados inseridos",
        description: "Criamos 1 vaga e 3 candidatos para você ver o fluxo completo.",
      });

      await jobsCountQuery.refetch();
    } catch (e: any) {
      toast({
        title: "Falha ao popular dados de teste",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] px-4 py-10 text-slate-100">
      {/* soft blobs (no gradients) */}
      <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[hsl(var(--primary))]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-14 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="mx-auto w-full max-w-5xl">
        <motion.header
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-3xl px-5 py-3 hr-glass">
              <HrLogo size="md" brandName={tenantQuery.data?.name ?? null} logoSrc={tenantQuery.data?.logo_data_url ?? null} />
            </div>
            <div>
              <div className="text-sm text-slate-300">Primeiro acesso</div>
              <div className="text-2xl font-semibold tracking-tight">Boas-vindas!</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-10 rounded-xl hr-btn-secondary text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
              asChild
            >
              <Link to="/settings">Configurações</Link>
            </Button>
            <Button className="h-10 rounded-xl hr-btn-primary" onClick={dismissAndGo}>
              Ir para o dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.header>

        <main className="mt-7 grid gap-4 lg:grid-cols-3">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.06, type: "spring", stiffness: 260, damping: 24 }}
            className="lg:col-span-2"
          >
            <Card className="rounded-[32px] p-6 hr-glass">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Checklist rápida</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    3 passos para deixar seu tenant com cara de produção.
                  </p>
                </div>

                <Badge className="rounded-full bg-white/10 text-slate-100 ring-1 ring-white/10">
                  {allDone ? (
                    <span className="inline-flex items-center gap-1">
                      <BadgeCheck className="h-4 w-4" /> Pronto
                    </span>
                  ) : (
                    "Em andamento"
                  )}
                </Badge>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-start justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/20">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={profileDone} />
                        <div className="text-sm font-semibold">Complete seu perfil</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-300">
                        Foto (avatar) e cargo ajudam a deixar o sistema com identidade.
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="h-9 rounded-xl hr-btn-secondary text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
                    asChild
                  >
                    <Link to="/settings?tab=profile">Editar</Link>
                  </Button>
                </div>

                <div className="flex items-start justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-200/15">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={brandDone} />
                        <div className="text-sm font-semibold">Personalize sua marca</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-300">
                        Faça upload do logo para aparecer no header e no portal.
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="h-9 rounded-xl hr-btn-secondary text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
                    asChild
                  >
                    <Link to="/settings?tab=brand">Logo</Link>
                  </Button>
                </div>

                <div className="flex items-start justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-200/15">
                      <BriefcaseBusiness className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={firstJobDone} />
                        <div className="text-sm font-semibold">Crie sua primeira vaga oficial</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-300">
                        Uma vaga ativa liga o pipeline, o radar de match e o portal público.
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="h-9 rounded-xl hr-btn-secondary text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
                    asChild
                  >
                    <Link to="/dashboard/vagas">Criar</Link>
                  </Button>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-300">
                  Você pode voltar aqui quando quiser.
                </div>
                <Button className="h-10 rounded-xl hr-btn-primary" onClick={dismissAndGo}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>

          <motion.aside
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.1, type: "spring", stiffness: 250, damping: 24 }}
            className="space-y-4"
          >
            <Card className="rounded-[32px] p-6 hr-glass">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold tracking-tight">
                    Dados de teste (IA em ação)
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    Deseja popular seu dashboard com 3 candidatos e 1 vaga fictícia?
                  </div>
                </div>
              </div>

              <Button
                className="mt-5 h-11 w-full rounded-2xl hr-btn-primary"
                disabled={seeding}
                onClick={seedDemoData}
              >
                {seeding ? "Inserindo…" : "Sim, criar dados demo"}
              </Button>

              <p className="mt-3 text-xs text-slate-400">
                Tudo fica isolado no seu tenant e pode ser removido depois.
              </p>
            </Card>

            <Card className="rounded-[32px] p-6 hr-glass">
              <div className="text-xs font-semibold text-slate-300">Dica rápida</div>
              <div className="mt-2 text-sm text-slate-200">
                Depois, compartilhe um shortlist com o cliente e receba aprovações em 1 clique.
              </div>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  className="h-10 w-full rounded-xl hr-btn-secondary text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
                  onClick={() => navigate("/dashboard", { replace: true })}
                >
                  Explorar o painel
                </Button>
              </div>
            </Card>
          </motion.aside>
        </main>
      </div>
    </div>
  );
}