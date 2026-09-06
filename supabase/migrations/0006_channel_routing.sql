-- Records which channel actually delivered a scheduled message (email today;
-- an Airbnb/Abritel/Booking inbox once official partner API access exists —
-- see src/lib/messaging/channels.ts). Never trust the booking's `source` alone
-- to know how a guest was reached — this column is the ground truth.
alter table scheduled_messages add column channel_used text check (channel_used in ('airbnb_inbox', 'abritel_inbox', 'booking_inbox', 'email'));
