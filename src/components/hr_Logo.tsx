import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
};

const SIZE = {
  sm: { icon: 24, text: "text-sm" },
  md: { icon: 28, text: "text-base" },
  lg: { icon: 44, text: "text-2xl" },
} as const;

export function hr_Logo({ size = "sm", withText = true, className }: Props) {
  const s = SIZE[size];

  return (
    <div className={cn("inline-flex items-center gap-2", className)} aria-label="hr_saas">
      <img
        src="/assets/hr-logomarca.png"
        width={s.icon}
        height={s.icon}
        alt="HR"
        className="shrink-0 select-none rounded-md object-contain"
        draggable={false}
      />

      {withText ? (
        <div className={cn("leading-none tracking-tight", s.text, "font-semibold")}>
          <span className="text-[#6366F1]">hr_</span>
          <span className="text-slate-900 dark:text-white">saas</span>
        </div>
      ) : null}
    </div>
  );
}