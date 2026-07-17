import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIMULATION_PROVIDERS, type SimulationProviderName } from "../types";

type Props = {
  selected: SimulationProviderName[];
  onChange: (providers: SimulationProviderName[]) => void;
};

export function ProviderTabs({ selected, onChange }: Props) {
  function toggle(provider: SimulationProviderName) {
    onChange(selected.includes(provider) ? selected.filter((item) => item !== provider) : [...selected, provider]);
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max gap-2" role="group">
        {SIMULATION_PROVIDERS.map((provider) => {
          const active = selected.includes(provider);
          return (
            <button
              key={provider}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(provider)}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary/40 bg-primary/12 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("flex h-4 w-4 items-center justify-center rounded border", active ? "border-primary bg-primary text-primary-foreground" : "border-white/20")}>
                {active ? <Check className="h-3 w-3" /> : null}
              </span>
              {provider}
            </button>
          );
        })}
      </div>
    </div>
  );
}

