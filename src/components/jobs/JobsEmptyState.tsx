import { BriefcaseBusiness } from "lucide-react";

export function JobsEmptyState({
  title = "Nenhuma vaga aberta no momento",
  subtitle = "Volte em breve — estamos sempre criando novas oportunidades.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/60 p-8 text-center shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:shadow-none">
      <div className="mx-auto max-w-md">
        <svg
          viewBox="0 0 420 180"
          className="mx-auto h-40 w-full"
          role="img"
          aria-label={title}
        >
          <defs>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="0 0 0 0 0.42  0 0 0 0 0  0 0 0 0 1  0 0 0 0.35 0"
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect
            x="34"
            y="34"
            width="352"
            height="112"
            rx="28"
            fill="rgba(255,255,255,0.65)"
            stroke="rgba(148,163,184,0.55)"
          />
          <rect
            x="34"
            y="34"
            width="352"
            height="112"
            rx="28"
            fill="none"
            stroke="rgba(111,0,255,0.55)"
            strokeWidth="1"
            filter="url(#softGlow)"
          />

          <rect
            x="74"
            y="64"
            width="160"
            height="16"
            rx="8"
            fill="rgba(99,102,241,0.20)"
          />
          <rect
            x="74"
            y="90"
            width="240"
            height="10"
            rx="5"
            fill="rgba(148,163,184,0.35)"
          />
          <rect
            x="74"
            y="108"
            width="200"
            height="10"
            rx="5"
            fill="rgba(148,163,184,0.28)"
          />

          <circle
            cx="322"
            cy="88"
            r="22"
            fill="rgba(111,0,255,0.12)"
            stroke="rgba(111,0,255,0.35)"
          />
          <path
            d="M312 94h20M316 84h12"
            stroke="rgba(111,0,255,0.6)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/15 dark:bg-[hsl(var(--primary))]/15 dark:text-white">
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          Catálogo de Vagas
        </div>

        <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
