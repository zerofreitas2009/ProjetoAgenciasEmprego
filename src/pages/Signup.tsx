import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { ToastAction } from "@/components/ui/toast";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { toast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const inputClass =
  "h-11 rounded-2xl bg-white/85 pl-10 text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 focus-visible:ring-[hsl(var(--primary))] dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:placeholder:text-slate-400";

const labelClass = "text-slate-700 dark:text-slate-200";

const iconClass =
  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-300";

export default function Signup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = (params.get("invite") ?? "").trim();
  const hasInvite = inviteToken.length > 0;

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
      (hasInvite ? true : tenantName.trim().length >= 2)
    );
  }, [email, fullName, hasInvite, password.length, tenantName]);

  async function resendConfirmation(targetEmail: string) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
    });

    if (error) {
      toast({
        title: "Não foi possível reenviar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setAwaitingConfirmation(true);
    toast({
      title: "Link reenviado",
      description:
        "Enviamos novamente o e-mail de confirmação. Verifique sua caixa de entrada e o spam.",
    });
  }

  async function bootstrapHrForSignedInUser(args: {
    tenantName: string;
    fullName: string;
  }) {
    // garante que o usuário tenha registros nas tabelas hr_* (hr_tenants/hr_profiles)
    await supabase.rpc("hr_bootstrap_existing_user", {
      p_tenant_name: args.tenantName,
      p_full_name: args.fullName,
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedTenantName = tenantName.trim();
    const normalizedFullName = fullName.trim();

    setIsSubmitting(true);
    setAwaitingConfirmation(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedFullName,
            ...(hasInvite
              ? { invite_token: inviteToken }
              : { tenant_name: normalizedTenantName, role: "ADMIN" }),
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        // session imediata (quando confirmação por email está desligada)
        if (!hasInvite) {
          await bootstrapHrForSignedInUser({
            tenantName: normalizedTenantName,
            fullName: normalizedFullName,
          });
        }
        navigate("/welcome", { replace: true });
        return;
      }

      setAwaitingConfirmation(true);
      toast({
        title: "Quase lá",
        description: hasInvite
          ? "Enviamos um link de confirmação para o seu e-mail. Após confirmar, você já entra no tenant que te convidou."
          : "Enviamos um link de confirmação para o seu e-mail. Assim que confirmar, você já entra com seu tenant pronto.",
      });
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();

      if (msg.includes("already registered") || msg.includes("already exists")) {
        // Se o auth user já existe, tentamos autenticar com a senha informada.
        // Se der certo, garantimos o bootstrap nas tabelas hr_*.
        const { data: signInData, error: signInErr } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (!signInErr && signInData.session) {
          if (!hasInvite) {
            await bootstrapHrForSignedInUser({
              tenantName: normalizedTenantName,
              fullName: normalizedFullName,
            });
          }
          navigate("/welcome", { replace: true });
          return;
        }

        const signInMsg = String(signInErr?.message ?? "").toLowerCase();

        // caso típico: conta existe mas e-mail ainda não foi confirmado
        if (signInMsg.includes("email not confirmed") || signInMsg.includes("confirm")) {
          setAwaitingConfirmation(true);
          toast({
            title: "Confirmação pendente",
            description:
              "Esse e-mail já está cadastrado, mas parece que a confirmação ainda não foi feita. Quer reenviar o link?",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Reenviar confirmação"
                onClick={() => void resendConfirmation(normalizedEmail)}
              >
                Reenviar
              </ToastAction>
            ),
          });
          return;
        }

        toast({
          title: "Este e-mail já está cadastrado",
          description:
            "Para continuar, entre com a mesma senha desse e-mail. Se não lembrar, use a tela de login para recuperar.",
          variant: "destructive",
          action: (
            <ToastAction altText="Ir para login" onClick={() => navigate("/login")}>
              Ir para login
            </ToastAction>
          ),
        });
        return;
      }

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
            {hasInvite ? "Aceite seu convite" : "Crie sua agência em segundos"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-slate-300">
            {hasInvite
              ? "Complete seu cadastro para entrar no tenant que te convidou."
              : "Cadastro self-service com isolamento por tenant. Você entra e o sistema já nasce com a sua marca."}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.06, type: "spring", stiffness: 260, damping: 24 }}
          className="mt-8"
        >
          <Card className="rounded-[34px] p-6 hr-glass text-slate-900 dark:text-slate-100">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className={hasInvite ? "space-y-5" : "grid gap-4 sm:grid-cols-2"}>
                <div className="space-y-2">
                  <Label className={labelClass}>Nome completo</Label>
                  <div className="relative">
                    <UserRound className={iconClass} />
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex.: Marina Carvalho"
                      className={inputClass}
                      autoComplete="name"
                    />
                  </div>
                </div>

                {hasInvite ? null : (
                  <div className="space-y-2">
                    <Label className={labelClass}>
                      Nome da agência / consultoria
                    </Label>
                    <div className="relative">
                      <Building2 className={iconClass} />
                      <Input
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="Ex.: Deep Ocean Talent"
                        className={inputClass}
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className={labelClass}>E-mail</Label>
                <div className="relative">
                  <Mail className={iconClass} />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
                    className={inputClass}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className={labelClass}>Senha</Label>
                <div className="relative">
                  <KeyRound className={iconClass} />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    type="password"
                    className={inputClass}
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
                  {isSubmitting ? "Criando…" : hasInvite ? "Aceitar convite" : "Criar minha agência"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Já tem conta?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-[hsl(var(--electric-indigo))] underline-offset-4 hover:underline dark:text-white"
                  >
                    Entrar
                  </Link>
                </div>
              </div>

              {awaitingConfirmation ? (
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                  Confirmação pendente: verifique seu e-mail para finalizar o acesso.
                </div>
              ) : null}

              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {hasInvite
                  ? "Ao continuar, você entra no tenant que te convidou."
                  : "Ao continuar, você se torna o Admin (Owner) do tenant e poderá convidar a sua equipe depois."}
              </p>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}