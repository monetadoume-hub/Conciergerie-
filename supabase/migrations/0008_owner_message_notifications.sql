-- A propriétaire writing into their portal (§16) is its own notification
-- type, not an incident — keeps the agency's notification feed accurate.
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('ai_rapport', 'ai_escalade', 'incident', 'owner_message'));
