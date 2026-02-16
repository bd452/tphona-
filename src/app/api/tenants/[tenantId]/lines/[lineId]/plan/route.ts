import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, resolveTenantContext } from "@/lib/api-route";
import { changeLinePlan } from "@/lib/store";

const changePlanSchema = z.object({
  planId: z.string().min(1),
});

interface Params {
  params: Promise<{ tenantId: string; lineId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { lineId, tenantId } = await params;
    const { actorEmail } = await resolveTenantContext(Promise.resolve({ tenantId }), request);
    const body = changePlanSchema.parse(await request.json());
    const line = await changeLinePlan({ tenantId, actorEmail, lineId, planId: body.planId });
    return NextResponse.json({ line });
  } catch (error) {
    return errorResponse(error);
  }
}
