export const OPTIMIZATION_PROMPT = `
Given the GEO analysis output, produce practical optimization actions.

Return JSON with this shape:
{
  "recommendations": [{"priority":"high|medium|low","action":"...","rationale":"..."}]
}
`;
