import { scoreSimulation } from "../score-engine";
import type { SimulationInput, SimulationProviderName } from "../types";
import type { SimulationProvider } from "./simulator-provider";

export class RuleBasedSimulationProvider implements SimulationProvider {
  constructor(readonly name: SimulationProviderName) {}

  async simulate(input: SimulationInput) {
    return scoreSimulation(this.name, input.query, input.evidence);
  }
}

