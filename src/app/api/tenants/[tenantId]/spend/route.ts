import { NextResponse } from "next/server";

import { errorResponse, resolveTenantContext } from "@/lib/api-route";
import { getSpendSummary } from "@/lib/store";

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { tenantId, actorEmail } = await resolveTenantContext(params, request);
    const spend = await getSpendSummary(tenantId, actorEmail);
    return NextResponse.json({ spend });
  } catch (error) {
    return errorResponse(error);
  }
}
