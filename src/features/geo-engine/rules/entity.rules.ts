import type { GeoEngineInput, GeoRuleFinding, GeoRuleResult } from "@/features/geo-engine/types";
import { clampScore } from "@/features/geo-engine/types";

export function evaluateEntityRules(input: GeoEngineInput): GeoRuleResult {
  const organizationSchema = input.structuredData.find((item) => item.type === "Organization");
  const productSchema = input.structuredData.find((item) => item.type === "Product");
  const homepage = input.pages.find((page) => page.pageType === "Homepage");
  const contactLikePage = input.pages.find((page) => /contact|about|security|enterprise/i.test(page.url + page.title));
  const findings: GeoRuleFinding[] = [];
  const strengths: string[] = [];
  let score = 55;

  if (organizationSchema?.valid) {
    score += 18;
    strengths.push("Organization structured data is present and valid.");
  } else {
    findings.push({ id: "entity-organization-schema", dimension: "entity", priority: "High", title: "Missing Organization entity schema", detail: "The inventory does not show a valid Organization schema entity.", recommendation: "Add Organization schema with brand name, logo, sameAs, contact points, and location.", impact: 18 });
  }

  if (productSchema?.valid) {
    score += 10;
    strengths.push("Product schema exists for commercial intent pages.");
  } else {
    findings.push({ id: "entity-product-schema", dimension: "entity", priority: "Medium", title: "Product/service entity is weak", detail: "Product structured data coverage is missing or invalid.", recommendation: "Mark up core products and services with Product or Service schema where appropriate.", impact: 10 });
  }

  if (homepage?.title.includes("|") && homepage.wordCount > 600) {
    score += 9;
    strengths.push("Homepage title and body content provide a usable brand/entity summary.");
  } else {
    findings.push({ id: "entity-homepage-summary", dimension: "entity", priority: "Medium", title: "Homepage entity summary needs improvement", detail: "The homepage does not strongly encode brand and category context.", recommendation: "Add a concise brand description, category, target market, and differentiators above the fold.", impact: 9 });
  }

  if (contactLikePage) {
    score += 8;
    strengths.push("Inventory contains pages that can support contact or authority context.");
  } else {
    findings.push({ id: "entity-contact-page", dimension: "entity", priority: "High", title: "Contact and authority page is missing", detail: "No contact, about, or authority-like page is visible in inventory.", recommendation: "Create visible About and Contact pages with company details, address, and support channels.", impact: 8 });
  }

  return { dimension: "entity", score: clampScore(score), strengths, findings };
}
