import { isPrivateNetworkAddress } from "@/features/real-ai-search/compatible-provider-security";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);
const MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 1_500_000;

export type PublicUrlResolver = (hostname: string, signal: AbortSignal) => Promise<string[]>;

function normalizePublicUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("PUBLIC_URL_INVALID");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("PUBLIC_URL_PROTOCOL_UNSAFE");
  if (url.username || url.password) throw new Error("PUBLIC_URL_CREDENTIALS_FORBIDDEN");
  url.hash = "";
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    BLOCKED_HOSTS.has(hostname)
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || isPrivateNetworkAddress(hostname)
  ) {
    throw new Error("PUBLIC_URL_PRIVATE_NETWORK");
  }
  url.hostname = hostname;
  return url.toString();
}

async function defaultResolver(hostname: string, signal: AbortSignal) {
  const addresses = new Set<string>();
  for (const type of ["A", "AAAA"]) {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
      { headers: { Accept: "application/dns-json" }, redirect: "manual", signal },
    );
    if (!response.ok || (response.status >= 300 && response.status < 400)) {
      throw new Error("PUBLIC_URL_DNS_FAILED");
    }
    const body = await response.json() as { Answer?: Array<{ data?: string; type?: number }> };
    for (const answer of body.Answer ?? []) {
      if ((answer.type === 1 || answer.type === 28) && answer.data) addresses.add(answer.data);
    }
  }
  if (!addresses.size) throw new Error("PUBLIC_URL_DNS_FAILED");
  return [...addresses];
}

async function assertStablePublicUrl(
  input: string,
  signal: AbortSignal,
  resolver: PublicUrlResolver,
) {
  const normalized = normalizePublicUrl(input);
  const hostname = new URL(normalized).hostname;
  const first = await resolver(hostname, signal);
  const second = await resolver(hostname, signal);
  if (
    !first.length
    || !second.length
    || first.some(isPrivateNetworkAddress)
    || second.some(isPrivateNetworkAddress)
  ) {
    throw new Error("PUBLIC_URL_PRIVATE_NETWORK");
  }
  return normalized;
}

async function readTextWithLimit(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("PUBLIC_RESPONSE_TOO_LARGE");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("PUBLIC_RESPONSE_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function safePublicTextRequest(
  input: string,
  init: RequestInit = {},
  options: {
    signal: AbortSignal;
    resolveHost?: PublicUrlResolver;
    fetcher?: typeof fetch;
    maxBytes?: number;
  },
) {
  const resolver = options.resolveHost ?? defaultResolver;
  const fetcher = options.fetcher ?? fetch;
  let url = await assertStablePublicUrl(input, options.signal, resolver);
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const startedAt = Date.now();
    const response = await fetcher(url, {
      ...init,
      redirect: "manual",
      signal: options.signal,
    });
    const durationMs = Date.now() - startedAt;
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error("PUBLIC_URL_REDIRECT_REJECTED");
      }
      url = await assertStablePublicUrl(new URL(location, url).toString(), options.signal, resolver);
      continue;
    }
    return {
      requestedUrl: input,
      finalUrl: url,
      status: response.status,
      ok: response.ok,
      durationMs,
      contentType: response.headers.get("content-type"),
      xRobotsTag: response.headers.get("x-robots-tag"),
      body: await readTextWithLimit(response, options.maxBytes ?? DEFAULT_MAX_BYTES),
    };
  }
  throw new Error("PUBLIC_URL_REDIRECT_REJECTED");
}
