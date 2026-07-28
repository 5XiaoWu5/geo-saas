import { classifyProviderHttpError, normalizeProviderRuntimeError } from "./provider-errors";

const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_REDIRECTS = 2;
const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

type Resolver = (hostname: string, signal: AbortSignal) => Promise<string[]>;

function parseIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part))) return null;
  const numbers = parts.map(Number);
  return numbers.some(part => part > 255) ? null : numbers;
}

export function isPrivateNetworkAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = parseIpv4(mapped ?? normalized);
  if (ipv4) {
    const [a, b] = ipv4;
    return a === 0
      || a === 10
      || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 0)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  return normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe8")
    || normalized.startsWith("fe9")
    || normalized.startsWith("fea")
    || normalized.startsWith("feb");
}

export function normalizeCompatibleBaseUrl(input: string, production = process.env.NODE_ENV === "production") {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("COMPATIBLE_BASE_URL_INVALID");
  }
  if (url.protocol !== "https:" && (production || url.protocol !== "http:")) {
    throw new Error("COMPATIBLE_BASE_URL_HTTPS_REQUIRED");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("COMPATIBLE_BASE_URL_CREDENTIALS_FORBIDDEN");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    BLOCKED_HOSTS.has(hostname)
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || isPrivateNetworkAddress(hostname)
  ) {
    throw new Error("COMPATIBLE_BASE_URL_PRIVATE_NETWORK");
  }
  url.hostname = hostname;
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

async function defaultResolver(hostname: string, signal: AbortSignal) {
  const addresses = new Set<string>();
  for (const type of ["A", "AAAA"]) {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
      { headers: { Accept: "application/dns-json" }, redirect: "manual", signal },
    );
    if (response.status >= 300 && response.status < 400) {
      throw new Error("COMPATIBLE_BASE_URL_DNS_FAILED");
    }
    if (!response.ok) throw new Error("COMPATIBLE_BASE_URL_DNS_FAILED");
    const body = await response.json() as { Answer?: Array<{ data?: string; type?: number }> };
    for (const answer of body.Answer ?? []) {
      if ((answer.type === 1 || answer.type === 28) && answer.data) addresses.add(answer.data);
    }
  }
  if (!addresses.size) throw new Error("COMPATIBLE_BASE_URL_DNS_FAILED");
  return [...addresses];
}

async function resolveSafeCompatibleBaseUrl(
  input: string,
  options: { production?: boolean; signal: AbortSignal; resolveHost?: Resolver },
) {
  const normalized = normalizeCompatibleBaseUrl(input, options.production);
  const url = new URL(normalized);
  const addresses = await (options.resolveHost ?? defaultResolver)(url.hostname, options.signal);
  if (!addresses.length || addresses.some(isPrivateNetworkAddress)) {
    throw new Error("COMPATIBLE_BASE_URL_PRIVATE_NETWORK");
  }
  return { normalized, addresses: [...addresses].sort() };
}

export async function assertSafeCompatibleBaseUrl(
  input: string,
  options: { production?: boolean; signal: AbortSignal; resolveHost?: Resolver },
) {
  return (await resolveSafeCompatibleBaseUrl(input, options)).normalized;
}

async function stablePublicUrl(
  input: string,
  options: { production?: boolean; signal: AbortSignal; resolveHost?: Resolver },
) {
  const first = await resolveSafeCompatibleBaseUrl(input, options);
  // Resolve twice so an attacker cannot pass a single public answer and then
  // switch to a private target. Public CDN pools are allowed to rotate IPs.
  await resolveSafeCompatibleBaseUrl(input, options);
  return first.normalized;
}

async function readJsonWithLimit(response: Response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_RESPONSE_BYTES) throw new Error("PROVIDER_RESPONSE_TOO_LARGE");
  if (!response.body) return {};
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("PROVIDER_RESPONSE_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("PROVIDER_INVALID_RESPONSE");
  }
}

export async function safeCompatibleJsonRequest(
  inputUrl: string,
  init: RequestInit,
  options: { signal: AbortSignal; resolveHost?: Resolver; production?: boolean },
) {
  let url = await stablePublicUrl(inputUrl, options);
  let requestInit = { ...init, redirect: "manual" as const, signal: options.signal };
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await fetch(url, requestInit);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects === MAX_REDIRECTS) throw new Error("PROVIDER_REDIRECT_REJECTED");
        url = await stablePublicUrl(new URL(location, url).toString(), options);
        if (response.status === 303 || response.status === 301 || response.status === 302) {
          requestInit = { ...requestInit, method: "GET", body: undefined };
        }
        continue;
      }
      const body = await readJsonWithLimit(response);
      if (!response.ok) {
        const error = new Error(classifyProviderHttpError(response.status, body));
        Object.assign(error, { retryable: response.status === 429 || response.status >= 500 });
        throw error;
      }
      return body;
    }
    throw new Error("PROVIDER_REDIRECT_REJECTED");
  } catch (error) {
    if (error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)) throw error;
    throw new Error(normalizeProviderRuntimeError(error));
  }
}

export function publicBaseUrlHost(input: unknown) {
  if (typeof input !== "string" || !input) return null;
  try {
    return new URL(input).host;
  } catch {
    return null;
  }
}
