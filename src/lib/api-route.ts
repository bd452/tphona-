import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/api-errors";
import { getTenantById } from "@/lib/store";

export async function resolveTenantId(
  params: Promise<{ tenantId: string }>,
): Promise<string> {
  const { tenantId } = await params;
  const tenant = getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found.");
  }
  return tenantId;
}

export function errorResponse(error: unknown): NextResponse {
  const message = getErrorMessage(error);
  const status = message === "Tenant not found." ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}
