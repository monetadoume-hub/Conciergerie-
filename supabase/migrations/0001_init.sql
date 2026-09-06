-- Phase 1 schema: single/multi-agency ready, Row Level Security enforced from day one.
-- Run via `supabase db push` or the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Agencies
-- ---------------------------------------------------------------------------
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'agence_plus')),
  commission_rate_default numeric(5, 2) not null default 20.0,
  logo_url text,
  brand_color text,
  whatsapp_number text,
  created_at timestamptz not null default now()
);

-- Profile table mirroring auth.users, carrying agency membership + role.
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  agency_id uuid not null references agencies (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'staff', 'cleaner')),
  created_at timestamptz not null default now()
);

create index users_agency_id_idx on users (agency_id);

-- Helper: agency_id of the currently authenticated user (used by every policy below).
create function current_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from users where id = auth.uid();
$$;

create function current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from users where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Owners
-- ---------------------------------------------------------------------------
create table owners (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  commission_rate numeric(5, 2),
  iban_encrypted text, -- field-level encryption handled at the application layer (see section 20)
  created_at timestamptz not null default now()
);

create index owners_agency_id_idx on owners (agency_id);

-- ---------------------------------------------------------------------------
-- Properties
-- ---------------------------------------------------------------------------
create table properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  owner_id uuid references owners (id) on delete set null,
  name text not null,
  address text,
  photos text[] not null default '{}',
  ical_url_airbnb text,
  ical_url_abritel text,
  ical_url_booking text,
  access_code text,
  guidebook_content jsonb not null default '{}'::jsonb,
  cleaning_checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index properties_agency_id_idx on properties (agency_id);
create index properties_owner_id_idx on properties (owner_id);

-- ---------------------------------------------------------------------------
-- Bookings (deduplicated against iCal feeds via ical_uid)
-- ---------------------------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  source text not null check (source in ('airbnb', 'abritel', 'booking', 'direct')),
  ical_uid text, -- null for bookings created directly in the app
  guest_name text,
  guest_email text,
  guest_phone text,
  checkin date not null,
  checkout date not null,
  price numeric(10, 2),
  deposit_amount numeric(10, 2),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  guide_token uuid not null default gen_random_uuid(), -- public, unauthenticated link for the guest digital guide
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, ical_uid)
);

create index bookings_agency_id_idx on bookings (agency_id);
create index bookings_property_id_idx on bookings (property_id);
create index bookings_checkin_idx on bookings (checkin);
create unique index bookings_guide_token_idx on bookings (guide_token);

-- ---------------------------------------------------------------------------
-- Linen inventory
-- ---------------------------------------------------------------------------
create table linen_inventory (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  item_type text not null,
  quantity integer not null default 0,
  par_level integer not null default 0
);

create index linen_inventory_property_id_idx on linen_inventory (property_id);

-- ---------------------------------------------------------------------------
-- Cleaning tasks
-- ---------------------------------------------------------------------------
create table cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  booking_id uuid references bookings (id) on delete cascade,
  scheduled_date date not null,
  assigned_to uuid references users (id) on delete set null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  linen_checklist jsonb not null default '[]'::jsonb,
  extra_checklist_items jsonb not null default '[]'::jsonb, -- e.g. owner amenities, extra service requests
  checklist_done text[] not null default '{}', -- names of extra_checklist_items already ticked off
  photos_after text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index cleaning_tasks_agency_id_idx on cleaning_tasks (agency_id);
create index cleaning_tasks_property_id_idx on cleaning_tasks (property_id);
create index cleaning_tasks_scheduled_date_idx on cleaning_tasks (scheduled_date);
create index cleaning_tasks_assigned_to_idx on cleaning_tasks (assigned_to);

-- ---------------------------------------------------------------------------
-- Incidents
-- ---------------------------------------------------------------------------
create table incidents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  booking_id uuid references bookings (id) on delete set null,
  reported_by text,
  description text not null,
  photos text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  repair_needed boolean not null default false,
  repair_company text,
  repair_cost numeric(10, 2),
  recovery_source text check (recovery_source in ('caution_locataire', 'assurance', 'agence', 'proprietaire')),
  recovery_status text check (recovery_status in ('en_attente', 'reclame', 'recupere', 'perdu')),
  created_at timestamptz not null default now()
);

create index incidents_agency_id_idx on incidents (agency_id);
create index incidents_property_id_idx on incidents (property_id);

-- ---------------------------------------------------------------------------
-- Message templates & scheduled messages
-- ---------------------------------------------------------------------------
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  trigger text not null check (trigger in ('booking_confirmed', 'before_checkin', 'welcome_day', 'after_checkout', 'custom')),
  channel text not null default 'email' check (channel in ('email', 'whatsapp', 'sms')),
  subject text,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index message_templates_agency_id_idx on message_templates (agency_id);

create table scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  booking_id uuid not null references bookings (id) on delete cascade,
  template_id uuid not null references message_templates (id) on delete cascade,
  send_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index scheduled_messages_agency_id_idx on scheduled_messages (agency_id);
create index scheduled_messages_send_at_idx on scheduled_messages (send_at) where status = 'pending';
create index scheduled_messages_booking_id_idx on scheduled_messages (booking_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — every tenant table is isolated by agency_id.
-- ---------------------------------------------------------------------------
alter table agencies enable row level security;
alter table users enable row level security;
alter table owners enable row level security;
alter table properties enable row level security;
alter table bookings enable row level security;
alter table linen_inventory enable row level security;
alter table cleaning_tasks enable row level security;
alter table incidents enable row level security;
alter table message_templates enable row level security;
alter table scheduled_messages enable row level security;

create policy "agency members can read their agency" on agencies
  for select using (id = current_agency_id());

create policy "agency admins can update their agency" on agencies
  for update using (id = current_agency_id() and current_role() = 'admin');

create policy "users can read their agency colleagues" on users
  for select using (agency_id = current_agency_id());

create policy "admins can manage their agency users" on users
  for insert with check (agency_id = current_agency_id() and current_role() = 'admin');

create policy "admins can update their agency users" on users
  for update using (agency_id = current_agency_id() and current_role() = 'admin');

create policy "admins can delete their agency users" on users
  for delete using (agency_id = current_agency_id() and current_role() = 'admin');

-- Generic per-tenant policy applied to every remaining table: staff/admin see and
-- manage everything in their agency, cleaners only see what is assigned to them.
create policy "agency isolation - owners" on owners
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());

create policy "agency isolation - properties" on properties
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());

create policy "agency isolation - bookings" on bookings
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());

create policy "agency isolation - linen inventory" on linen_inventory
  for all using (
    property_id in (select id from properties where agency_id = current_agency_id())
  ) with check (
    property_id in (select id from properties where agency_id = current_agency_id())
  );

create policy "staff can manage all cleaning tasks" on cleaning_tasks
  for all using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

create policy "cleaners see and update their assigned tasks" on cleaning_tasks
  for select using (agency_id = current_agency_id() and assigned_to = auth.uid());

create policy "cleaners update their assigned tasks" on cleaning_tasks
  for update using (agency_id = current_agency_id() and assigned_to = auth.uid())
  with check (agency_id = current_agency_id() and assigned_to = auth.uid());

create policy "agency isolation - incidents" on incidents
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());

create policy "agency isolation - message templates" on message_templates
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());

create policy "agency isolation - scheduled messages" on scheduled_messages
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());

-- ---------------------------------------------------------------------------
-- Guests never authenticate: the digital guidebook is fetched through a
-- dedicated read-only RPC (see 0002_guest_guide.sql) rather than direct table
-- grants, so no public SELECT policy is added on bookings/properties here.
-- ---------------------------------------------------------------------------
