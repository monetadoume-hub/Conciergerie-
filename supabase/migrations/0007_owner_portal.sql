-- Owner portal (cahier des charges §16): a dedicated, restricted account for
-- property owners. Adding this role exposes a gap in the existing RLS
-- policies — several "agency isolation" policies below only ever checked
-- agency_id, with no role check, which would have let an owner (or even a
-- cleaner) inherit full staff-level access to every table in their agency
-- simply by sharing its agency_id. This migration closes that gap at the
-- same time as introducing the owner role, rather than leaving it open.

alter table users drop constraint users_role_check;
alter table users add constraint users_role_check check (role in ('admin', 'staff', 'cleaner', 'owner'));
alter table users add column owner_id uuid references owners (id) on delete cascade;

create function current_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select owner_id from users where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Tighten existing "agency isolation" policies to admin/staff only, then add
-- narrow, purpose-built policies for the owner (and, where already relied
-- upon by the app, the cleaner) role on top.
-- ---------------------------------------------------------------------------
alter policy "agency isolation - owners" on owners
  using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

create policy "owners can read their own profile" on owners
  for select using (id = current_owner_id());

alter policy "agency isolation - properties" on properties
  using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

create policy "owners can read their own properties" on properties
  for select using (owner_id = current_owner_id());

alter policy "agency isolation - bookings" on bookings
  using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

create policy "owners can read bookings for their properties" on bookings
  for select using (property_id in (select id from properties where owner_id = current_owner_id()));

create policy "cleaners can read bookings for their assigned properties" on bookings
  for select using (
    property_id in (select property_id from cleaning_tasks where assigned_to = auth.uid())
  );

alter policy "agency isolation - incidents" on incidents
  using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

create policy "cleaners can report incidents" on incidents
  for insert with check (agency_id = current_agency_id() and current_role() = 'cleaner');

create policy "owners can read incidents on their properties" on incidents
  for select using (property_id in (select id from properties where owner_id = current_owner_id()));

alter policy "agency isolation - expenses" on expenses
  using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

create policy "owners can read expenses on their properties" on expenses
  for select using (property_id in (select id from properties where owner_id = current_owner_id()));

-- These four are agency-internal only — no owner or cleaner access is
-- exercised anywhere in the app, so tightening them is a pure fix.
alter policy "agency isolation - message templates" on message_templates
  using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

alter policy "agency isolation - scheduled messages" on scheduled_messages
  using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

alter policy "agency isolation - guest messages" on guest_messages
  using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

alter policy "agency isolation - notifications" on notifications
  using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

-- ---------------------------------------------------------------------------
-- Owner <-> agency message thread (§16 OwnerMessage model). Damage/incident
-- claims surface here as structured cards (via incident_id), never as a
-- number that could drift from the one shown in the monthly report.
-- ---------------------------------------------------------------------------
create table owner_messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  owner_id uuid not null references owners (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  sender text not null check (sender in ('owner', 'agency')),
  body text not null,
  incident_id uuid references incidents (id) on delete set null,
  attachments text[] not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index owner_messages_agency_id_idx on owner_messages (agency_id, created_at desc);
create index owner_messages_owner_id_idx on owner_messages (owner_id, created_at desc);

alter table owner_messages enable row level security;

create policy "agency staff can manage owner messages" on owner_messages
  for all using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

create policy "owners can read their own message thread" on owner_messages
  for select using (owner_id = current_owner_id());

create policy "owners can send messages on their own thread" on owner_messages
  for insert with check (
    owner_id = current_owner_id()
    and sender = 'owner'
    and property_id in (select id from properties where owner_id = current_owner_id())
    and agency_id = (select agency_id from owners where id = current_owner_id())
  );
