import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { extractDocumentText, splitKnowledgeChunks } from "./document-file-parser";
import { ruleKnowledgeDocumentIntelligenceProvider } from "./knowledge-document-rule-provider";
import type { KnowledgeChunk, KnowledgeDocument } from "./types";

test("真实解析 DOCX 中的企业产品文本", async () => {
  const docx = zipSync({
    "word/document.xml": strToU8('<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>产品名称：GeoPilot Enterprise</w:t></w:r></w:p><w:p><w:r><w:t>核心优势：严格证据模式、统一增长机会</w:t></w:r></w:p></w:body></w:document>'),
  });
  const text = await extractDocumentText("product.docx", docx);
  assert.match(text, /GeoPilot Enterprise/);
  assert.match(text, /严格证据模式/);
});

test("真实解析 PPTX 与 XLSX 文本", async () => {
  const pptx = zipSync({ "ppt/slides/slide1.xml": strToU8('<p:sld xmlns:p="p" xmlns:a="a"><a:t>核心优势：高可靠、可追溯</a:t><a:t>应用行业：制造业</a:t></p:sld>') });
  const xlsx = zipSync({
    "xl/sharedStrings.xml": strToU8('<sst><si><t>产品名称：GeoPilot Sheet</t></si><si><t>目标客户：企业品牌</t></si></sst>'),
    "xl/worksheets/sheet1.xml": strToU8('<worksheet><sheetData><row><c t="s"><v>0</v></c><c t="s"><v>1</v></c></row></sheetData></worksheet>'),
  });
  assert.match(await extractDocumentText("product.pptx", pptx), /高可靠/);
  assert.match(await extractDocumentText("product.xlsx", xlsx), /GeoPilot Sheet/);
});

test("真实解析 PDF 文本", async () => {
  const text = await extractDocumentText("product.pdf", minimalPdf("Product Name: GeoPilot PDF"));
  assert.match(text, /GeoPilot PDF/);
});

test("规则 Provider 只从 KnowledgeChunk 证据生成 DRAFT 产品建议", async () => {
  const document = documentFixture();
  const chunks = chunkFixtures([
    "产品名称：GeoPilot Enterprise\n产品类型：AI Search Growth Platform\n产品介绍：统一管理 SEO 与 GEO 增长",
    "核心优势：严格证据模式、项目数据隔离\n应用行业：SaaS、制造业\n目标客户：品牌企业、代运营公司\n解决问题：AI 搜索推荐缺口",
  ]);
  const result = await ruleKnowledgeDocumentIntelligenceProvider.extract({ document, chunks });
  assert.equal(result.extractedProducts.length, 1);
  assert.equal(result.extractedProducts[0].status, "DRAFT");
  assert.equal(result.extractedProducts[0].name, "GeoPilot Enterprise");
  assert.deepEqual(result.extractedProducts[0].applications, ["SaaS", "制造业"]);
  assert.ok(result.extractedProducts[0].evidenceChunkIds.length > 0);
});

test("无产品证据时不生成虚构产品", async () => {
  const result = await ruleKnowledgeDocumentIntelligenceProvider.extract({ document: documentFixture("会议纪要.docx"), chunks: chunkFixtures(["今天讨论团队排期和会议时间。"]) });
  assert.deepEqual(result.extractedProducts, []);
  assert.equal(result.confidence, 0);
});

test("长文本按边界生成最多 100 个知识切片", () => {
  const chunks = splitKnowledgeChunks(Array.from({ length: 140 }, (_, index) => `段落${index} ${"内容".repeat(100)}`).join("\n"), 200);
  assert.ok(chunks.length <= 100);
  assert.ok(chunks.every((chunk) => chunk.length <= 200));
});

function documentFixture(name = "产品介绍.docx"): KnowledgeDocument {
  return { id: "document-1", projectId: "project-1", sourceId: "source-1", name, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 100, processingStatus: "READY", extractedTextStatus: "READY", createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() };
}

function chunkFixtures(contents: string[]): KnowledgeChunk[] {
  return contents.map((content, order) => ({ id: `chunk-${order}`, projectId: "project-1", documentId: "document-1", content, hash: `hash-${order}`, order, tokenCount: content.length, confidence: 90, createdAt: new Date(0).toISOString() }));
}

function minimalPdf(text: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${text.length + 34} >>\nstream\nBT /F1 12 Tf 72 720 Td (${text}) Tj ET\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
