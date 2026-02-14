import { NextResponse } from "next/server";

import { errorResponse, resolveTenantId } from "@/lib/api-route";
import { updateLineStatus } from "@/lib/store";

interface Params {
  params: Promise<{ tenantId: string; lineId: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { lineId, tenantId } = await params;
    await resolveTenantId(Promise.resolve({ tenantId }));
    const line = await updateLineStatus({ tenantId, lineId, status: "terminated" });
    return NextResponse.json({ line });
  } catch (error) {
    return errorResponse(error);
  }
}
