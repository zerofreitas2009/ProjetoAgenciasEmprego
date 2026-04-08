import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Index() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <motion.header
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="flex items-center justify-between gap-3"
        >
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-2xl px-3 py-2 hr-glass transition hover:bg-white/80 dark:hover:bg-white/10"
          >
            <HrLogo size="sm" />
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" className="h-10 rounded-xl hr-btn-secondary" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button className="h-10 rounded-xl hr-btn-primary" asChild>
              <Link to="/dashboard">
                Abrir workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.header>

        <main className="mt-12 grid gap-6 lg:grid-cols-2 lg:items-start">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 24 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                Electric Fusion
              </Badge>
              <Badge className="rounded-full bg-[#10B981]/10 text-[#10B981] ring-1 ring-[#10B981]/15 dark:bg-[#10B981]/15">
                Multi-tenant
              </Badge>
              <Badge className="rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                ATS + Portal do Cliente
              </Badge>
            </div>

            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Recrutamento enterprise com atitude — rápido, vibrante e preciso.
            </h1>
            <p className="text-pretty text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Do sourcing ao faturamento: pipeline com gargalos, IA Matchmaker e
              experiência premium para seu time e para o cliente.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button className="h-11 rounded-xl hr-btn-primary" asChild>
                <Link to="/login">
                  Criar conta / Entrar <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="secondary" className="h-11 rounded-xl hr-btn-secondary" asChild>
                <Link to="/apply/00000000-0000-0000-0000-000000000000">
                  Ver página de candidatura
                </Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-3xl p-4 hr-glass hr-card-hover">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Segurança</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      RLS + isolamento por tenant.
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-3xl p-4 hr-glass hr-card-hover">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#10B981]/10 text-[#10B981] ring-1 ring-[#10B981]/15 dark:bg-[#10B981]/15">
                    <Workflow className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Operação</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Pipeline e shortlist em minutos.
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-3xl p-4 hr-glass hr-card-hover">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FB923C]/10 text-[#FB923C] ring-1 ring-[#FB923C]/15 dark:bg-[#FB923C]/15">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Inteligência</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Matchmaker + alerta de gargalos.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>

          {/* Break symmetry: overlap this card over the hero copy on large screens */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.12, type: "spring", stiffness: 240, damping: 22 }}
            className="space-y-4 lg:-mt-10"
          >
            <Card className="relative z-10 rounded-[28px] p-6 hr-glass">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Visão geral</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    KPI + pipeline + cliente + financeiro.
                  </div>
                </div>
                <Badge className="rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-violet-500/20">
                  High-End
                </Badge>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl p-4 hr-glass hr-card-hover">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    IA Matchmaker
                  </div>
                  <div className="mt-2 text-sm text-slate-800 dark:text-slate-100">
                    Raio‑X em radar para fit por skill.
                  </div>
                </div>
                <div className="rounded-3xl p-4 hr-glass hr-card-hover">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Heatmap de gargalos
                  </div>
                  <div className="mt-2 text-sm text-slate-800 dark:text-slate-100">
                    Glow âmbar e pulso neon vermelho.
                  </div>
                </div>
                <div className="rounded-3xl p-4 hr-glass hr-card-hover">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Portal do cliente
                  </div>
                  <div className="mt-2 text-sm text-slate-800 dark:text-slate-100">
                    Link seguro + feedback instantâneo.
                  </div>
                </div>
              </div>
            </Card>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dica: alterne o modo escuro no topo — os detalhes neon respondem em
              tempo real.
            </p>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
