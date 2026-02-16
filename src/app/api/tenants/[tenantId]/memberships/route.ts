import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, resolveTenantContext } from "@/lib/api-route";
import { listTenantMembers, upsertTenantMember } from "@/lib/store";
import type { Role } from "@/lib/types";

const roleValues: [Role, ...Role[]] = ["owner", "admin", "finance", "manager", "viewer"];

const upsertMembershipSchema = z.object({
  userEmail: z.email(),
  role: z.enum(roleValues),
});

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { tenantId, actorEmail } = await resolveTenantContext(params, request);
    const members = await listTenantMembers(tenantId, actorEmail);
    return NextResponse.json({ members });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId, actorEmail } = await resolveTenantContext(params, request);
    const body = upsertMembershipSchema.parse(await request.json());
    const member = await upsertTenantMember({
      tenantId,
      actorEmail,
      userEmail: body.userEmail,
      role: body.role,
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
