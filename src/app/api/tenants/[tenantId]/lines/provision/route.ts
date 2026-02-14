import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, resolveTenantId } from "@/lib/api-route";
import { provisionLine } from "@/lib/store";

const provisionSchema = z.object({
  employeeId: z.string().min(1),
  planId: z.string().min(1),
});

interface TenantParams {
  params: Promise<{ tenantId: string }>;
}

export async function POST(request: Request, { params }: TenantParams) {
  try {
    const tenantId = await resolveTenantId(params);
    const parsed = provisionSchema.parse(await request.json());
    const line = await provisionLine({
      tenantId,
      employeeId: parsed.employeeId,
      planId: parsed.planId,
    });
    return NextResponse.json({ line }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
