import type {
  ActionResult,
  AssignPlanInput,
  AssignPlanResult,
  ChangePlanInput,
  EsimProvider,
  FetchUsageInput,
  IssueEsimInput,
  IssueEsimResult,
  ProviderWebhookEvent,
  ReactivateLineInput,
  SuspendLineInput,
  TerminateLineInput,
  UsageRecord,
  VerifyWebhookInput,
} from "@/lib/esim/types";

export class OneGlobalProvider implements EsimProvider {
  async issueEsim(_input: IssueEsimInput): Promise<IssueEsimResult> {
    const suffix = crypto.randomUUID().split("-")[0];
    return {
      providerLineId: `1g-line-${suffix}`,
      iccid: `89882100${Math.floor(Math.random() * 10_000_000_000)
        .toString()
        .padStart(10, "0")}`,
      activationCode: `LPA:1$rsp.1global.demo$${crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 20)}`,
    };
  }

  async assignPlan(_input: AssignPlanInput): Promise<AssignPlanResult> {
    return { success: true };
  }

  async changePlan(_input: ChangePlanInput): Promise<ActionResult> {
    return { success: true };
  }

  async suspendLine(_input: SuspendLineInput): Promise<ActionResult> {
    return { success: true };
  }

  async reactivateLine(_input: ReactivateLineInput): Promise<ActionResult> {
    return { success: true };
  }

  async terminateLine(_input: TerminateLineInput): Promise<ActionResult> {
    return { success: true };
  }

  async fetchUsage(_input: FetchUsageInput): Promise<UsageRecord[]> {
    return [
      {
        mbUsed: Math.floor(Math.random() * 120) + 10,
        occurredAt: new Date().toISOString(),
      },
    ];
  }

  async verifyWebhook({
    signature,
    payload,
    secret,
  }: VerifyWebhookInput): Promise<ProviderWebhookEvent> {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid payload.");
    }

    // Production should use HMAC verification. We use a shared secret check here.
    if (secret && signature !== secret) {
      throw new Error("Invalid webhook signature.");
    }

    const event = payload as Partial<ProviderWebhookEvent>;
    if (!event.id || !event.providerLineId || !event.type || !event.timestamp) {
      throw new Error("Missing required webhook fields.");
    }

    if (
      event.type !== "line_suspended" &&
      event.type !== "line_reactivated" &&
      event.type !== "line_terminated"
    ) {
      throw new Error("Unsupported webhook event type.");
    }

    return event as ProviderWebhookEvent;
  }
}
