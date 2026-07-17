export const GEO_ANALYSIS_PROMPT = `
Analyze this website for Generative Engine Optimization. Focus on:
1. entity authority,
2. content structure,
3. schema coverage,
4. authority signals,
5. AI citation potential.

Return JSON with this shape:
{
  "insights": ["short insight"],
  "problems": [{"type":"entity|content|schema|authority|citation","severity":"high|medium|low","description":"..."}],
  "recommendations": [{"priority":"high|medium|low","action":"...","rationale":"..."}],
  "aiSummary": "one concise executive summary"
}
`;
