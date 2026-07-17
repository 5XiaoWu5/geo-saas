import type { SimulationInput, SimulationProviderName, SimulationResultDraft } from "../types";

export interface SimulationProvider {
  readonly name: SimulationProviderName;
  simulate(input: SimulationInput): Promise<SimulationResultDraft>;
}

