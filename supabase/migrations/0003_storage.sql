-- Storage buckets for cleaning-completion photos and incident photos.
-- Buckets are public-read (photos are only ever linked from authenticated
-- agency screens or the guest guide never links them) but writes require
-- an authenticated session belonging to the same agency as the task.

insert into storage.buckets (id, name, public)
values ('cleaning-photos', 'cleaning-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', true)
on conflict (id) do nothing;

create policy "authenticated users can upload cleaning photos"
  on storage.objects for insert
  with check (bucket_id = 'cleaning-photos' and auth.role() = 'authenticated');

create policy "anyone can view cleaning photos"
  on storage.objects for select
  using (bucket_id = 'cleaning-photos');

create policy "authenticated users can upload incident photos"
  on storage.objects for insert
  with check (bucket_id = 'incident-photos' and auth.role() = 'authenticated');

create policy "anyone can view incident photos"
  on storage.objects for select
  using (bucket_id = 'incident-photos');
