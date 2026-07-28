import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { aiPresenceApiError } from "@/features/ai-presence/api";
import { saveCompanyPresenceProfile } from "@/features/ai-presence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = z.string().trim().max(5000);
const shortText = z.string().trim().max(500);
const textList = z.array(z.string().trim().min(1).max(500)).max(100);

const profileSchema = z.object({
  officialWebsite: z.string().trim().url().max(2048),
  legalName: shortText,
  brandName: shortText,
  description: text,
  industry: shortText,
  region: shortText,
  products: textList,
  services: textList,
  phone: shortText,
  email: z.union([z.literal(""), z.string().trim().email().max(320)]),
  address: text,
  serviceAreas: textList,
  businessHours: shortText,
  foundedAt: shortText,
  representative: shortText,
  businessType: shortText,
  logoUrl: z.union([z.literal(""), z.string().trim().url().max(2048)]),
  socialProfiles: z.array(z.string().trim().url().max(2048)).max(50),
  trustedSources: z.array(z.string().trim().url().max(2048)).max(50),
  factory: z.object({
    factoryName: shortText,
    productionCapacity: text,
    materials: text,
    certifications: text,
    minimumOrderQuantity: shortText,
    exportRegions: text,
    factoryAddress: text,
    qualityStandards: text,
    deliveryLeadTime: shortText,
  }),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const [{ projectId }, body] = await Promise.all([params, request.json()]);
    return NextResponse.json(await saveCompanyPresenceProfile(user.id, projectId, profileSchema.parse(body)));
  } catch (error) {
    return aiPresenceApiError(error);
  }
}
