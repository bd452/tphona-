import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, resolveTenantContext } from "@/lib/api-route";
import { setLineAllocation } from "@/lib/store";

const allocationSchema = z.object({
  dataAllocatedMb: z.number().int().min(256).max(1_048_576),
});

interface Params {
  params: Promise<{ tenantId: string; lineId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { lineId, tenantId } = await params;
    const { actorEmail } = await resolveTenantContext(Promise.resolve({ tenantId }), request);
    const body = allocationSchema.parse(await request.json());
    const line = await setLineAllocation({
      tenantId,
      actorEmail,
      lineId,
      dataAllocatedMb: body.dataAllocatedMb,
    });
    return NextResponse.json({ line });
  } catch (error) {
    return errorResponse(error);
  }
}
