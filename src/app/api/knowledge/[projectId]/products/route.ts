import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { createProduct, KnowledgeServiceError } from "@/features/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(160).default(""),
  description: z.string().trim().max(6000).default(""),
  features: z.array(z.string().trim().min(1).max(300)).max(100).default([]),
  applications: z.array(z.string().trim().min(1).max(300)).max(100).default([]),
  targetCustomers: z.array(z.string().trim().min(1).max(300)).max(100).default([]),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "INVALID_PRODUCT_INPUT" }, { status: 400 });
    const { projectId } = await params;
    return NextResponse.json({ product: await createProduct(user.id, { projectId, ...parsed.data }) }, { status: 201 });
  } catch (error) {
    if (error instanceof KnowledgeServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}
