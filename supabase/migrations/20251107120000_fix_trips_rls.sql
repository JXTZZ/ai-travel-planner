-- Fix trips table RLS policies
-- This migration ensures that authenticated users can create trips

-- Drop existing policies if they exist
drop policy if exists "Users can insert their trips" on trips;

-- Recreate the insert policy with better error handling
create policy "Users can insert their trips" on trips
for insert 
to authenticated
with check (
  auth.uid() is not null 
  and owner_id = auth.uid()
);

-- Also ensure the select policy works correctly
drop policy if exists "Users can view trips they own or join" on trips;

create policy "Users can view trips they own or join" on trips
for select 
to authenticated
using (
  auth.uid() is not null
  and (
    owner_id = auth.uid()
    or exists (
      select 1 from trip_members tm
      where tm.trip_id = trips.id
      and tm.user_id = auth.uid()
    )
  )
);

-- Verify RLS is enabled
alter table trips enable row level security;

-- Grant necessary permissions
grant insert on trips to authenticated;
grant select on trips to authenticated;
grant update on trips to authenticated;
grant delete on trips to authenticated;
