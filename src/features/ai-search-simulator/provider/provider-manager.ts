import { RuleBasedSimulationProvider } from "./mock-provider";
import type { SimulationProvider } from "./simulator-provider";
import { SIMULATION_PROVIDERS, type SimulationProviderName } from "../types";

const providers = new Map<SimulationProviderName, SimulationProvider>(
  SIMULATION_PROVIDERS.map((name) => [name, new RuleBasedSimulationProvider(name)]),
);

export class SimulationProviderManager {
  get(name: SimulationProviderName) {
    const provider = providers.get(name);
    if (!provider) throw new Error("PROVIDER_NOT_SUPPORTED");
    return provider;
  }
}

export const simulationProviderManager = new SimulationProviderManager();

