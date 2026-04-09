import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Mail,
  UserRound,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { toast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const isValid = useMemo(() => {
    return (
      fullName.trim().length >= 3 &&
      email.trim().includes("@") &&
      password.length >= 8 &&
      tenantName.trim().length >= 2
    );
  }, [email, fullName, password.length, tenantName]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setAwaitingConfirmation(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            tenant_name: tenantName.trim(),
            role: "ADMIN",
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        navigate("/welcome", { replace: true });
        return;
      }

      setAwaitingConfirmation(true);
      toast({
        title: "Quase lá",
        description:
          "Enviamos um link de confirmação para o seu e-mail. Assim que confirmar, você já entra com seu tenant pronto.",
      });
    } catch (e: any) {
      toast({
        title: "Não foi possível criar sua conta",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] px-4 py-10 text-slate-100">
      {/* soft blobs (no gradients) */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[hsl(var(--primary))]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

      <Link
        to="/"
        className="group fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 shadow-sm backdrop-blur-md transition hover:bg-white/10 hover:text-white"
        title="Voltar"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
      </Link>

      <div className="mx-auto w-full max-w-xl">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="text-center"
        >
          <div className="mx-auto inline-flex items-center justify-center rounded-3xl px-6 py-4 hr-glass">
            <HrLogo size="lg" />
          </div>

          <h1 className="mt-7 text-balance text-3xl font-semibold tracking-tight">
            Crie sua agência em segundos
          </h1>
          <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-slate-300">
            Cadastro self-service com isolamento por tenant. Você entra e o sistema
            já nasce com a sua marca.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.06, type: "spring", stiffness: 260, damping: 24 }}
          className="mt-8"
        >
          <Card className="rounded-[34px] p-6 hr-glass">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-200">Nome completo</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex.: Marina Carvalho"
                      className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-slate-100 placeholder:text-slate-400 focus-visible:ring-[hsl(var(--primary))]"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">
                    Nome da agência / consultoria
                  </Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                    <Input
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="Ex.: Deep Ocean Talent"
                      className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-slate-100 placeholder:text-slate-400 focus-visible:ring-[hsl(var(--primary))]"
                      autoComplete="organization"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">E-mail profissional</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
                    className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-slate-100 placeholder:text-slate-400 focus-visible:ring-[hsl(var(--primary))]"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Senha</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    type="password"
                    className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-slate-100 placeholder:text-slate-400 focus-visible:ring-[hsl(var(--primary))]"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="h-11 rounded-2xl hr-btn-primary disabled:opacity-60"
                >
                  {isSubmitting ? "Criando…" : "Criar minha agência"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="text-sm text-slate-300">
                  Já tem conta?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-white underline-offset-4 hover:underline"
                  >
                    Entrar
                  </Link>
                </div>
              </div>

              {awaitingConfirmation ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  Confirmação pendente: verifique seu e-mail para finalizar o acesso.
                </div>
              ) : null}

              <p className="text-xs leading-relaxed text-slate-400">
                Ao continuar, você se torna o Admin (Owner) do tenant e poderá
                convidar a sua equipe depois.
              </p>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}