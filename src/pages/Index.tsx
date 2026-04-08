import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";

export default function Index() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B1020] dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <header className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-xl border border-black/5 bg-white/70 px-3 py-2 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <HrLogo size="sm" />
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 hover:bg-white dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
              asChild
            >
              <Link to="/login">Entrar</Link>
            </Button>
            <Button
              className="h-10 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-95"
              asChild
            >
              <Link to="/dashboard">
                Abrir workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="mt-12 grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-white/10 dark:text-white dark:ring-white/10">
                Multi-tenant
              </Badge>
              <Badge className="rounded-full bg-slate-100 text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                RLS first
              </Badge>
              <Badge className="rounded-full bg-slate-100 text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                ATS + Portal do Cliente
              </Badge>
            </div>

            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Recrutamento enterprise com UX premium — sem ruído.
            </h1>
            <p className="text-pretty text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Um fluxo completo: vagas, pipeline, shortlist compartilhável, feedback
              do cliente e financeiro — tudo com isolamento por tenant.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                className="h-11 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-95"
                asChild
              >
                <Link to="/login">
                  Criar conta / Entrar <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="secondary"
                className="h-11 rounded-xl bg-white/70 ring-1 ring-black/5 hover:bg-white dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
                asChild
              >
                <Link to="/apply/00000000-0000-0000-0000-000000000000">
                  Ver página de candidatura
                </Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-2xl border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-white/10 dark:text-white dark:ring-white/10">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Segurança</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      RLS + isolamento real por tenant.
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-white/10 dark:text-white dark:ring-white/10">
                    <Workflow className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Fluxo</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Pipeline, shortlist e feedback em um lugar.
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-white/10 dark:text-white dark:ring-white/10">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Experiência</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      UI clean, rápida e consistente.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="rounded-3xl border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Visão geral</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    KPI + pipeline + cliente + financeiro.
                  </div>
                </div>
                <Badge className="rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                  Premium
                </Badge>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Shortlist do Cliente
                  </div>
                  <div className="mt-2 text-sm text-slate-800 dark:text-slate-100">
                    Link seguro + feedback com 1 clique.
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Storage de currículos
                  </div>
                  <div className="mt-2 text-sm text-slate-800 dark:text-slate-100">
                    Signed URLs + policies por tenant.
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Financeiro
                  </div>
                  <div className="mt-2 text-sm text-slate-800 dark:text-slate-100">
                    Placements, fee e faturamento do mês.
                  </div>
                </div>
              </div>
            </Card>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dica: ative o modo escuro no ícone do topo — tudo usa classes
              <span className="mx-1 rounded bg-white/60 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                dark:
              </span>
              do Tailwind.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}