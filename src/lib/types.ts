export type ProviderName = "1global";

export type Role = "owner" | "admin" | "finance" | "manager" | "viewer";

export type LineStatus = "provisioning" | "active" | "suspended" | "terminated";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "resolved";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  domains: string[];
  provider: ProviderName;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Membership {
  id: string;
  tenantId: string;
  userEmail: string;
  role: Role;
  createdAt: string;
}

export interface TenantDomain {
  id: string;
  tenantId: string;
  host: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userEmail: string;
  role: Role;
  createdAt: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  team: string;
  costCenter: string;
  monthlyDataCapMb: number;
  isActive: boolean;
  createdAt: string;
}

export interface Plan {
  id: string;
  tenantId: string | null;
  name: string;
  includedDataMb: number;
  monthlyPriceUsd: number;
  overageUsdPerMb: number;
  roamingEnabled: boolean;
}

export interface Line {
  id: string;
  tenantId: string;
  employeeId: string;
  provider: ProviderName;
  providerLineId: string;
  iccid: string;
  activationCode: string;
  status: LineStatus;
  planId: string;
  dataAllocatedMb: number;
  monthlyPriceUsd: number;
  roamingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  tenantId: string;
  lineId: string;
  mbUsed: number;
  source: "sync" | "webhook";
  occurredAt: string;
}

export interface Alert {
  id: string;
  tenantId: string;
  key: string;
  lineId?: string;
  employeeId?: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  action: string;
  actor: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface WebhookEventReceipt {
  id: string;
  provider: ProviderName;
  externalEventId: string;
  receivedAt: string;
}

export interface UsageLineSummary {
  lineId: string;
  employeeId: string;
  employeeName: string;
  team: string;
  costCenter: string;
  status: LineStatus;
  usedMb: number;
  allocatedMb: number;
  usagePct: number;
}

export interface SpendLineSummary {
  lineId: string;
  employeeName: string;
  team: string;
  costCenter: string;
  baseCostUsd: number;
  overageCostUsd: number;
  totalCostUsd: number;
}

export interface SpendSummary {
  month: string;
  totalBaseCostUsd: number;
  totalOverageCostUsd: number;
  totalCostUsd: number;
  byTeam: Record<string, number>;
  byCostCenter: Record<string, number>;
  lines: SpendLineSummary[];
}
