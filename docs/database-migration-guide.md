# Supabase 数据库迁移指南

## 问题诊断

当前遇到的问题：
- ✅ 迁移文件已存在：`supabase/migrations/20251106120000_initial_schema.sql`
- ✅ Supabase 项目已创建：`zhugdvqgkqpmxhixtqaj`
- ❌ CLI 无法连接到数据库（网络超时或防火墙问题）

## 解决方案：通过 Dashboard 手动应用迁移

### 步骤 1：访问 Supabase SQL Editor

1. 打开浏览器，访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj
2. 登录您的 Supabase 账户
3. 在左侧菜单点击 **SQL Editor**

### 步骤 2：执行迁移 SQL

1. 点击 **+ New query** 创建新查询
2. 复制以下完整 SQL 内容并粘贴到编辑器中
3. 点击 **Run** 按钮执行

```sql
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
```

### 步骤 3：验证表创建

执行后，您应该看到 "Success. No rows returned" 消息。然后：

1. 在左侧菜单点击 **Table Editor**
2. 确认以下表已创建：
   - ✅ profiles
   - ✅ trips
   - ✅ trip_members
   - ✅ trip_days
   - ✅ trip_activities
   - ✅ expenses
   - ✅ voice_transcripts

### 步骤 4：配置 Auth 设置

1. 在左侧菜单点击 **Authentication** → **Providers**
2. 确保 **Email** 提供商已启用
3. 在 **Configuration** 中：
   - ✅ Enable email signups: 开启
   - ✅ Confirm email: 关闭（开发阶段）

### 步骤 5：测试注册登录

现在回到应用进行测试：

```powershell
cd d:\nju-work\ai-travel-planner\apps\web
npm run dev
```

访问 http://localhost:5173，尝试：
1. 注册新用户
2. 登录
3. 创建行程
4. 添加费用

## 为什么 CLI 连接失败？

可能的原因：
1. **网络限制**：防火墙阻止了 5432 端口
2. **IP 白名单**：Supabase 项目可能限制了访问 IP
3. **VPN/代理**：网络代理导致连接超时
4. **DNS 解析**：无法解析 pooler.supabase.com 域名

## 替代方案：使用 Database URL

如果需要使用 CLI，可以尝试：

1. 在 Supabase Dashboard → Settings → Database
2. 复制 **Connection string** (URI)
3. 使用直连方式：

```bash
npx supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.zhugdvqgkqpmxhixtqaj.supabase.co:5432/postgres"
```

但目前最可靠的方式是**通过 Dashboard 手动执行 SQL**。

## 后续步骤

表创建完成后：
1. ✅ 测试用户注册登录
2. ✅ 验证数据写入（创建行程、添加费用）
3. ✅ 检查 RLS 策略是否正常工作
4. 如需修改 schema，继续在 SQL Editor 中执行
