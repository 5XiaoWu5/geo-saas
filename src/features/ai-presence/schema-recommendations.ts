import type { CompanyPresenceProfile, DiscoverabilityEvidence } from "./types";

type Recommendation = {
  type: string;
  status: "READY" | "NEEDS_INFORMATION" | "NOT_APPLICABLE" | "EXISTS" | "ERROR" | "CONFLICT";
  missingFields: string[];
  targetPage: string;
  jsonLd: Record<string, unknown> | null;
};

function compact<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === null || value === undefined || value === "") return false;
      return !Array.isArray(value) || value.length > 0;
    }),
  );
}

export function buildSchemaRecommendations(
  profile: CompanyPresenceProfile,
  evidence: DiscoverabilityEvidence | null,
): Recommendation[] {
  const existing = new Set(evidence?.schema.types ?? []);
  const companyName = profile.legalName || profile.brandName;
  const organizationMissing = [
    !companyName ? "companyName" : "",
    !profile.officialWebsite ? "officialWebsite" : "",
  ].filter(Boolean);
  const recommendations: Recommendation[] = [];
  recommendations.push({
    type: "Organization",
    status: existing.has("Organization") ? "EXISTS" : organizationMissing.length ? "NEEDS_INFORMATION" : "READY",
    missingFields: organizationMissing,
    targetPage: profile.officialWebsite || "/",
    jsonLd: organizationMissing.length ? null : compact({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: companyName,
      url: profile.officialWebsite,
      logo: profile.logoUrl,
      email: profile.email,
      telephone: profile.phone,
      address: profile.address ? compact({ "@type": "PostalAddress", streetAddress: profile.address }) : undefined,
      areaServed: profile.serviceAreas,
      sameAs: profile.socialProfiles,
    }),
  });

  const businessType = profile.businessType.toLowerCase();
  const localApplicable = Boolean(profile.address || /local|门店|本地|零售|服务/.test(businessType));
  recommendations.push({
    type: "LocalBusiness",
    status: existing.has("LocalBusiness") ? "EXISTS" : !localApplicable ? "NOT_APPLICABLE" : !companyName || !profile.address ? "NEEDS_INFORMATION" : "READY",
    missingFields: localApplicable ? [!companyName ? "companyName" : "", !profile.address ? "address" : ""].filter(Boolean) : [],
    targetPage: profile.officialWebsite || "/",
    jsonLd: localApplicable && companyName && profile.address ? compact({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: companyName,
      url: profile.officialWebsite,
      telephone: profile.phone,
      email: profile.email,
      address: compact({ "@type": "PostalAddress", streetAddress: profile.address }),
      openingHours: profile.businessHours,
      areaServed: profile.serviceAreas,
    }) : null,
  });

  const product = profile.products[0];
  recommendations.push({
    type: "Product",
    status: existing.has("Product") ? "EXISTS" : !product ? "NEEDS_INFORMATION" : "READY",
    missingFields: product ? [] : ["product"],
    targetPage: evidence?.corePages.find(item => item.kind === "PRODUCT_DETAIL" && item.found)?.url ?? "product detail page",
    jsonLd: product ? compact({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product,
      brand: profile.brandName ? { "@type": "Brand", name: profile.brandName } : undefined,
      url: evidence?.corePages.find(item => item.kind === "PRODUCT_DETAIL" && item.found)?.url,
    }) : null,
  });

  const service = profile.services[0];
  recommendations.push({
    type: "Service",
    status: existing.has("Service") ? "EXISTS" : !service ? "NEEDS_INFORMATION" : "READY",
    missingFields: service ? [] : ["service"],
    targetPage: evidence?.corePages.find(item => item.kind === "SERVICE_DETAIL" && item.found)?.url ?? "service detail page",
    jsonLd: service ? compact({
      "@context": "https://schema.org",
      "@type": "Service",
      name: service,
      provider: companyName ? { "@type": "Organization", name: companyName } : undefined,
      areaServed: profile.serviceAreas,
      url: evidence?.corePages.find(item => item.kind === "SERVICE_DETAIL" && item.found)?.url,
    }) : null,
  });

  recommendations.push({
    type: "ContactPoint",
    status: existing.has("ContactPoint") ? "EXISTS" : !companyName || (!profile.phone && !profile.email) ? "NEEDS_INFORMATION" : "READY",
    missingFields: [!companyName ? "companyName" : "", !profile.phone && !profile.email ? "phoneOrEmail" : ""].filter(Boolean),
    targetPage: evidence?.corePages.find(item => item.kind === "CONTACT" && item.found)?.url ?? "contact page",
    jsonLd: companyName && (profile.phone || profile.email) ? compact({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: companyName,
      contactPoint: compact({
        "@type": "ContactPoint",
        telephone: profile.phone,
        email: profile.email,
        contactType: "customer service",
        areaServed: profile.serviceAreas,
      }),
    }) : null,
  });
  return recommendations;
}
