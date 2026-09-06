-- Expenses (cahier des charges §4, §5.5): feeds directly into the owner
-- monthly report net calculation (revenus - commission - dépenses).

create table expenses (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  category text not null,
  amount numeric(10, 2) not null,
  expense_date date not null default current_date,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index expenses_agency_id_idx on expenses (agency_id);
create index expenses_property_id_idx on expenses (property_id, expense_date);

alter table expenses enable row level security;

create policy "agency isolation - expenses" on expenses
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());
