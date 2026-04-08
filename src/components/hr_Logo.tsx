import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
};

const SIZE = {
  sm: { icon: 20, text: "text-sm" },
  md: { icon: 24, text: "text-base" },
  lg: { icon: 32, text: "text-2xl" },
} as const;

export function hr_Logo({ size = "sm", withText = true, className }: Props) {
  const id = useId();
  const s = SIZE[size];

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="hr_saas"
    >
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        role="img"
        aria-hidden={!withText}
      >
        <defs>
          <linearGradient
            id={`${id}-stroke`}
            x1="3"
            y1="6"
            x2="21"
            y2="18"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="55%" stopColor="#a78bfa" stopOpacity="1" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="1" />
          </linearGradient>
          <linearGradient
            id={`${id}-fill`}
            x1="10"
            y1="10"
            x2="14"
            y2="14"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Left parenthesis/link */}
        <path
          d="M9.2 6.2C7.2 7.4 6 9.5 6 12s1.2 4.6 3.2 5.8"
          stroke={`url(#${id}-stroke)`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right parenthesis/link */}
        <path
          d="M14.8 6.2c2 1.2 3.2 3.3 3.2 5.8s-1.2 4.6-3.2 5.8"
          stroke={`url(#${id}-stroke)`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Subtle inner link hints */}
        <path
          d="M8.9 9.8h2.2M12.9 14.2h2.2"
          stroke={`url(#${id}-stroke)`}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Focus point */}
        <circle cx="12" cy="12" r="1.65" fill={`url(#${id}-fill)`} />
      </svg>

      {withText ? (
        <div
          className={cn(
            "leading-none tracking-tight",
            s.text,
            "font-semibold"
          )}
        >
          <span className="text-[#6366F1]">hr_</span>
          <span className="text-slate-900 dark:text-white">saas</span>
        </div>
      ) : null}
    </div>
  );
}
