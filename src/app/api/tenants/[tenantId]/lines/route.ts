import { NextResponse } from "next/server";

import { errorResponse, resolveTenantContext } from "@/lib/api-route";
import { listEmployees, listLines, listPlans } from "@/lib/store";

interface TenantParams {
  params: Promise<{ tenantId: string }>;
}

export async function GET(_request: Request, { params }: TenantParams) {
  try {
    const { tenantId, actorEmail } = await resolveTenantContext(params, _request);
    const [lines, employees, plans] = await Promise.all([
      listLines(tenantId, actorEmail),
      listEmployees(tenantId, actorEmail),
      listPlans(tenantId, actorEmail),
    ]);
    return NextResponse.json({ lines, employees, plans });
  } catch (error) {
    return errorResponse(error);
  }
}
