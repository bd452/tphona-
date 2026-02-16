import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, resolveTenantContext } from "@/lib/api-route";
import { addTenantDomain, listTenantDomains } from "@/lib/store";

const addDomainSchema = z.object({
  host: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9.-]+$/),
  isPrimary: z.boolean().optional(),
});

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { tenantId, actorEmail } = await resolveTenantContext(params, request);
    const domains = await listTenantDomains(tenantId, actorEmail);
    return NextResponse.json({ domains });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId, actorEmail } = await resolveTenantContext(params, request);
    const body = addDomainSchema.parse(await request.json());
    const domain = await addTenantDomain({
      tenantId,
      actorEmail,
      host: body.host,
      isPrimary: body.isPrimary,
    });
    return NextResponse.json({ domain }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
