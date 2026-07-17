import { cn } from "@/lib/utils";

type Props = {
  value: number;
  label: string;
  className?: string;
};

function gaugeColor(value: number) {
  if (value >= 75) return "stroke-emerald-400";
  if (value >= 55) return "stroke-amber-400";
  return "stroke-rose-400";
}

export function ProbabilityGauge({ value, label, className }: Props) {
  const normalized = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 44;
  const offset = circumference * (1 - normalized / 100);

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-44", className)} role="img" aria-label={`${label}: ${normalized}%`}>
      <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="56" cy="56" r="44" fill="none" className="stroke-white/10" strokeWidth="9" />
        <circle
          cx="56"
          cy="56"
          r="44"
          fill="none"
          className={cn("motion-safe:transition-all motion-safe:duration-700", gaugeColor(normalized))}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="font-mono text-3xl font-semibold text-foreground sm:text-4xl">{normalized}%</span>
        <span className="mt-1 text-[11px] leading-4 text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

