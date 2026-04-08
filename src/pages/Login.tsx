import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/SessionProvider";
import { Card } from "@/components/ui/card";

export default function Login() {
  const navigate = useNavigate();
  const { session } = useSession();

  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [navigate, session]);

  return (
    <div className="min-h-screen bg-[hsl(var(--app-bg))] px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl bg-white/70 px-4 py-2 shadow-sm ring-1 ring-black/5">
            <span className="text-sm font-semibold tracking-wide text-slate-700">
              HR SaaS
            </span>
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900">
            Acesse seu painel
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Entre com seu e-mail para criar sua conta. Um tenant e um perfil serão
            gerados automaticamente.
          </p>
        </div>

        <Card className="rounded-3xl border-black/5 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
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
                  color: "#334155",
                },
                message: {
                  borderRadius: "14px",
                },
                container: {
                  gap: "14px",
                },
              },
            }}
            theme="light"
          />
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Ao entrar, você aceita os termos e políticas da sua organização.
        </p>
      </div>
    </div>
  );
}
