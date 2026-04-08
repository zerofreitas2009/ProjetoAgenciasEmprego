import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, UsersRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen bg-[hsl(var(--app-bg))]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-sm ring-1 ring-black/5">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <span className="text-sm font-semibold tracking-wide text-slate-800">
              HR SaaS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-2xl bg-white/70 ring-1 ring-black/5 hover:bg-white"
              asChild
            >
              <Link to="/login">Entrar</Link>
            </Button>
            <Button
              className="rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
              asChild
            >
              <Link to="/dashboard">
                Ir para o Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="mt-10 grid gap-6 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
              <Sparkles className="h-4 w-4" />
              Multi-tenant com RLS no Supabase
            </div>

            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Recrutamento com isolamento por tenant — do jeito certo.
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600">
              Estrutura inicial pronta: tabelas <span className="font-medium">hr_*</span>,
              policies de tenant e criação automática de tenant+perfil no signup.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                className="h-11 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700"
                asChild
              >
                <Link to="/login">
                  Criar conta / Entrar <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="secondary"
                className="h-11 rounded-2xl bg-white/70 ring-1 ring-black/5 hover:bg-white"
                asChild
              >
                <Link to="/dashboard">Ver listagem de candidatos</Link>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden rounded-3xl border-black/5 bg-white/80 shadow-xl shadow-slate-900/5 backdrop-blur">
            <div className="grid gap-0 sm:grid-cols-2">
              <div className="p-6">
                <p className="text-sm font-semibold text-slate-900">
                  O que já está funcionando
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-indigo-600" />
                    <span>RLS em todas as tabelas hr_*</span>
                  </li>
                  <li className="flex gap-3">
                    <UsersRound className="mt-0.5 h-4 w-4 text-indigo-600" />
                    <span>
                      get_hr_tenant() para resolver o tenant do usuário logado
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-indigo-600" />
                    <span>
                      Trigger: cria tenant e hr_profile automaticamente no signup
                    </span>
                  </li>
                </ul>
              </div>
              <div className="relative bg-slate-50/70 p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(14,165,233,0.16),transparent_50%)]" />
                <div className="relative rounded-2xl bg-white/70 p-4 ring-1 ring-black/5">
                  <p className="text-xs font-semibold text-slate-700">
                    Próximo passo
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Inserir candidatos e evoluir o fluxo de vagas, pipeline e
                    comunicação.
                  </p>
                </div>

                <img
                  src="/placeholder.svg"
                  alt="Ilustração"
                  className="relative mt-5 w-full rounded-2xl opacity-90"
                />
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Index;