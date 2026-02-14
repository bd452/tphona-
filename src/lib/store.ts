import { getEsimProvider } from "@/lib/esim";
import type { ProviderWebhookEvent } from "@/lib/esim/types";
import { AppError } from "@/lib/app-error";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  Alert,
  AlertSeverity,
  AuditLog,
  Employee,
  Line,
  LineStatus,
  Plan,
  Role,
  SpendSummary,
  Tenant,
  UsageLineSummary,
} from "@/lib/types";

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  provider: string;
  created_at: string;
}

interface TenantDomainRow {
  tenant_id: string;
  host: string;
}

interface MembershipRow {
  tenant_id: string;
  user_email: string;
  role: Role;
}

interface EmployeeRow {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  team: string;
  cost_center: string;
  monthly_data_cap_mb: number;
  is_active: boolean;
  created_at: string;
}

interface PlanRow {
  id: string;
  tenant_id: string | null;
  name: string;
  included_data_mb: number;
  monthly_price_usd: number;
  overage_usd_per_mb: number;
  roaming_enabled: boolean;
}

interface LineRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  provider: string;
  provider_line_id: string;
  iccid: string;
  activation_code: string;
  status: LineStatus;
  plan_id: string;
  data_allocated_mb: number;
  monthly_price_usd: number;
  roaming_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface UsageEventRow {
  line_id: string;
  mb_used: number;
}

interface AlertRow {
  id: string;
  tenant_id: string;
  key: string;
  line_id: string | null;
  employee_id: string | null;
  severity: AlertSeverity;
  status: "open" | "resolved";
  message: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  employees: number;
  activeLines: number;
  suspendedLines: number;
  openAlerts: number;
  monthlyUsageMb: number;
  estimatedMonthlyCostUsd: number;
}

interface UsageSummary {
  month: string;
  totalUsedMb: number;
  lines: UsageLineSummary[];
}

interface SyncResult {
  eventsIngested: number;
  alertsOpened: number;
}

const SYSTEM_ACTOR = "system@tphona.local";
const PLAN_WRITE_ROLES: Role[] = ["owner", "admin", "manager"];
const USAGE_SYNC_ROLES: Role[] = ["owner", "admin", "finance"];
const READ_ROLES: Role[] = ["owner", "admin", "finance", "manager", "viewer"];

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapTenant(row: TenantRow, domains: string[]): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    domains,
    provider: "1global",
    createdAt: row.created_at,
  };
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    email: row.email,
    team: row.team,
    costCenter: row.cost_center,
    monthlyDataCapMb: row.monthly_data_cap_mb,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    includedDataMb: row.included_data_mb,
    monthlyPriceUsd: row.monthly_price_usd,
    overageUsdPerMb: row.overage_usd_per_mb,
    roamingEnabled: row.roaming_enabled,
  };
}

function mapLine(row: LineRow): Line {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    provider: "1global",
    providerLineId: row.provider_line_id,
    iccid: row.iccid,
    activationCode: row.activation_code,
    status: row.status,
    planId: row.plan_id,
    dataAllocatedMb: row.data_allocated_mb,
    monthlyPriceUsd: row.monthly_price_usd,
    roamingEnabled: row.roaming_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    key: row.key,
    lineId: row.line_id ?? undefined,
    employeeId: row.employee_id ?? undefined,
    severity: row.severity,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function handleDbError(error: { message: string } | null, fallbackMessage: string): void {
  if (error) {
    throw new AppError(500, `${fallbackMessage}: ${error.message}`);
  }
}

async function assertTenantMembership(
  tenantId: string,
  actorEmail: string,
  allowedRoles: Role[] = READ_ROLES,
): Promise<Role> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_email", actorEmail)
    .maybeSingle<Pick<MembershipRow, "role">>();

  handleDbError(error, "Failed to validate tenant membership");

  if (!data) {
    throw new AppError(404, "Tenant not found.");
  }

  if (!allowedRoles.includes(data.role)) {
    throw new AppError(403, "Forbidden.");
  }

  return data.role;
}

async function getTenantDomains(tenantIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (tenantIds.length === 0) {
    return map;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenant_domains")
    .select("tenant_id,host")
    .in("tenant_id", tenantIds)
    .returns<TenantDomainRow[]>();

  handleDbError(error, "Failed to load tenant domains");

  for (const row of data ?? []) {
    const existing = map.get(row.tenant_id) ?? [];
    existing.push(row.host);
    map.set(row.tenant_id, existing);
  }

  return map;
}

async function getTenantRowById(tenantId: string): Promise<TenantRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("id,slug,name,provider,created_at")
    .eq("id", tenantId)
    .maybeSingle<TenantRow>();

  handleDbError(error, "Failed to fetch tenant");
  return data ?? null;
}

async function getTenantRowBySlug(tenantSlug: string): Promise<TenantRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("id,slug,name,provider,created_at")
    .eq("slug", tenantSlug)
    .maybeSingle<TenantRow>();

  handleDbError(error, "Failed to fetch tenant");
  return data ?? null;
}

async function getEmployeeRow(tenantId: string, employeeId: string): Promise<EmployeeRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", employeeId)
    .maybeSingle<EmployeeRow>();
  handleDbError(error, "Failed to load employee");
  if (!data) {
    throw new AppError(404, "Employee not found.");
  }
  return data;
}

async function getLineRow(tenantId: string, lineId: string): Promise<LineRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lines")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", lineId)
    .maybeSingle<LineRow>();
  handleDbError(error, "Failed to load line");
  if (!data) {
    throw new AppError(404, "Line not found.");
  }
  return data;
}

async function getPlanRowForTenant(tenantId: string, planId: string): Promise<PlanRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .maybeSingle<PlanRow>();

  handleDbError(error, "Failed to load plan");
  if (!data) {
    throw new AppError(404, "Plan not found for tenant.");
  }
  return data;
}

async function appendAuditLog(
  tenantId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
  actor: string = SYSTEM_ACTOR,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("audit_logs").insert({
    tenant_id: tenantId,
    action,
    actor,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
  handleDbError(error, "Failed to append audit log");
}

async function upsertAlert(
  tenantId: string,
  key: string,
  severity: AlertSeverity,
  message: string,
  lineId?: string,
  employeeId?: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: findError } = await supabase
    .from("alerts")
    .select("id,status")
    .eq("tenant_id", tenantId)
    .eq("key", key)
    .maybeSingle<{ id: string; status: "open" | "resolved" }>();
  handleDbError(findError, "Failed to check alert state");

  if (existing) {
    if (existing.status === "resolved") {
      const { error: updateError } = await supabase
        .from("alerts")
        .update({
          status: "open",
          message,
          severity,
          line_id: lineId ?? null,
          employee_id: employeeId ?? null,
        })
        .eq("id", existing.id);
      handleDbError(updateError, "Failed to reopen alert");
    }
    return false;
  }

  const { error: insertError } = await supabase.from("alerts").insert({
    tenant_id: tenantId,
    key,
    severity,
    status: "open",
    message,
    line_id: lineId ?? null,
    employee_id: employeeId ?? null,
  });
  handleDbError(insertError, "Failed to create alert");
  return true;
}

async function fetchUsageByLineCurrentMonth(tenantId: string): Promise<Map<string, number>> {
  const bounds = monthBounds();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("usage_events")
    .select("line_id,mb_used")
    .eq("tenant_id", tenantId)
    .gte("occurred_at", bounds.start)
    .lt("occurred_at", bounds.end)
    .returns<UsageEventRow[]>();

  handleDbError(error, "Failed to load usage events");

  const usageByLine = new Map<string, number>();
  for (const row of data ?? []) {
    usageByLine.set(row.line_id, (usageByLine.get(row.line_id) ?? 0) + row.mb_used);
  }
  return usageByLine;
}

async function getUsageSummaryInternal(tenantId: string): Promise<UsageSummary> {
  const [employeeRows, lineRows] = await Promise.all([
    listEmployeeRows(tenantId),
    listLineRows(tenantId),
  ]);
  const usageByLine = await fetchUsageByLineCurrentMonth(tenantId);
  const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]));

  const lines: UsageLineSummary[] = lineRows.map((line) => {
    const employee = employeeById.get(line.employee_id);
    const usedMb = usageByLine.get(line.id) ?? 0;
    const allocatedMb = Math.max(1, line.data_allocated_mb);
    return {
      lineId: line.id,
      employeeId: line.employee_id,
      employeeName: employee?.name ?? "Unknown employee",
      team: employee?.team ?? "Unknown team",
      costCenter: employee?.cost_center ?? "Unknown cost center",
      status: line.status,
      usedMb,
      allocatedMb,
      usagePct: (usedMb / allocatedMb) * 100,
    };
  });

  lines.sort((a, b) => b.usedMb - a.usedMb);
  const totalUsedMb = lines.reduce((acc, line) => acc + line.usedMb, 0);

  return {
    month: currentMonthKey(),
    totalUsedMb,
    lines,
  };
}

async function evaluatePoliciesForTenant(tenantId: string): Promise<number> {
  const usage = await getUsageSummaryInternal(tenantId);
  let created = 0;

  for (const line of usage.lines) {
    if (line.status === "terminated") {
      continue;
    }

    if (line.usagePct >= 100) {
      const inserted = await upsertAlert(
        tenantId,
        `${usage.month}:line:${line.lineId}:hard-cap`,
        "critical",
        `${line.employeeName} exceeded allocated data by ${Math.round(line.usagePct - 100)}%.`,
        line.lineId,
        line.employeeId,
      );
      created += inserted ? 1 : 0;
      continue;
    }

    if (line.usagePct >= 80) {
      const inserted = await upsertAlert(
        tenantId,
        `${usage.month}:line:${line.lineId}:soft-cap`,
        "warning",
        `${line.employeeName} crossed 80% of monthly data allocation.`,
        line.lineId,
        line.employeeId,
      );
      created += inserted ? 1 : 0;
    }
  }

  return created;
}

async function listEmployeeRows(tenantId: string): Promise<EmployeeRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .returns<EmployeeRow[]>();
  handleDbError(error, "Failed to list employees");
  return data ?? [];
}

async function listPlanRows(tenantId: string): Promise<PlanRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .order("monthly_price_usd", { ascending: true })
    .returns<PlanRow[]>();
  handleDbError(error, "Failed to list plans");
  return data ?? [];
}

async function listLineRows(tenantId: string): Promise<LineRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lines")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<LineRow[]>();
  handleDbError(error, "Failed to list lines");
  return data ?? [];
}

export async function listTenants(actorEmail: string): Promise<Tenant[]> {
  const supabase = getSupabaseAdmin();

  const { data: membershipRows, error: membershipError } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_email", actorEmail)
    .returns<Array<Pick<MembershipRow, "tenant_id">>>();
  handleDbError(membershipError, "Failed to list memberships");

  const tenantIds = [...new Set((membershipRows ?? []).map((membership) => membership.tenant_id))];
  if (tenantIds.length === 0) {
    return [];
  }

  const { data: tenantRows, error: tenantError } = await supabase
    .from("tenants")
    .select("id,slug,name,provider,created_at")
    .in("id", tenantIds)
    .order("name", { ascending: true })
    .returns<TenantRow[]>();
  handleDbError(tenantError, "Failed to load tenants");

  const domainsByTenant = await getTenantDomains(tenantIds);
  return (tenantRows ?? []).map((row) => mapTenant(row, domainsByTenant.get(row.id) ?? []));
}

export async function getTenantById(
  tenantId: string,
  actorEmail: string,
): Promise<Tenant | undefined> {
  const tenantRow = await getTenantRowById(tenantId);
  if (!tenantRow) {
    return undefined;
  }

  try {
    await assertTenantMembership(tenantRow.id, actorEmail);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      return undefined;
    }
    throw error;
  }

  const domains = await getTenantDomains([tenantRow.id]);
  return mapTenant(tenantRow, domains.get(tenantRow.id) ?? []);
}

export async function getTenantBySlug(
  tenantSlug: string,
  actorEmail: string,
): Promise<Tenant | undefined> {
  const tenantRow = await getTenantRowBySlug(tenantSlug);
  if (!tenantRow) {
    return undefined;
  }

  try {
    await assertTenantMembership(tenantRow.id, actorEmail);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      return undefined;
    }
    throw error;
  }

  const domains = await getTenantDomains([tenantRow.id]);
  return mapTenant(tenantRow, domains.get(tenantRow.id) ?? []);
}

export async function listEmployees(tenantId: string, actorEmail: string): Promise<Employee[]> {
  await assertTenantMembership(tenantId, actorEmail);
  return (await listEmployeeRows(tenantId)).map(mapEmployee);
}

export async function createEmployee(input: {
  tenantId: string;
  actorEmail: string;
  name: string;
  email: string;
  team: string;
  costCenter: string;
  monthlyDataCapMb: number;
}): Promise<Employee> {
  await assertTenantMembership(input.tenantId, input.actorEmail, PLAN_WRITE_ROLES);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      email: input.email,
      team: input.team,
      cost_center: input.costCenter,
      monthly_data_cap_mb: input.monthlyDataCapMb,
      is_active: true,
    })
    .select("*")
    .single<EmployeeRow>();
  handleDbError(error, "Failed to create employee");
  if (!data) {
    throw new AppError(500, "Employee insert did not return a row.");
  }

  await appendAuditLog(input.tenantId, "employee.created", "employee", data.id, {
    email: data.email,
    actorEmail: input.actorEmail,
  });

  return mapEmployee(data);
}

export async function listPlans(tenantId: string, actorEmail: string): Promise<Plan[]> {
  await assertTenantMembership(tenantId, actorEmail);
  return (await listPlanRows(tenantId)).map(mapPlan);
}

export async function listLines(tenantId: string, actorEmail: string): Promise<Line[]> {
  await assertTenantMembership(tenantId, actorEmail);
  return (await listLineRows(tenantId)).map(mapLine);
}

export async function provisionLine(input: {
  tenantId: string;
  actorEmail: string;
  employeeId: string;
  planId: string;
}): Promise<Line> {
  await assertTenantMembership(input.tenantId, input.actorEmail, PLAN_WRITE_ROLES);
  const tenant = await getTenantRowById(input.tenantId);
  if (!tenant) {
    throw new AppError(404, "Tenant not found.");
  }

  const [employee, plan] = await Promise.all([
    getEmployeeRow(input.tenantId, input.employeeId),
    getPlanRowForTenant(input.tenantId, input.planId),
  ]);

  const provider = getEsimProvider("1global");
  const issued = await provider.issueEsim({
    tenantId: input.tenantId,
    employeeId: employee.id,
  });

  await provider.assignPlan({
    providerLineId: issued.providerLineId,
    planExternalId: plan.id,
  });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lines")
    .insert({
      tenant_id: input.tenantId,
      employee_id: employee.id,
      provider: tenant.provider,
      provider_line_id: issued.providerLineId,
      iccid: issued.iccid,
      activation_code: issued.activationCode,
      status: "active",
      plan_id: plan.id,
      data_allocated_mb: plan.included_data_mb,
      monthly_price_usd: plan.monthly_price_usd,
      roaming_enabled: plan.roaming_enabled,
    })
    .select("*")
    .single<LineRow>();
  handleDbError(error, "Failed to provision line");
  if (!data) {
    throw new AppError(500, "Line provision insert did not return a row.");
  }

  await appendAuditLog(input.tenantId, "line.provisioned", "line", data.id, {
    actorEmail: input.actorEmail,
    employeeId: employee.id,
    planId: plan.id,
  });

  return mapLine(data);
}

export async function updateLineStatus(input: {
  tenantId: string;
  actorEmail: string;
  lineId: string;
  status: Exclude<LineStatus, "provisioning">;
}): Promise<Line> {
  await assertTenantMembership(input.tenantId, input.actorEmail, PLAN_WRITE_ROLES);
  const line = await getLineRow(input.tenantId, input.lineId);
  const provider = getEsimProvider("1global");

  if (input.status === "suspended") {
    await provider.suspendLine({ providerLineId: line.provider_line_id });
  } else if (input.status === "active") {
    await provider.reactivateLine({ providerLineId: line.provider_line_id });
  } else if (input.status === "terminated") {
    await provider.terminateLine({ providerLineId: line.provider_line_id });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lines")
    .update({ status: input.status })
    .eq("id", line.id)
    .eq("tenant_id", input.tenantId)
    .select("*")
    .single<LineRow>();
  handleDbError(error, "Failed to update line status");
  if (!data) {
    throw new AppError(500, "Line status update did not return a row.");
  }

  await appendAuditLog(input.tenantId, "line.status_changed", "line", line.id, {
    actorEmail: input.actorEmail,
    status: input.status,
  });

  return mapLine(data);
}

export async function changeLinePlan(input: {
  tenantId: string;
  actorEmail: string;
  lineId: string;
  planId: string;
}): Promise<Line> {
  await assertTenantMembership(input.tenantId, input.actorEmail, PLAN_WRITE_ROLES);
  const [line, plan] = await Promise.all([
    getLineRow(input.tenantId, input.lineId),
    getPlanRowForTenant(input.tenantId, input.planId),
  ]);

  const provider = getEsimProvider("1global");
  await provider.changePlan({
    providerLineId: line.provider_line_id,
    planExternalId: plan.id,
  });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lines")
    .update({
      plan_id: plan.id,
      data_allocated_mb: plan.included_data_mb,
      monthly_price_usd: plan.monthly_price_usd,
      roaming_enabled: plan.roaming_enabled,
    })
    .eq("id", line.id)
    .eq("tenant_id", input.tenantId)
    .select("*")
    .single<LineRow>();
  handleDbError(error, "Failed to change line plan");
  if (!data) {
    throw new AppError(500, "Line plan update did not return a row.");
  }

  await appendAuditLog(input.tenantId, "line.plan_changed", "line", line.id, {
    actorEmail: input.actorEmail,
    planId: plan.id,
  });

  return mapLine(data);
}

export async function setLineAllocation(input: {
  tenantId: string;
  actorEmail: string;
  lineId: string;
  dataAllocatedMb: number;
}): Promise<Line> {
  await assertTenantMembership(input.tenantId, input.actorEmail, PLAN_WRITE_ROLES);
  await getLineRow(input.tenantId, input.lineId);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lines")
    .update({
      data_allocated_mb: input.dataAllocatedMb,
    })
    .eq("id", input.lineId)
    .eq("tenant_id", input.tenantId)
    .select("*")
    .single<LineRow>();
  handleDbError(error, "Failed to update line allocation");
  if (!data) {
    throw new AppError(500, "Line allocation update did not return a row.");
  }

  await appendAuditLog(input.tenantId, "line.allocation_updated", "line", input.lineId, {
    actorEmail: input.actorEmail,
    dataAllocatedMb: input.dataAllocatedMb,
  });

  return mapLine(data);
}

export async function syncUsageForTenant(
  tenantId: string,
  actorEmail: string,
): Promise<SyncResult> {
  await assertTenantMembership(tenantId, actorEmail, USAGE_SYNC_ROLES);
  const tenant = await getTenantRowById(tenantId);
  if (!tenant) {
    throw new AppError(404, "Tenant not found.");
  }

  const provider = getEsimProvider("1global");
  const lines = await listLineRows(tenantId);
  let eventsIngested = 0;
  const usageInsertBatch: Array<{
    tenant_id: string;
    line_id: string;
    mb_used: number;
    source: "sync";
    occurred_at: string;
  }> = [];

  for (const line of lines) {
    if (line.status !== "active") {
      continue;
    }

    const records = await provider.fetchUsage({ providerLineId: line.provider_line_id });
    for (const record of records) {
      usageInsertBatch.push({
        tenant_id: tenant.id,
        line_id: line.id,
        mb_used: record.mbUsed,
        source: "sync",
        occurred_at: record.occurredAt,
      });
      eventsIngested += 1;
    }
  }

  if (usageInsertBatch.length > 0) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("usage_events").insert(usageInsertBatch);
    handleDbError(error, "Failed to ingest usage events");
  }

  const alertsOpened = await evaluatePoliciesForTenant(tenantId);

  await appendAuditLog(tenantId, "usage.synced", "usage_sync", tenantId, {
    actorEmail,
    eventsIngested,
    alertsOpened,
  });

  return { eventsIngested, alertsOpened };
}

export async function getUsageSummary(
  tenantId: string,
  actorEmail: string,
): Promise<UsageSummary> {
  await assertTenantMembership(tenantId, actorEmail);
  return getUsageSummaryInternal(tenantId);
}

export async function getSpendSummary(
  tenantId: string,
  actorEmail: string,
): Promise<SpendSummary> {
  await assertTenantMembership(tenantId, actorEmail);

  const [usage, lineRows, planRows] = await Promise.all([
    getUsageSummaryInternal(tenantId),
    listLineRows(tenantId),
    listPlanRows(tenantId),
  ]);
  const planById = new Map(planRows.map((plan) => [plan.id, plan]));
  const usageByLine = new Map(usage.lines.map((line) => [line.lineId, line]));

  const byTeam: Record<string, number> = {};
  const byCostCenter: Record<string, number> = {};

  const lines = lineRows.map((lineRow) => {
    const usageLine = usageByLine.get(lineRow.id);
    const plan = planById.get(lineRow.plan_id);

    const baseCostUsd = lineRow.status === "terminated" ? 0 : lineRow.monthly_price_usd;
    const overageMb = Math.max(0, (usageLine?.usedMb ?? 0) - lineRow.data_allocated_mb);
    const overageCostUsd = roundCurrency(overageMb * (plan?.overage_usd_per_mb ?? 0));
    const totalCostUsd = roundCurrency(baseCostUsd + overageCostUsd);

    if (usageLine) {
      byTeam[usageLine.team] = roundCurrency((byTeam[usageLine.team] ?? 0) + totalCostUsd);
      byCostCenter[usageLine.costCenter] = roundCurrency(
        (byCostCenter[usageLine.costCenter] ?? 0) + totalCostUsd,
      );
    }

    return {
      lineId: lineRow.id,
      employeeName: usageLine?.employeeName ?? "Unknown employee",
      team: usageLine?.team ?? "Unknown team",
      costCenter: usageLine?.costCenter ?? "Unknown cost center",
      baseCostUsd,
      overageCostUsd,
      totalCostUsd,
    };
  });

  const totalBaseCostUsd = roundCurrency(lines.reduce((sum, line) => sum + line.baseCostUsd, 0));
  const totalOverageCostUsd = roundCurrency(lines.reduce((sum, line) => sum + line.overageCostUsd, 0));
  const totalCostUsd = roundCurrency(totalBaseCostUsd + totalOverageCostUsd);

  return {
    month: currentMonthKey(),
    totalBaseCostUsd,
    totalOverageCostUsd,
    totalCostUsd,
    byTeam,
    byCostCenter,
    lines: lines.sort((a, b) => b.totalCostUsd - a.totalCostUsd),
  };
}

export async function listAlerts(tenantId: string, actorEmail: string): Promise<Alert[]> {
  await assertTenantMembership(tenantId, actorEmail);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<AlertRow[]>();
  handleDbError(error, "Failed to list alerts");
  return (data ?? []).map(mapAlert);
}

export async function getDashboardStats(
  tenantId: string,
  actorEmail: string,
): Promise<DashboardStats> {
  const [employees, lines, alerts, usage, spend] = await Promise.all([
    listEmployees(tenantId, actorEmail),
    listLines(tenantId, actorEmail),
    listAlerts(tenantId, actorEmail),
    getUsageSummary(tenantId, actorEmail),
    getSpendSummary(tenantId, actorEmail),
  ]);

  return {
    employees: employees.length,
    activeLines: lines.filter((line) => line.status === "active").length,
    suspendedLines: lines.filter((line) => line.status === "suspended").length,
    openAlerts: alerts.filter((alert) => alert.status === "open").length,
    monthlyUsageMb: usage.totalUsedMb,
    estimatedMonthlyCostUsd: spend.totalCostUsd,
  };
}

export async function ingestProviderWebhook(input: {
  provider: "1global";
  event: ProviderWebhookEvent;
}): Promise<{ accepted: boolean; reason?: string }> {
  const supabase = getSupabaseAdmin();
  const { error: receiptInsertError } = await supabase.from("webhook_event_receipts").insert({
    provider: input.provider,
    external_event_id: input.event.id,
  });

  if (receiptInsertError?.code === "23505") {
    return { accepted: true, reason: "duplicate_event" };
  }
  handleDbError(receiptInsertError, "Failed to record webhook event");

  const { data: line, error: lineLookupError } = await supabase
    .from("lines")
    .select("*")
    .eq("provider_line_id", input.event.providerLineId)
    .maybeSingle<LineRow>();
  handleDbError(lineLookupError, "Failed to lookup line by provider id");

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
    const { error: updateError } = await supabase
      .from("lines")
      .update({ status })
      .eq("id", line.id);
    handleDbError(updateError, "Failed to apply webhook line status");

    await appendAuditLog(
      line.tenant_id,
      "provider.webhook_applied",
      "line",
      line.id,
      {
        eventType: input.event.type,
        providerLineId: input.event.providerLineId,
      },
      "provider:1global",
    );
  }

  if (status === "suspended") {
    await upsertAlert(
      line.tenant_id,
      `${currentMonthKey()}:line:${line.id}:provider-suspended`,
      "info",
      "Provider reported line suspension.",
      line.id,
      line.employee_id,
    );
  }

  return { accepted: true };
}

export async function listAuditLogs(
  tenantId: string,
  actorEmail: string,
): Promise<AuditLog[]> {
  await assertTenantMembership(tenantId, actorEmail, ["owner", "admin", "finance"]);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        tenant_id: string;
        action: string;
        actor: string;
        entity_type: string;
        entity_id: string;
        details: Record<string, unknown>;
        created_at: string;
      }>
    >();
  handleDbError(error, "Failed to list audit logs");

  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    action: row.action,
    actor: row.actor,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details,
    createdAt: row.created_at,
  }));
}
