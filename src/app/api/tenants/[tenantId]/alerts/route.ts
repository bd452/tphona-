import { NextResponse } from "next/server";

import { errorResponse, resolveTenantId } from "@/lib/api-route";
import { listAlerts } from "@/lib/store";

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const tenantId = await resolveTenantId(params);
    const alerts = listAlerts(tenantId);
    return NextResponse.json({ alerts });
  } catch (error) {
    return errorResponse(error);
  }
}
