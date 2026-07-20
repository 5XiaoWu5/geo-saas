import { strFromU8, unzipSync } from "fflate";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

const supportedExtensions = new Set(["pdf", "docx", "pptx", "xlsx"]);
const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export class DocumentParseError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export function supportedDocument(fileName: string) {
  return supportedExtensions.has(extensionOf(fileName));
}

export function normalizedMimeType(fileName: string, mimeType?: string) {
  return mimeByExtension[extensionOf(fileName)] ?? mimeType ?? "application/octet-stream";
}

export async function extractDocumentText(fileName: string, data: Uint8Array) {
  if (!supportedDocument(fileName)) throw new DocumentParseError("UNSUPPORTED_FILE_TYPE");
  if (!data.byteLength) throw new DocumentParseError("EMPTY_FILE");
  if (data.byteLength > MAX_IMPORT_FILE_SIZE) throw new DocumentParseError("FILE_TOO_LARGE");
  const extension = extensionOf(fileName);
  const text = extension === "pdf" ? await extractPdf(data) : extractOfficeXml(extension, data);
  const normalized = normalizeText(text);
  if (normalized.length < 12) throw new DocumentParseError("NO_EXTRACTABLE_TEXT");
  return normalized;
}

export async function extractWebsiteText(rawUrl: string) {
  const url = safeWebsiteUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "User-Agent": "GeoPilot-Knowledge-Importer/1.0" } });
    if (!response.ok) throw new DocumentParseError("WEBSITE_FETCH_FAILED");
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMPORT_FILE_SIZE) throw new DocumentParseError("WEBSITE_TOO_LARGE");
    const html = (await response.text()).slice(0, MAX_IMPORT_FILE_SIZE);
    const text = normalizeText(decodeEntities(html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p>|<\/li>|<\/h[1-6]>|<\/tr>/gi, "\n")
      .replace(/<[^>]+>/g, " ")));
    if (text.length < 12) throw new DocumentParseError("NO_EXTRACTABLE_TEXT");
    return { text, url: response.url || url.toString(), mimeType: response.headers.get("content-type")?.split(";")[0] || "text/html" };
  } catch (error) {
    if (error instanceof DocumentParseError) throw error;
    throw new DocumentParseError(error instanceof Error && error.name === "AbortError" ? "WEBSITE_TIMEOUT" : "WEBSITE_FETCH_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}

export function splitKnowledgeChunks(text: string, maxLength = 1800) {
  const paragraphs = normalizeText(text).split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 1 > maxLength) {
      chunks.push(current);
      current = "";
    }
    if (paragraph.length > maxLength) {
      if (current) chunks.push(current);
      for (let index = 0; index < paragraph.length; index += maxLength) chunks.push(paragraph.slice(index, index + maxLength));
    } else {
      current = current ? `${current}\n${paragraph}` : paragraph;
    }
    if (chunks.length >= 99) break;
  }
  if (current && chunks.length < 100) chunks.push(current);
  return chunks;
}

async function extractPdf(data: Uint8Array) {
  try {
    const pdf = await getDocumentProxy(data);
    const result = await extractText(pdf, { mergePages: true });
    return result.text;
  } catch {
    throw new DocumentParseError("PDF_PARSE_FAILED");
  }
}

function extractOfficeXml(extension: string, data: Uint8Array) {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(data); } catch { throw new DocumentParseError("OFFICE_PARSE_FAILED"); }
  if (extension === "docx") return xmlText(files["word/document.xml"], "w:t");
  if (extension === "pptx") {
    return Object.entries(files)
      .filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort(([left], [right]) => numericFileOrder(left) - numericFileOrder(right))
      .map(([, value]) => xmlText(value, "a:t"))
      .join("\n");
  }
  if (extension === "xlsx") return extractSpreadsheetText(files);
  throw new DocumentParseError("UNSUPPORTED_FILE_TYPE");
}

function extractSpreadsheetText(files: Record<string, Uint8Array>) {
  const shared = xmlValues(files["xl/sharedStrings.xml"], "t");
  return Object.entries(files)
    .filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort(([left], [right]) => numericFileOrder(left) - numericFileOrder(right))
    .flatMap(([, value]) => {
      const xml = strFromU8(value);
      return [...xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].map((match) => {
        const attributes = match[1];
        const body = match[2];
        if (/\bt="s"/.test(attributes)) {
          const index = Number(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? -1);
          return shared[index] ?? "";
        }
        return decodeEntities(body.match(/<(?:v|t)>([\s\S]*?)<\/(?:v|t)>/)?.[1] ?? "");
      }).filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}

function xmlText(data: Uint8Array | undefined, tag: string) {
  if (!data) throw new DocumentParseError("OFFICE_PARSE_FAILED");
  return xmlValues(data, tag).join("\n");
}

function xmlValues(data: Uint8Array | undefined, tag: string) {
  if (!data) return [];
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g");
  return [...strFromU8(data).matchAll(pattern)].map((match) => decodeEntities(match[1])).filter(Boolean);
}

function safeWebsiteUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new DocumentParseError("INVALID_WEBSITE_URL"); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new DocumentParseError("INVALID_WEBSITE_URL");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost = hostname === "localhost" || hostname.endsWith(".local") || hostname === "::1" || /^(?:127|10|0)\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname) || /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname) || /^(?:fc|fd|fe80):/i.test(hostname);
  if (privateHost) throw new DocumentParseError("PRIVATE_WEBSITE_URL");
  return url;
}

function extensionOf(fileName: string) { return fileName.split(".").pop()?.toLowerCase() ?? ""; }
function numericFileOrder(name: string) { return Number(name.match(/(\d+)\.xml$/)?.[1] ?? 0); }
function normalizeText(value: string) { return value.replace(/\r/g, "").replace(/[\t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim(); }
function decodeEntities(value: string) { return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code))).trim(); }
