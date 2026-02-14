import { NextResponse } from "next/server";
import { z } from "zod";

import { getActorEmailFromRequest } from "@/lib/actor";
import { errorResponse } from "@/lib/api-route";
import { createTenantForActor, listTenants } from "@/lib/store";

const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  primaryDomain: z
    .string()
    .trim()
    .max(255)
    .regex(/^[a-z0-9.-]+$/)
    .optional()
    .or(z.literal("")),
});

export async function GET(request: Request) {
  try {
    const actorEmail = await getActorEmailFromRequest(request);
    const tenants = await listTenants(actorEmail);
    return NextResponse.json({ tenants });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actorEmail = await getActorEmailFromRequest(request);
    const body = createTenantSchema.parse(await request.json());
    const tenant = await createTenantForActor({
      actorEmail,
      name: body.name,
      slug: body.slug,
      primaryDomain: body.primaryDomain || undefined,
    });
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
