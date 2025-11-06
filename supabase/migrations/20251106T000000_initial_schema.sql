-- Schema initialization for LoTus'AI assistant
-- Generates core tables and Row Level Security policies.

set search_path = public;

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  title text not null,
  destination text,
  start_date date,
  end_date date,
  party_size int default 1 check (party_size > 0),
  budget_currency char(3) default 'CNY',
  budget_total numeric(12,2),
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'editor' check (role in ('viewer','editor')),
  invited_by uuid references auth.users on delete set null,
  created_at timestamptz default timezone('utc', now()),
  unique(trip_id, user_id)
);

create table if not exists trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  day_index int not null,
  date date,
  summary text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now()),
  unique(trip_id, day_index)
);

create table if not exists trip_activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  day_id uuid references trip_days on delete cascade,
  day_index int,
  order_index int default 0,
  title text not null,
  description text,
  location text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  start_time timestamptz,
  end_time timestamptz,
  cost_estimate numeric(12,2),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  category text,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) default 'CNY',
  note text,
  incurred_at timestamptz default timezone('utc', now()),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists voice_transcripts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  content text not null,
  raw_payload jsonb,
  transcribed_at timestamptz default timezone('utc', now())
);

-- Utility function to reuse trip access logic inside RLS policies.
create or replace function user_can_access_trip(target_trip_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from trips t
    where t.id = target_trip_id
      and (t.owner_id = auth.uid())
  )
  or exists (
    select 1
    from trip_members tm
    where tm.trip_id = target_trip_id
      and tm.user_id = auth.uid()
  );
end;
$$;

grant execute on function user_can_access_trip(uuid) to authenticated;

grant usage on schema public to authenticated;

grant select, insert, update on all tables in schema public to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- Trigger helpers for updated_at columns.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on profiles
for each row
execute procedure set_updated_at();

create trigger set_trips_updated_at
before update on trips
for each row
execute procedure set_updated_at();

create trigger set_trip_days_updated_at
before update on trip_days
for each row
execute procedure set_updated_at();

create trigger set_trip_activities_updated_at
before update on trip_activities
for each row
execute procedure set_updated_at();

create trigger set_expenses_updated_at
before update on expenses
for each row
execute procedure set_updated_at();

-- Enable Row Level Security.
alter table profiles enable row level security;
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table trip_days enable row level security;
alter table trip_activities enable row level security;
alter table expenses enable row level security;
alter table voice_transcripts enable row level security;

-- Profiles policies
create policy "Profiles are self-managed" on profiles
for select using (auth.uid() = id);

create policy "Profiles self upsert" on profiles
for insert with check (auth.uid() = id);

create policy "Profiles self update" on profiles
for update using (auth.uid() = id);

-- Trips policies
create policy "Users can view trips they own or join" on trips
for select using (user_can_access_trip(id));

create policy "Users can insert their trips" on trips
for insert with check (owner_id = auth.uid());

create policy "Only owners update trips" on trips
for update using (owner_id = auth.uid());

create policy "Only owners delete trips" on trips
for delete using (owner_id = auth.uid());

-- Trip members policies
create policy "Trip members visible to participants" on trip_members
for select using (user_can_access_trip(trip_id));

create policy "Owners manage collaborators" on trip_members
for all using ((select owner_id from trips where id = trip_members.trip_id) = auth.uid())
with check ((select owner_id from trips where id = trip_members.trip_id) = auth.uid());

-- Trip day policies
create policy "Users access their trip days" on trip_days
for all using (user_can_access_trip(trip_id))
with check (user_can_access_trip(trip_id));

-- Trip activity policies
create policy "Users manage their trip activities" on trip_activities
for all using (user_can_access_trip(trip_id))
with check (user_can_access_trip(trip_id));

-- Expense policies
create policy "Users manage their trip expenses" on expenses
for all using (user_can_access_trip(trip_id))
with check (user_can_access_trip(trip_id));

-- Voice transcript policies
create policy "Users manage their transcripts" on voice_transcripts
for select using (user_can_access_trip(trip_id))
with check (user_can_access_trip(trip_id));

-- Ensure future tables inherit grants
alter default privileges in schema public grant select, insert, update on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
