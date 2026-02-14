import { NextResponse } from "next/server";

import { errorResponse, resolveTenantId } from "@/lib/api-route";
import { getUsageSummary, syncUsageForTenant } from "@/lib/store";

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const tenantId = await resolveTenantId(params);
    const url = new URL(request.url);
    const shouldSync = url.searchParams.get("sync") === "true";

    let syncResult: Awaited<ReturnType<typeof syncUsageForTenant>> | null = null;
    if (shouldSync) {
      syncResult = await syncUsageForTenant(tenantId);
    }

    const usage = getUsageSummary(tenantId);
    return NextResponse.json({ usage, syncResult });
  } catch (error) {
    return errorResponse(error);
  }
}
