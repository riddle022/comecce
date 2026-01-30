
-- Create a private bucket called 'imports'
insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do nothing;

-- Policy to allow authenticated users to upload
create policy "Authenticated can upload"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'imports' );

-- Policy to allow authenticated users to read
create policy "Authenticated can read"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'imports' );
