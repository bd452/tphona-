import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/api-errors";
import { getEsimProvider } from "@/lib/esim";
import { ingestProviderWebhook } from "@/lib/store";

const provider = getEsimProvider("1global");

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;
    const signature = request.headers.get("x-1global-signature");

    const event = await provider.verifyWebhook({
      signature,
      payload,
      secret: process.env.ONEGLOBAL_WEBHOOK_SECRET,
    });

    const result = await ingestProviderWebhook({
      provider: "1global",
      event,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      { status: 400 },
    );
  }
}
