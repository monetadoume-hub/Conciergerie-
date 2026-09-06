-- Damage claim dossier: enough structured detail on an Incident to compile a
-- complete file (nature, date, photos, quotes/invoices, total cost) ready to
-- hand to Airbnb's Resolution Center, an insurer, or the guest — see the
-- module comment in src/lib/pdf/damageClaim.ts for why this stops at
-- producing that file rather than submitting it anywhere automatically.

alter table incidents add column damage_type text;
alter table incidents add column damage_date date;

create table incident_documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  incident_id uuid not null references incidents (id) on delete cascade,
  type text not null check (type in ('devis', 'facture', 'autre')),
  label text not null,
  file_url text not null,
  amount numeric(10, 2),
  artisan_name text,
  created_at timestamptz not null default now()
);

create index incident_documents_incident_id_idx on incident_documents (incident_id);

alter table incident_documents enable row level security;

create policy "agency staff manage incident documents" on incident_documents
  for all using (agency_id = current_agency_id() and current_role() in ('admin', 'staff'))
  with check (agency_id = current_agency_id() and current_role() in ('admin', 'staff'));

-- Quotes/invoices carry pricing detail beyond what the owner's report already
-- summarises (repair_cost) — kept agency-only rather than added to the
-- owner-facing incident policy from 0007_owner_portal.sql.
