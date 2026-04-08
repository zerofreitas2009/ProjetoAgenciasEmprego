import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { hr_Logo as HrLogo } from "@/components/hr_Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center rounded-2xl px-3 py-2 hr-glass">
            <HrLogo size="sm" />
          </Link>
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Voltar
          </Link>
        </div>

        <div className="rounded-[28px] p-6 hr-glass">
          <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
            404
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Página não encontrada
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            O endereço acessado não existe ou foi movido.
          </p>

          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 hr-btn-secondary"
            >
              Ir para a Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;