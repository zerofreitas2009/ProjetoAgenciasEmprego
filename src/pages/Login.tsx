import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";
import { useTheme } from "next-themes";

const ptBR = {
  variables: {
    sign_in: {
      email_label: "E-mail",
      email_input_placeholder: "Seu endereço de e-mail",
      password_label: "Senha",
      password_input_placeholder: "Sua senha",
      button_label: "Entrar",
      loading_button_label: "Entrando…",
      link_text: "Já tem uma conta? Entre",
    },
    sign_up: {
      email_label: "E-mail",
      email_input_placeholder: "Seu endereço de e-mail",
      password_label: "Senha",
      password_input_placeholder: "Crie uma senha",
      button_label: "Criar conta",
      loading_button_label: "Criando…",
      link_text: "Não tem conta? Cadastre-se",
      confirmation_text: "Verifique seu e-mail para confirmar seu acesso.",
    },
    forgotten_password: {
      email_label: "E-mail",
      email_input_placeholder: "Seu endereço de e-mail",
      button_label: "Enviar instruções",
      loading_button_label: "Enviando…",
      link_text: "Esqueceu sua senha?",
    },
    update_password: {
      password_label: "Nova senha",
      password_input_placeholder: "Digite a nova senha",
      button_label: "Atualizar senha",
      loading_button_label: "Atualizando…",
    },
  },
} as const;

export default function Login() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;

  useEffect(() => {
    if (!session) return;

    (async () => {
      const { data, error } = await supabase
        .from("hr_profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();

      // se o usuário existe no auth mas ainda não tem registros hr_*, criamos agora
      if (!error && !data) {
        await supabase.rpc("hr_bootstrap_existing_user", {
          p_tenant_name:
            String(session.user.user_metadata?.tenant_name ?? "").trim() ||
            String(session.user.email ?? "").split("@")[0] ||
            "Agência",
          p_full_name:
            String(session.user.user_metadata?.full_name ?? "").trim() ||
            String(session.user.email ?? "") ||
            "Admin",
        });

        navigate("/welcome", { replace: true });
        return;
      }

      if (!error && data && data.onboarding_completed === false) {
        navigate("/welcome", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    })();
  }, [navigate, session]);

  const authAppearance = useMemo(() => {
    const isDark = currentTheme === "dark";

    return {
      theme: ThemeSupa,
      style: {
        button: {
          borderRadius: "14px",
          padding: "12px 14px",
          fontWeight: 600,
        },
        input: {
          borderRadius: "14px",
          padding: "12px 14px",
        },
        label: {
          fontSize: "13px",
          color: isDark ? "rgba(226,232,240,0.90)" : "#334155",
        },
        message: {
          borderRadius: "14px",
        },
        container: {
          gap: "14px",
        },
      },
    };
  }, [currentTheme]);

  return (
    <div className="relative min-h-screen bg-white px-4 py-10 text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      {/* Discreet back control (fixed, icon-only) */}
      <Link
        to="/"
        className="group fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/50 text-slate-500 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        title="Voltar para a Home"
        aria-label="Voltar para a Home"
      >
        <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
      </Link>

      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-5 inline-flex items-center justify-center">
            {/* Dark-mode glow behind the logo */}
            <div className="pointer-events-none absolute -inset-12 hidden rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.22),rgba(124,58,237,0.18),transparent_60%)] blur-2xl dark:block" />

            <div className="relative rounded-3xl px-6 py-4 hr-glass">
              <HrLogo size="lg" />
            </div>
          </div>

          <p className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Recrutamento de alta precisão, de ponta a ponta.
          </p>

          <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight">
            Acesse seu painel
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Se você ainda não tem conta, crie sua agência pelo cadastro self-service.
          </p>

          <div className="mt-5 flex justify-center">
            <Button className="h-10 rounded-xl hr-btn-primary" asChild>
              <Link to="/signup">
                Criar agência <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl p-6 hr-glass">
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={authAppearance}
            theme={currentTheme === "dark" ? "dark" : "light"}
            localization={ptBR as any}
            view="sign_in"
            showLinks={false}
          />
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Ao entrar, você aceita os termos e políticas da sua organização.
        </p>
      </div>
    </div>
  );
}