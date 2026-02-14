export interface IssueEsimInput {
  tenantId: string;
  employeeId: string;
}

export interface IssueEsimResult {
  providerLineId: string;
  iccid: string;
  activationCode: string;
}

export interface AssignPlanInput {
  providerLineId: string;
  planExternalId: string;
}

export interface AssignPlanResult {
  success: boolean;
}

export interface ChangePlanInput {
  providerLineId: string;
  planExternalId: string;
}

export interface SuspendLineInput {
  providerLineId: string;
}

export interface ReactivateLineInput {
  providerLineId: string;
}

export interface TerminateLineInput {
  providerLineId: string;
}

export interface ActionResult {
  success: boolean;
}

export interface FetchUsageInput {
  providerLineId: string;
}

export interface UsageRecord {
  mbUsed: number;
  occurredAt: string;
}

export interface VerifyWebhookInput {
  signature: string | null;
  payload: unknown;
  secret: string | undefined;
}

export interface ProviderWebhookEvent {
  id: string;
  type: "line_suspended" | "line_reactivated" | "line_terminated";
  providerLineId: string;
  timestamp: string;
}

export interface EsimProvider {
  issueEsim(input: IssueEsimInput): Promise<IssueEsimResult>;
  assignPlan(input: AssignPlanInput): Promise<AssignPlanResult>;
  changePlan(input: ChangePlanInput): Promise<ActionResult>;
  suspendLine(input: SuspendLineInput): Promise<ActionResult>;
  reactivateLine(input: ReactivateLineInput): Promise<ActionResult>;
  terminateLine(input: TerminateLineInput): Promise<ActionResult>;
  fetchUsage(input: FetchUsageInput): Promise<UsageRecord[]>;
  verifyWebhook(input: VerifyWebhookInput): Promise<ProviderWebhookEvent>;
}
