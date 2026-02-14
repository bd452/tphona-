import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, resolveTenantId } from "@/lib/api-route";
import { createEmployee, listEmployees } from "@/lib/store";

const createEmployeeSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  team: z.string().min(1),
  costCenter: z.string().min(1),
  monthlyDataCapMb: z.number().int().min(256).max(512_000),
});

interface TenantParams {
  params: Promise<{ tenantId: string }>;
}

export async function GET(_request: Request, { params }: TenantParams) {
  try {
    const tenantId = await resolveTenantId(params);
    const employees = listEmployees(tenantId);
    return NextResponse.json({ employees });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: TenantParams) {
  try {
    const tenantId = await resolveTenantId(params);
    const body = await request.json();
    const parsed = createEmployeeSchema.parse(body);
    const employee = createEmployee({ tenantId, ...parsed });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
