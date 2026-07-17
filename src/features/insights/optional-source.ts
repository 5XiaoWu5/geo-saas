type OptionalSourceReporter = (source: string, error: unknown) => void;

function sanitizedError(error: unknown) {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const rawMessage = error instanceof Error ? error.message : String(error);
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    code: typeof value.code === "string" ? value.code : undefined,
    message: rawMessage
      .replace(/[\w.+-]+@[\w.-]+/g, "[redacted-email]")
      .replace(/https?:\/\/\S+/g, "[redacted-url]")
      .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted-id]")
      .slice(0, 500),
  };
}

const defaultReporter: OptionalSourceReporter = (source, error) => {
  console.error("[INSIGHTS OPTIONAL SOURCE]", { source, ...sanitizedError(error) });
};

export async function loadOptionalInsightSource<T>(source: string, loader: () => Promise<T>, fallback: T, report: OptionalSourceReporter = defaultReporter): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    report(source, error);
    return fallback;
  }
}

