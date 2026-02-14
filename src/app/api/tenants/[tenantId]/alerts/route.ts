import { NextResponse } from "next/server";

import { errorResponse, resolveTenantContext } from "@/lib/api-route";
import { listAlerts } from "@/lib/store";

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { tenantId, actorEmail } = await resolveTenantContext(params, request);
    const alerts = await listAlerts(tenantId, actorEmail);
    return NextResponse.json({ alerts });
  } catch (error) {
    return errorResponse(error);
  }
}
