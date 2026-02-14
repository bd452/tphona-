-- Supabase schema for true multi-tenant eSIM SaaS
-- Apply in the Supabase SQL editor or via migration tooling.

create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  provider text not null default '1global',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  host text not null unique,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_email text not null,
  role text not null check (role in ('owner', 'admin', 'finance', 'manager', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, user_email)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  email text not null,
  team text not null,
  cost_center text not null,
  monthly_data_cap_mb integer not null check (monthly_data_cap_mb > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, email)
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  included_data_mb integer not null check (included_data_mb > 0),
  monthly_price_usd numeric(10, 2) not null check (monthly_price_usd >= 0),
  overage_usd_per_mb numeric(10, 4) not null check (overage_usd_per_mb >= 0),
  roaming_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  provider text not null default '1global',
  provider_line_id text not null unique,
  iccid text not null unique,
  activation_code text not null,
  status text not null check (status in ('provisioning', 'active', 'suspended', 'terminated')),
  plan_id uuid not null references public.plans(id),
  data_allocated_mb integer not null check (data_allocated_mb > 0),
  monthly_price_usd numeric(10, 2) not null check (monthly_price_usd >= 0),
  roaming_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  line_id uuid not null references public.lines(id) on delete cascade,
  mb_used integer not null check (mb_used >= 0),
  source text not null check (source in ('sync', 'webhook')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  line_id uuid references public.lines(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, key)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  action text not null,
  actor text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.webhook_event_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  received_at timestamptz not null default timezone('utc', now()),
  unique (provider, external_event_id)
);

create index if not exists idx_memberships_user_email on public.memberships(lower(user_email));
create index if not exists idx_memberships_tenant on public.memberships(tenant_id);
create index if not exists idx_tenant_domains_tenant on public.tenant_domains(tenant_id);
create index if not exists idx_employees_tenant on public.employees(tenant_id);
create index if not exists idx_lines_tenant on public.lines(tenant_id);
create index if not exists idx_lines_status on public.lines(tenant_id, status);
create index if not exists idx_usage_events_tenant_occurred on public.usage_events(tenant_id, occurred_at);
create index if not exists idx_alerts_tenant_created on public.alerts(tenant_id, created_at);
create index if not exists idx_audit_logs_tenant_created on public.audit_logs(tenant_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists trg_lines_updated_at on public.lines;
create trigger trg_lines_updated_at
before update on public.lines
for each row execute function public.set_updated_at();

drop trigger if exists trg_alerts_updated_at on public.alerts;
create trigger trg_alerts_updated_at
before update on public.alerts
for each row execute function public.set_updated_at();

create or replace function public.request_email()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.email', true), '');
$$;

create or replace function public.is_tenant_member(target_tenant uuid, allowed_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.tenant_id = target_tenant
      and lower(m.user_email) = lower(public.request_email())
      and (allowed_roles is null or m.role = any(allowed_roles))
  );
$$;

revoke all on function public.is_tenant_member(uuid, text[]) from public;
grant execute on function public.is_tenant_member(uuid, text[]) to anon, authenticated;

create or replace function public.create_tenant_with_owner(
  p_slug text,
  p_name text,
  p_host text default null
)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_email text;
  created_tenant public.tenants;
  normalized_slug text;
  normalized_host text;
begin
  actor_email := public.request_email();
  if actor_email is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  normalized_slug := lower(trim(p_slug));
  if normalized_slug is null or length(normalized_slug) < 2 then
    raise exception 'Invalid tenant slug.' using errcode = '22023';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Invalid tenant name.' using errcode = '22023';
  end if;

  insert into public.tenants (slug, name, provider)
  values (normalized_slug, trim(p_name), '1global')
  returning * into created_tenant;

  insert into public.memberships (tenant_id, user_email, role)
  values (created_tenant.id, lower(actor_email), 'owner');

  normalized_host := lower(trim(coalesce(p_host, '')));
  if length(normalized_host) > 0 then
    insert into public.tenant_domains (tenant_id, host, is_primary)
    values (created_tenant.id, normalized_host, true);
  end if;

  return created_tenant;
end;
$$;

revoke all on function public.create_tenant_with_owner(text, text, text) from public;
grant execute on function public.create_tenant_with_owner(text, text, text) to authenticated;

alter table public.tenants enable row level security;
alter table public.tenant_domains enable row level security;
alter table public.memberships enable row level security;
alter table public.employees enable row level security;
alter table public.plans enable row level security;
alter table public.lines enable row level security;
alter table public.usage_events enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.webhook_event_receipts enable row level security;

drop policy if exists tenants_read on public.tenants;
create policy tenants_read on public.tenants
for select
using (public.is_tenant_member(id));

drop policy if exists tenants_write on public.tenants;
create policy tenants_write on public.tenants
for all
using (public.is_tenant_member(id, array['owner', 'admin']))
with check (public.is_tenant_member(id, array['owner', 'admin']));

drop policy if exists tenant_domains_read on public.tenant_domains;
create policy tenant_domains_read on public.tenant_domains
for select
using (public.is_tenant_member(tenant_id));

drop policy if exists tenant_domains_write on public.tenant_domains;
create policy tenant_domains_write on public.tenant_domains
for all
using (public.is_tenant_member(tenant_id, array['owner', 'admin']))
with check (public.is_tenant_member(tenant_id, array['owner', 'admin']));

drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships
for select
using (public.is_tenant_member(tenant_id));

drop policy if exists memberships_write on public.memberships;
create policy memberships_write on public.memberships
for all
using (public.is_tenant_member(tenant_id, array['owner', 'admin']))
with check (public.is_tenant_member(tenant_id, array['owner', 'admin']));

drop policy if exists employees_read on public.employees;
create policy employees_read on public.employees
for select
using (public.is_tenant_member(tenant_id));

drop policy if exists employees_write on public.employees;
create policy employees_write on public.employees
for all
using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'manager']))
with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'manager']));

drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans
for select
using (tenant_id is null or public.is_tenant_member(tenant_id));

drop policy if exists plans_write on public.plans;
create policy plans_write on public.plans
for all
using (tenant_id is not null and public.is_tenant_member(tenant_id, array['owner', 'admin']))
with check (tenant_id is not null and public.is_tenant_member(tenant_id, array['owner', 'admin']));

drop policy if exists lines_read on public.lines;
create policy lines_read on public.lines
for select
using (public.is_tenant_member(tenant_id));

drop policy if exists lines_write on public.lines;
create policy lines_write on public.lines
for all
using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'manager']))
with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'manager']));

drop policy if exists usage_events_read on public.usage_events;
create policy usage_events_read on public.usage_events
for select
using (public.is_tenant_member(tenant_id));

drop policy if exists usage_events_write on public.usage_events;
create policy usage_events_write on public.usage_events
for all
using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'finance', 'manager']))
with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'finance', 'manager']));

drop policy if exists alerts_read on public.alerts;
create policy alerts_read on public.alerts
for select
using (public.is_tenant_member(tenant_id));

drop policy if exists alerts_write on public.alerts;
create policy alerts_write on public.alerts
for all
using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'finance', 'manager']))
with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'finance', 'manager']));

drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs
for select
using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'finance']));

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
for insert
with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'finance', 'manager']));

-- Webhook receipts are service-only; no anon/authenticated policies are defined.

-- Seed demo tenants and baseline rows.
insert into public.tenants (id, slug, name, provider)
values
  ('00000000-0000-0000-0000-000000000001', 'acme', 'Acme Industries', '1global'),
  ('00000000-0000-0000-0000-000000000002', 'globex', 'Globex Corporation', '1global')
on conflict (id) do nothing;

insert into public.tenant_domains (tenant_id, host, is_primary)
values
  ('00000000-0000-0000-0000-000000000001', 'acme.localhost', true),
  ('00000000-0000-0000-0000-000000000002', 'globex.localhost', true)
on conflict (host) do nothing;

insert into public.memberships (tenant_id, user_email, role)
values
  ('00000000-0000-0000-0000-000000000001', 'owner@acme.example', 'owner'),
  ('00000000-0000-0000-0000-000000000001', 'finance@acme.example', 'finance'),
  ('00000000-0000-0000-0000-000000000002', 'admin@globex.example', 'owner')
on conflict (tenant_id, user_email) do nothing;

insert into public.plans (id, tenant_id, name, included_data_mb, monthly_price_usd, overage_usd_per_mb, roaming_enabled)
values
  ('10000000-0000-0000-0000-000000000001', null, 'Starter 3GB', 3072, 25.00, 0.0250, false),
  ('10000000-0000-0000-0000-000000000002', null, 'Growth 10GB', 10240, 52.00, 0.0180, true),
  ('10000000-0000-0000-0000-000000000003', null, 'Global 50GB', 51200, 115.00, 0.0100, true)
on conflict (id) do nothing;

insert into public.employees (id, tenant_id, name, email, team, cost_center, monthly_data_cap_mb, is_active)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Jordan Lee', 'jordan.lee@acme.example', 'Sales', 'CC-100', 8192, true),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Taylor Brown', 'taylor.brown@acme.example', 'Operations', 'CC-210', 10240, true),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Casey Nguyen', 'casey.nguyen@globex.example', 'Engineering', 'ENG-44', 12288, true)
on conflict (id) do nothing;

insert into public.lines (id, tenant_id, employee_id, provider, provider_line_id, iccid, activation_code, status, plan_id, data_allocated_mb, monthly_price_usd, roaming_enabled)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '1global', '1g-line-seeded-1', '89882100111111111111', 'LPA:1$rsp.1global.demo$SEEDCODE01', 'active', '10000000-0000-0000-0000-000000000002', 10240, 52.00, true),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '1global', '1g-line-seeded-2', '89882100222222222222', 'LPA:1$rsp.1global.demo$SEEDCODE02', 'suspended', '10000000-0000-0000-0000-000000000001', 3072, 25.00, false)
on conflict (id) do nothing;

insert into public.usage_events (tenant_id, line_id, mb_used, source, occurred_at)
values
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1280, 'sync', timezone('utc', now())),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 1100, 'sync', timezone('utc', now()));
