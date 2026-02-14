import { NextResponse } from "next/server";

import { errorResponse, resolveTenantId } from "@/lib/api-route";
import { listEmployees, listLines, listPlans } from "@/lib/store";

interface TenantParams {
  params: Promise<{ tenantId: string }>;
}

export async function GET(_request: Request, { params }: TenantParams) {
  try {
    const tenantId = await resolveTenantId(params);
    const lines = listLines(tenantId);
    const employees = listEmployees(tenantId);
    const plans = listPlans(tenantId);
    return NextResponse.json({ lines, employees, plans });
  } catch (error) {
    return errorResponse(error);
  }
}
