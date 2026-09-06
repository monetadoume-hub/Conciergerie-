-- Assistant IA — file de messages locataires + notifications agence (cahier
-- des charges §21). Guests reach this exclusively through the guide digital
-- widget (channel = 'widget'), unauthenticated, via a dedicated insert RPC —
-- same pattern as get_guest_guide in 0002_guest_guide.sql.

create table guest_messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  booking_id uuid not null references bookings (id) on delete cascade,
  channel text not null default 'widget' check (channel in ('widget', 'email', 'whatsapp')),
  guest_question text not null,
  ai_draft_response text,
  ai_confidence numeric(3, 2),
  final_response text,
  status text not null default 'en_attente_validation' check (
    status in ('auto_repondu', 'en_attente_validation', 'escalade', 'escalade_urgente', 'resolu')
  ),
  escalation_reason text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index guest_messages_agency_id_idx on guest_messages (agency_id);
create index guest_messages_booking_id_idx on guest_messages (booking_id);
create index guest_messages_status_idx on guest_messages (agency_id, status);

alter table guest_messages enable row level security;

create policy "agency isolation - guest messages" on guest_messages
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());

-- ---------------------------------------------------------------------------
-- Notifications: the agency's alert feed. `severity = 'urgent'` is what
-- triggers the dedicated alarm sound + backup email client-side (§21.3).
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  type text not null check (type in ('ai_rapport', 'ai_escalade', 'incident')),
  severity text not null default 'normal' check (severity in ('normal', 'urgent')),
  title text not null,
  body text,
  related_guest_message_id uuid references guest_messages (id) on delete cascade,
  related_incident_id uuid references incidents (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_agency_id_idx on notifications (agency_id, created_at desc);
create index notifications_unread_idx on notifications (agency_id) where read_at is null;

alter table notifications enable row level security;

create policy "agency isolation - notifications" on notifications
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());

-- ---------------------------------------------------------------------------
-- Guest-facing RPC: insert a question without ever granting the anon role
-- direct table access. Returns the new row's id so the client can poll for
-- the assistant's answer once processed by the server.
-- ---------------------------------------------------------------------------
create function ask_guest_question(p_guide_token uuid, p_question text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
  v_message_id uuid;
begin
  select * into v_booking from bookings where guide_token = p_guide_token and status = 'confirmed';

  if not found then
    raise exception 'Invalid guide token';
  end if;

  insert into guest_messages (agency_id, property_id, booking_id, channel, guest_question)
  values (v_booking.agency_id, v_booking.property_id, v_booking.id, 'widget', p_question)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

grant execute on function ask_guest_question(uuid, text) to anon;

-- Guests poll this to display the assistant's answer once ready, scoped to
-- their own guide_token — never exposes agency-internal fields (drafts,
-- confidence score, escalation reason).
create function get_guest_message_status(p_guide_token uuid, p_message_id uuid)
returns table (status text, final_response text)
language sql
stable
security definer
set search_path = public
as $$
  select gm.status, gm.final_response
  from guest_messages gm
  join bookings b on b.id = gm.booking_id
  where gm.id = p_message_id and b.guide_token = p_guide_token;
$$;

grant execute on function get_guest_message_status(uuid, uuid) to anon;

-- Realtime: the notification bell (§21.3) subscribes to inserts on this
-- table client-side to trigger the urgent alarm sound without polling.
alter publication supabase_realtime add table notifications;
