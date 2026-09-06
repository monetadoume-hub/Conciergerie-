-- Read-only, unauthenticated access to a single stay's digital guidebook.
-- Guests never get an account (see cahier des charges §14, §6): they reach
-- this data exclusively through the unguessable per-booking `guide_token`,
-- via this SECURITY DEFINER function rather than any table grant.

create function get_guest_guide(p_guide_token uuid)
returns table (
  property_name text,
  property_address text,
  access_code text,
  guidebook_content jsonb,
  guest_name text,
  checkin date,
  checkout date,
  agency_name text,
  agency_whatsapp_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.name,
    p.address,
    p.access_code,
    p.guidebook_content,
    b.guest_name,
    b.checkin,
    b.checkout,
    a.name,
    a.whatsapp_number
  from bookings b
  join properties p on p.id = b.property_id
  join agencies a on a.id = b.agency_id
  where b.guide_token = p_guide_token
    and b.status = 'confirmed';
$$;

-- Allow the anonymous (unauthenticated) role to call this single function only.
grant execute on function get_guest_guide(uuid) to anon;
