import { NextResponse } from "next/server";

import { errorResponse, resolveTenantContext } from "@/lib/api-route";
import { updateLineStatus } from "@/lib/store";

interface Params {
  params: Promise<{ tenantId: string; lineId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { lineId, tenantId } = await params;
    const { actorEmail } = await resolveTenantContext(Promise.resolve({ tenantId }), request);
    const line = await updateLineStatus({ tenantId, actorEmail, lineId, status: "suspended" });
    return NextResponse.json({ line });
  } catch (error) {
    return errorResponse(error);
  }
}
