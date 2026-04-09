import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
  logoSrc?: string | null;
  brandName?: string | null;
};

const SIZE = {
  sm: { icon: 24, text: "text-sm" },
  md: { icon: 28, text: "text-base" },
  lg: { icon: 44, text: "text-2xl" },
} as const;

export function hr_Logo({
  size = "sm",
  withText = true,
  className,
  logoSrc,
  brandName,
}: Props) {
  const s = SIZE[size];
  const src = logoSrc || "/assets/hr-logomarca.png";

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={brandName ? `${brandName} • HR System` : "HR System"}
    >
      <img
        src={src}
        width={s.icon}
        height={s.icon}
        alt={brandName ? `${brandName} logo` : "HR System"}
        className="shrink-0 select-none rounded-md object-contain"
        draggable={false}
      />

      {withText ? (
        <div className={cn("leading-none tracking-tight", s.text, "font-semibold")}>
          <span className="text-[#6366F1]">HR</span>
          <span className="text-slate-900 dark:text-white"> System</span>
          {brandName ? (
            <div className="mt-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
              {brandName}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}