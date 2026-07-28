import assert from "node:assert/strict";
import test from "node:test";
import { buildSchemaRecommendations } from "./schema-recommendations";
import type { CompanyPresenceProfile } from "./types";

const emptyProfile: CompanyPresenceProfile = {
  projectId: "project-1",
  projectName: "Project",
  officialWebsite: "https://example.com",
  legalName: "",
  brandName: "",
  description: "",
  industry: "",
  region: "",
  products: [],
  services: [],
  phone: "",
  email: "",
  address: "",
  serviceAreas: [],
  businessHours: "",
  foundedAt: "",
  representative: "",
  businessType: "",
  logoUrl: "",
  socialProfiles: [],
  trustedSources: [],
  factory: {},
  updatedAt: null,
};

test("schema generation waits for missing company facts", () => {
  const recommendations = buildSchemaRecommendations(emptyProfile, null);
  const organization = recommendations.find(item => item.type === "Organization");
  const product = recommendations.find(item => item.type === "Product");
  assert.equal(organization?.status, "NEEDS_INFORMATION");
  assert.equal(organization?.jsonLd, null);
  assert.equal(product?.status, "NEEDS_INFORMATION");
  assert.equal(product?.jsonLd, null);
});
test("schema generation uses only confirmed profile values", () => {
  const profile = {
    ...emptyProfile,
    legalName: "Example Manufacturing Ltd",
    brandName: "Example",
    products: ["Industrial pump"],
    phone: "+86 20 1234 5678",
  };
  const recommendations = buildSchemaRecommendations(profile, null);
  const organization = recommendations.find(item => item.type === "Organization");
  const product = recommendations.find(item => item.type === "Product");
  assert.equal(organization?.status, "READY");
  assert.equal(organization?.jsonLd?.name, profile.legalName);
  assert.equal(product?.jsonLd?.name, profile.products[0]);
  assert.doesNotMatch(JSON.stringify(recommendations), /广州星河|展示柜/);
});
