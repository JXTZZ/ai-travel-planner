-- 自动创建 Profile 的数据库触发器
-- 在 Supabase SQL Editor 中执行此 SQL

-- 创建函数：用户注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, preferences)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    '{}'::jsonb
  );
  return new;
end;
$$;

-- 删除旧触发器（如果存在）
drop trigger if exists on_auth_user_created on auth.users;

-- 创建触发器：在 auth.users 插入时触发
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 验证触发器已创建
select tgname, tgenabled from pg_trigger where tgname = 'on_auth_user_created';
