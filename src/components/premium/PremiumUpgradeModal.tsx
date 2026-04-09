import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Crown, Sparkles } from "lucide-react";

function buildWhatsAppLink(agencyName: string | null) {
  const base =
    "Olá! Gostaria de adquirir o acesso vitalício para a minha agência no HR System.";
  const extra = agencyName?.trim() ? ` Agência: ${agencyName.trim()}.` : "";
  const text = encodeURIComponent(base + extra);
  return `https://wa.me/5511975495126?text=${text}`;
}

export function PremiumUpgradeModal({
  open,
  onOpenChange,
  agencyName,
  reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyName: string | null;
  reason?: "limit" | "upgrade";
}) {
  const waLink = buildWhatsAppLink(agencyName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden rounded-[32px] p-0 hr-glass">
        <div className="relative p-6">
          <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[hsl(var(--primary))]/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />

          <DialogHeader>
            <DialogTitle className="text-xl tracking-tight">
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--electric-indigo))]/15 text-[hsl(var(--electric-indigo))] ring-1 ring-[hsl(var(--electric-indigo))]/25">
                  <Crown className="h-5 w-5" />
                </span>
                Acesso Vitalício
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {reason === "limit" ? (
              <span>
                Você atingiu o limite do <b>trial</b>. Para liberar crescimento
                ilimitado, ative o plano vitalício.
              </span>
            ) : (
              <span>
                Desbloqueie o modo produção para a sua agência e mantenha acesso
                completo.
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/70 bg-white/60 p-4 ring-1 ring-slate-200/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Sem limites de volume</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Vagas ativas e equipe sem bloqueios.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white/60 p-4 ring-1 ring-slate-200/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/25 dark:text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Tudo liberado</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    IA Matchmaker + Portal do Cliente.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-[hsl(var(--electric-indigo))]/12 text-[hsl(var(--electric-indigo))] ring-1 ring-[hsl(var(--electric-indigo))]/25 dark:text-white">
              Vitalício
            </Badge>
            <Badge className="rounded-full bg-emerald-400/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200">
              Ativação em minutos
            </Badge>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="secondary"
              className="h-10 rounded-xl hr-btn-secondary"
              onClick={() => onOpenChange(false)}
            >
              Agora não
            </Button>

            <Button className="h-10 rounded-xl hr-btn-primary" asChild>
              <a href={waLink} target="_blank" rel="noreferrer">
                Liberar Acesso Vitalício via WhatsApp
              </a>
            </Button>
          </div>

          {agencyName?.trim() ? (
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Mensagem pré-preenchida com a agência: <b>{agencyName.trim()}</b>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
