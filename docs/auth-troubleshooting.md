# Supabase 注册登录问题排查与修复

## 常见问题检查清单

### 1. 检查 Supabase Auth 设置

请在 Supabase Dashboard 检查以下设置：

**访问：** https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/auth/users

#### 需要确认的设置：

1. **Authentication → Providers → Email**
   - ✅ Enable Email provider: 必须开启
   - ✅ Confirm email: **建议关闭**（开发阶段）
   
2. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: 添加 `http://localhost:5173/**`

3. **Authentication → Email Templates**
   - 如果开启了邮箱验证，确保邮件模板正确

### 2. 修复代码问题

根据当前代码，我发现了几个潜在问题：

#### 问题 1: 注册后没有自动登录

当前注册逻辑：
```typescript
const { error } = await signUp(values.email, values.password)
if (error) {
  message.error(`注册失败：${error.message}`)
} else {
  message.success('注册成功！请查收邮件验证账号。')
  // ❌ 没有跳转或自动登录
}
```

#### 问题 2: 邮箱验证可能导致无法登录

如果 Supabase 开启了 "Confirm email"，用户必须点击邮件链接才能登录。

#### 问题 3: 注册时没有创建 profile

注册成功后应该创建对应的 profile 记录。

## 修复方案

### 方案 A：关闭邮箱验证（推荐用于开发）

1. 访问 Supabase Dashboard
2. Authentication → Providers → Email
3. **取消勾选** "Confirm email"
4. 点击 Save

这样注册后可以立即登录。

### 方案B：自动创建 Profile（使用数据库触发器）

在 Supabase SQL Editor 执行：

```sql
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

-- 创建触发器：在 auth.users 插入时触发
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 方案C：修复前端代码

更新 AuthPage 和 AuthContext，添加更好的错误处理和用户体验。

## 测试步骤

1. 打开 http://localhost:5173
2. 尝试注册：
   - 邮箱：test@example.com
   - 密码：123456
3. 检查是否显示错误信息
4. 如果注册成功，尝试登录
5. 查看浏览器控制台是否有错误

## 常见错误信息

### "Invalid login credentials"
- 原因：密码错误或用户不存在
- 解决：确认邮箱和密码正确

### "Email not confirmed"
- 原因：开启了邮箱验证但未验证
- 解决：关闭邮箱验证或点击验证邮件

### "User already registered"
- 原因：邮箱已被注册
- 解决：使用登录功能或更换邮箱

### "Password should be at least 6 characters"
- 原因：密码太短
- 解决：使用至少6位密码

## 下一步

请告诉我：
1. 尝试注册/登录时具体的错误信息是什么？
2. 是否在 Supabase Dashboard → Authentication → Users 中看到注册的用户？
3. 浏览器控制台（F12）是否有错误信息？

这样我可以提供更精确的解决方案。
