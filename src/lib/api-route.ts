import { NextResponse } from "next/server";

import { getActorEmailFromRequest } from "@/lib/actor";
import { AppError } from "@/lib/app-error";
import { getErrorMessage } from "@/lib/api-errors";
import { getTenantById } from "@/lib/store";

export async function resolveTenantContext(
  params: Promise<{ tenantId: string }>,
  request: Request,
): Promise<{ tenantId: string; actorEmail: string }> {
  const { tenantId } = await params;
  const actorEmail = await getActorEmailFromRequest(request);
  const tenant = await getTenantById(tenantId, actorEmail);
  if (!tenant) {
    throw new AppError(404, "Tenant not found.");
  }
  return { tenantId, actorEmail };
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = getErrorMessage(error);
  const status = message === "Tenant not found." ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}
