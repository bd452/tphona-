import { getEsimProvider } from "@/lib/esim";
import type { ProviderWebhookEvent } from "@/lib/esim/types";
import type {
  Alert,
  AlertSeverity,
  AuditLog,
  Employee,
  Line,
  LineStatus,
  Membership,
  Plan,
  SpendSummary,
  Tenant,
  UsageEvent,
  UsageLineSummary,
  User,
  WebhookEventReceipt,
} from "@/lib/types";

interface StoreState {
  tenants: Tenant[];
  users: User[];
  memberships: Membership[];
  employees: Employee[];
  plans: Plan[];
  lines: Line[];
  usageEvents: UsageEvent[];
  alerts: Alert[];
  auditLogs: AuditLog[];
  webhookEvents: WebhookEventReceipt[];
}

export interface DashboardStats {
  employees: number;
  activeLines: number;
  suspendedLines: number;
  openAlerts: number;
  monthlyUsageMb: number;
  estimatedMonthlyCostUsd: number;
}

export interface UsageSummary {
  month: string;
  totalUsedMb: number;
  lines: UsageLineSummary[];
}

export interface SyncResult {
  eventsIngested: number;
  alertsOpened: number;
}

declare global {
  var __ESIM_PLATFORM_STORE__: StoreState | undefined;
}

const SYSTEM_ACTOR = "system@tphona.local";

function now(): string {
  return new Date().toISOString();
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function isCurrentMonth(timestampIso: string): boolean {
  const candidate = new Date(timestampIso);
  const current = new Date();
  return (
    candidate.getUTCFullYear() === current.getUTCFullYear() &&
    candidate.getUTCMonth() === current.getUTCMonth()
  );
}

function seedStore(): StoreState {
  const createdAt = now();
  const tenants: Tenant[] = [
    {
      id: "tenant_acme",
      slug: "acme",
      name: "Acme Industries",
      domains: ["acme.localhost"],
      provider: "1global",
      createdAt,
    },
    {
      id: "tenant_globex",
      slug: "globex",
      name: "Globex Corporation",
      domains: ["globex.localhost"],
      provider: "1global",
      createdAt,
    },
  ];

  const users: User[] = [
    { id: "user_founder", email: "founder@acme.example", name: "Sasha Founder" },
    { id: "user_finance", email: "finance@acme.example", name: "Ira Finance" },
  ];

  const memberships: Membership[] = [
    { id: crypto.randomUUID(), tenantId: "tenant_acme", userId: "user_founder", role: "owner" },
    { id: crypto.randomUUID(), tenantId: "tenant_acme", userId: "user_finance", role: "finance" },
  ];

  const employees: Employee[] = [
    {
      id: "emp_acme_1",
      tenantId: "tenant_acme",
      name: "Jordan Lee",
      email: "jordan.lee@acme.example",
      team: "Sales",
      costCenter: "CC-100",
      monthlyDataCapMb: 8_192,
      isActive: true,
      createdAt,
    },
    {
      id: "emp_acme_2",
      tenantId: "tenant_acme",
      name: "Taylor Brown",
      email: "taylor.brown@acme.example",
      team: "Operations",
      costCenter: "CC-210",
      monthlyDataCapMb: 10_240,
      isActive: true,
      createdAt,
    },
    {
      id: "emp_globex_1",
      tenantId: "tenant_globex",
      name: "Casey Nguyen",
      email: "casey.nguyen@globex.example",
      team: "Engineering",
      costCenter: "ENG-44",
      monthlyDataCapMb: 12_288,
      isActive: true,
      createdAt,
    },
  ];

  const plans: Plan[] = [
    {
      id: "plan_starter",
      tenantId: null,
      name: "Starter 3GB",
      includedDataMb: 3_072,
      monthlyPriceUsd: 25,
      overageUsdPerMb: 0.025,
      roamingEnabled: false,
    },
    {
      id: "plan_growth",
      tenantId: null,
      name: "Growth 10GB",
      includedDataMb: 10_240,
      monthlyPriceUsd: 52,
      overageUsdPerMb: 0.018,
      roamingEnabled: true,
    },
    {
      id: "plan_global",
      tenantId: null,
      name: "Global 50GB",
      includedDataMb: 51_200,
      monthlyPriceUsd: 115,
      overageUsdPerMb: 0.01,
      roamingEnabled: true,
    },
  ];

  const lines: Line[] = [
    {
      id: "line_acme_1",
      tenantId: "tenant_acme",
      employeeId: "emp_acme_1",
      provider: "1global",
      providerLineId: "1g-line-seeded-1",
      iccid: "89882100111111111111",
      activationCode: "LPA:1$rsp.1global.demo$SEEDCODE01",
      status: "active",
      planId: "plan_growth",
      dataAllocatedMb: 10_240,
      monthlyPriceUsd: 52,
      roamingEnabled: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "line_acme_2",
      tenantId: "tenant_acme",
      employeeId: "emp_acme_2",
      provider: "1global",
      providerLineId: "1g-line-seeded-2",
      iccid: "89882100222222222222",
      activationCode: "LPA:1$rsp.1global.demo$SEEDCODE02",
      status: "suspended",
      planId: "plan_starter",
      dataAllocatedMb: 3_072,
      monthlyPriceUsd: 25,
      roamingEnabled: false,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const usageEvents: UsageEvent[] = [
    {
      id: crypto.randomUUID(),
      tenantId: "tenant_acme",
      lineId: "line_acme_1",
      mbUsed: 1_280,
      source: "sync",
      occurredAt: createdAt,
    },
    {
      id: crypto.randomUUID(),
      tenantId: "tenant_acme",
      lineId: "line_acme_2",
      mbUsed: 1_100,
      source: "sync",
      occurredAt: createdAt,
    },
  ];

  return {
    tenants,
    users,
    memberships,
    employees,
    plans,
    lines,
    usageEvents,
    alerts: [],
    auditLogs: [],
    webhookEvents: [],
  };
}

function getStore(): StoreState {
  if (!globalThis.__ESIM_PLATFORM_STORE__) {
    globalThis.__ESIM_PLATFORM_STORE__ = seedStore();
  }
  return globalThis.__ESIM_PLATFORM_STORE__;
}

function getTenantOrThrow(tenantId: string): Tenant {
  const tenant = getStore().tenants.find((candidate) => candidate.id === tenantId);
  if (!tenant) {
    throw new Error("Tenant not found.");
  }
  return tenant;
}

function getPlanForTenantOrThrow(tenantId: string, planId: string): Plan {
  const plan = getStore().plans.find(
    (candidate) => candidate.id === planId && (candidate.tenantId === null || candidate.tenantId === tenantId),
  );
  if (!plan) {
    throw new Error("Plan not found for tenant.");
  }
  return plan;
}

function getLineForTenantOrThrow(tenantId: string, lineId: string): Line {
  const line = getStore().lines.find((candidate) => candidate.id === lineId && candidate.tenantId === tenantId);
  if (!line) {
    throw new Error("Line not found.");
  }
  return line;
}

function getEmployeeForTenantOrThrow(tenantId: string, employeeId: string): Employee {
  const employee = getStore().employees.find(
    (candidate) => candidate.id === employeeId && candidate.tenantId === tenantId,
  );
  if (!employee) {
    throw new Error("Employee not found.");
  }
  return employee;
}

function appendAuditLog(
  tenantId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
): void {
  getStore().auditLogs.push({
    id: crypto.randomUUID(),
    tenantId,
    action,
    actor: SYSTEM_ACTOR,
    entityType,
    entityId,
    details,
    createdAt: now(),
  });
}

function upsertAlert(
  tenantId: string,
  key: string,
  severity: AlertSeverity,
  message: string,
  lineId?: string,
  employeeId?: string,
): boolean {
  const existing = getStore().alerts.find((alert) => alert.tenantId === tenantId && alert.key === key);
  if (existing) {
    if (existing.status === "resolved") {
      existing.status = "open";
      existing.updatedAt = now();
    }
    return false;
  }

  getStore().alerts.push({
    id: crypto.randomUUID(),
    tenantId,
    key,
    lineId,
    employeeId,
    severity,
    status: "open",
    message,
    createdAt: now(),
    updatedAt: now(),
  });
  return true;
}

function currentUsageByLine(tenantId: string): Map<string, number> {
  const usage = new Map<string, number>();

  for (const event of getStore().usageEvents) {
    if (event.tenantId !== tenantId || !isCurrentMonth(event.occurredAt)) {
      continue;
    }

    usage.set(event.lineId, (usage.get(event.lineId) ?? 0) + event.mbUsed);
  }

  return usage;
}

function evaluatePoliciesForTenant(tenantId: string): number {
  const summary = getUsageSummary(tenantId).lines;
  const month = currentMonthKey();
  let createdCount = 0;

  for (const row of summary) {
    if (row.status === "terminated") {
      continue;
    }

    if (row.usagePct >= 100) {
      const created = upsertAlert(
        tenantId,
        `${month}:line:${row.lineId}:hard-cap`,
        "critical",
        `${row.employeeName} exceeded allocated data by ${Math.round(row.usagePct - 100)}%.`,
        row.lineId,
        row.employeeId,
      );
      createdCount += created ? 1 : 0;
      continue;
    }

    if (row.usagePct >= 80) {
      const created = upsertAlert(
        tenantId,
        `${month}:line:${row.lineId}:soft-cap`,
        "warning",
        `${row.employeeName} crossed 80% of monthly data allocation.`,
        row.lineId,
        row.employeeId,
      );
      createdCount += created ? 1 : 0;
    }
  }

  return createdCount;
}

export function listTenants(): Tenant[] {
  return getStore().tenants;
}

export function getTenantById(tenantId: string): Tenant | undefined {
  return getStore().tenants.find((tenant) => tenant.id === tenantId);
}

export function getTenantBySlug(tenantSlug: string): Tenant | undefined {
  return getStore().tenants.find((tenant) => tenant.slug === tenantSlug);
}

export function listEmployees(tenantId: string): Employee[] {
  getTenantOrThrow(tenantId);
  return getStore()
    .employees.filter((employee) => employee.tenantId === tenantId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createEmployee(input: {
  tenantId: string;
  name: string;
  email: string;
  team: string;
  costCenter: string;
  monthlyDataCapMb: number;
}): Employee {
  getTenantOrThrow(input.tenantId);

  const employee: Employee = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    name: input.name,
    email: input.email,
    team: input.team,
    costCenter: input.costCenter,
    monthlyDataCapMb: input.monthlyDataCapMb,
    isActive: true,
    createdAt: now(),
  };

  getStore().employees.push(employee);
  appendAuditLog(input.tenantId, "employee.created", "employee", employee.id, {
    email: employee.email,
    team: employee.team,
  });

  return employee;
}

export function listPlans(tenantId: string): Plan[] {
  getTenantOrThrow(tenantId);
  return getStore().plans.filter((plan) => plan.tenantId === null || plan.tenantId === tenantId);
}

export function listLines(tenantId: string): Line[] {
  getTenantOrThrow(tenantId);
  return getStore()
    .lines.filter((line) => line.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function provisionLine(input: {
  tenantId: string;
  employeeId: string;
  planId: string;
}): Promise<Line> {
  const tenant = getTenantOrThrow(input.tenantId);
  const employee = getEmployeeForTenantOrThrow(input.tenantId, input.employeeId);
  const plan = getPlanForTenantOrThrow(input.tenantId, input.planId);
  const provider = getEsimProvider(tenant.provider);

  const issued = await provider.issueEsim({ tenantId: tenant.id, employeeId: employee.id });
  await provider.assignPlan({ providerLineId: issued.providerLineId, planExternalId: plan.id });

  const createdAt = now();
  const line: Line = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    employeeId: employee.id,
    provider: tenant.provider,
    providerLineId: issued.providerLineId,
    iccid: issued.iccid,
    activationCode: issued.activationCode,
    status: "active",
    planId: plan.id,
    dataAllocatedMb: plan.includedDataMb,
    monthlyPriceUsd: plan.monthlyPriceUsd,
    roamingEnabled: plan.roamingEnabled,
    createdAt,
    updatedAt: createdAt,
  };

  getStore().lines.push(line);
  appendAuditLog(input.tenantId, "line.provisioned", "line", line.id, {
    employeeId: employee.id,
    planId: plan.id,
    providerLineId: line.providerLineId,
  });

  return line;
}

export async function updateLineStatus(input: {
  tenantId: string;
  lineId: string;
  status: Exclude<LineStatus, "provisioning">;
}): Promise<Line> {
  const line = getLineForTenantOrThrow(input.tenantId, input.lineId);
  const tenant = getTenantOrThrow(input.tenantId);
  const provider = getEsimProvider(tenant.provider);

  if (input.status === "suspended") {
    await provider.suspendLine({ providerLineId: line.providerLineId });
  } else if (input.status === "active") {
    await provider.reactivateLine({ providerLineId: line.providerLineId });
  } else if (input.status === "terminated") {
    await provider.terminateLine({ providerLineId: line.providerLineId });
  }

  line.status = input.status;
  line.updatedAt = now();
  appendAuditLog(input.tenantId, "line.status_changed", "line", line.id, { status: input.status });
  return line;
}

export async function changeLinePlan(input: {
  tenantId: string;
  lineId: string;
  planId: string;
}): Promise<Line> {
  const line = getLineForTenantOrThrow(input.tenantId, input.lineId);
  const tenant = getTenantOrThrow(input.tenantId);
  const plan = getPlanForTenantOrThrow(input.tenantId, input.planId);
  const provider = getEsimProvider(tenant.provider);

  await provider.changePlan({ providerLineId: line.providerLineId, planExternalId: plan.id });

  line.planId = plan.id;
  line.dataAllocatedMb = plan.includedDataMb;
  line.monthlyPriceUsd = plan.monthlyPriceUsd;
  line.roamingEnabled = plan.roamingEnabled;
  line.updatedAt = now();

  appendAuditLog(input.tenantId, "line.plan_changed", "line", line.id, { planId: plan.id });
  return line;
}

export function setLineAllocation(input: {
  tenantId: string;
  lineId: string;
  dataAllocatedMb: number;
}): Line {
  const line = getLineForTenantOrThrow(input.tenantId, input.lineId);
  line.dataAllocatedMb = input.dataAllocatedMb;
  line.updatedAt = now();

  appendAuditLog(input.tenantId, "line.allocation_updated", "line", line.id, {
    dataAllocatedMb: input.dataAllocatedMb,
  });

  return line;
}

export async function syncUsageForTenant(tenantId: string): Promise<SyncResult> {
  const tenant = getTenantOrThrow(tenantId);
  const provider = getEsimProvider(tenant.provider);
  const lines = listLines(tenantId).filter((line) => line.status === "active");

  let eventsIngested = 0;
  for (const line of lines) {
    const events = await provider.fetchUsage({ providerLineId: line.providerLineId });
    for (const event of events) {
      getStore().usageEvents.push({
        id: crypto.randomUUID(),
        tenantId,
        lineId: line.id,
        mbUsed: event.mbUsed,
        source: "sync",
        occurredAt: event.occurredAt,
      });
      eventsIngested += 1;
    }
  }

  const alertsOpened = evaluatePoliciesForTenant(tenantId);
  appendAuditLog(tenantId, "usage.synced", "usage_sync", tenantId, {
    eventsIngested,
    alertsOpened,
  });

  return { eventsIngested, alertsOpened };
}

export function getUsageSummary(tenantId: string): UsageSummary {
  const employees = listEmployees(tenantId);
  const lines = listLines(tenantId);
  const usageByLine = currentUsageByLine(tenantId);

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const summaryLines: UsageLineSummary[] = lines.map((line) => {
    const employee = employeeById.get(line.employeeId);
    const usedMb = usageByLine.get(line.id) ?? 0;
    const allocatedMb = Math.max(1, line.dataAllocatedMb);
    return {
      lineId: line.id,
      employeeId: line.employeeId,
      employeeName: employee?.name ?? "Unknown employee",
      team: employee?.team ?? "Unknown team",
      costCenter: employee?.costCenter ?? "Unknown cost center",
      status: line.status,
      usedMb,
      allocatedMb,
      usagePct: (usedMb / allocatedMb) * 100,
    };
  });

  summaryLines.sort((a, b) => b.usedMb - a.usedMb);
  const totalUsedMb = summaryLines.reduce((total, line) => total + line.usedMb, 0);

  return {
    month: currentMonthKey(),
    totalUsedMb,
    lines: summaryLines,
  };
}

export function getSpendSummary(tenantId: string): SpendSummary {
  const usage = getUsageSummary(tenantId);
  const lines = listLines(tenantId);
  const plansById = new Map(listPlans(tenantId).map((plan) => [plan.id, plan]));
  const usageByLine = new Map(usage.lines.map((entry) => [entry.lineId, entry]));

  const byTeam: Record<string, number> = {};
  const byCostCenter: Record<string, number> = {};

  const spendLines = lines.map((line) => {
    const usageLine = usageByLine.get(line.id);
    const plan = plansById.get(line.planId);

    const baseCostUsd = line.status === "terminated" ? 0 : line.monthlyPriceUsd;
    const overageMb = Math.max(0, (usageLine?.usedMb ?? 0) - line.dataAllocatedMb);
    const overageCostUsd = roundCurrency(overageMb * (plan?.overageUsdPerMb ?? 0));
    const totalCostUsd = roundCurrency(baseCostUsd + overageCostUsd);

    if (usageLine) {
      byTeam[usageLine.team] = roundCurrency((byTeam[usageLine.team] ?? 0) + totalCostUsd);
      byCostCenter[usageLine.costCenter] = roundCurrency(
        (byCostCenter[usageLine.costCenter] ?? 0) + totalCostUsd,
      );
    }

    return {
      lineId: line.id,
      employeeName: usageLine?.employeeName ?? "Unknown employee",
      team: usageLine?.team ?? "Unknown team",
      costCenter: usageLine?.costCenter ?? "Unknown cost center",
      baseCostUsd,
      overageCostUsd,
      totalCostUsd,
    };
  });

  const totalBaseCostUsd = roundCurrency(spendLines.reduce((sum, line) => sum + line.baseCostUsd, 0));
  const totalOverageCostUsd = roundCurrency(spendLines.reduce((sum, line) => sum + line.overageCostUsd, 0));
  const totalCostUsd = roundCurrency(totalBaseCostUsd + totalOverageCostUsd);

  return {
    month: currentMonthKey(),
    totalBaseCostUsd,
    totalOverageCostUsd,
    totalCostUsd,
    byTeam,
    byCostCenter,
    lines: spendLines.sort((a, b) => b.totalCostUsd - a.totalCostUsd),
  };
}

export function listAlerts(tenantId: string): Alert[] {
  getTenantOrThrow(tenantId);
  return getStore()
    .alerts.filter((alert) => alert.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDashboardStats(tenantId: string): DashboardStats {
  const employees = listEmployees(tenantId);
  const lines = listLines(tenantId);
  const usage = getUsageSummary(tenantId);
  const spend = getSpendSummary(tenantId);
  const openAlerts = listAlerts(tenantId).filter((alert) => alert.status === "open");

  return {
    employees: employees.length,
    activeLines: lines.filter((line) => line.status === "active").length,
    suspendedLines: lines.filter((line) => line.status === "suspended").length,
    openAlerts: openAlerts.length,
    monthlyUsageMb: usage.totalUsedMb,
    estimatedMonthlyCostUsd: spend.totalCostUsd,
  };
}

export async function ingestProviderWebhook(input: {
  provider: "1global";
  event: ProviderWebhookEvent;
}): Promise<{ accepted: boolean; reason?: string }> {
  const alreadyProcessed = getStore().webhookEvents.find(
    (entry) => entry.provider === input.provider && entry.externalEventId === input.event.id,
  );
  if (alreadyProcessed) {
    return { accepted: true, reason: "duplicate_event" };
  }

  getStore().webhookEvents.push({
    id: crypto.randomUUID(),
    provider: input.provider,
    externalEventId: input.event.id,
    receivedAt: now(),
  });

  const line = getStore().lines.find((candidate) => candidate.providerLineId === input.event.providerLineId);
  if (!line) {
    return { accepted: false, reason: "line_not_found" };
  }

  let status: LineStatus | null = null;
  if (input.event.type === "line_suspended") {
    status = "suspended";
  } else if (input.event.type === "line_reactivated") {
    status = "active";
  } else if (input.event.type === "line_terminated") {
    status = "terminated";
  }

  if (status) {
    line.status = status;
    line.updatedAt = now();
    appendAuditLog(line.tenantId, "provider.webhook_applied", "line", line.id, {
      eventType: input.event.type,
      providerLineId: line.providerLineId,
    });
  }

  if (status === "suspended") {
    upsertAlert(
      line.tenantId,
      `${currentMonthKey()}:line:${line.id}:provider-suspended`,
      "info",
      "Provider reported line suspension.",
      line.id,
      line.employeeId,
    );
  }

  return { accepted: true };
}

export function listAuditLogs(tenantId: string): AuditLog[] {
  getTenantOrThrow(tenantId);
  return getStore()
    .auditLogs.filter((entry) => entry.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
