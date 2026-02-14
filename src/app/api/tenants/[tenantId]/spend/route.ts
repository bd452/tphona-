import { NextResponse } from "next/server";

import { errorResponse, resolveTenantId } from "@/lib/api-route";
import { getSpendSummary } from "@/lib/store";

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const tenantId = await resolveTenantId(params);
    const spend = getSpendSummary(tenantId);
    return NextResponse.json({ spend });
  } catch (error) {
    return errorResponse(error);
  }
}
