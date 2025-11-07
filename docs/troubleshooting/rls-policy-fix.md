# 修复行级安全策略（RLS）问题

## 问题描述

创建行程时出现错误：
```
❌ 创建失败: 创建行程失败: new row violates row-level security policy for table "trips"
```

## 问题原因

Supabase 的行级安全策略（Row Level Security, RLS）阻止了数据插入。可能的原因：

1. **RLS 策略未正确配置或未应用到数据库**
2. **认证令牌在 INSERT 操作时未正确传递**
3. **`auth.uid()` 在策略检查时返回 NULL**

## 解决方案

### 方法 1：通过 Supabase Dashboard 手动执行 SQL（推荐）

#### 步骤：

1. **打开 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj
   - 登录您的账号

2. **进入 SQL 编辑器**
   - 点击左侧菜单 "SQL Editor"
   - 点击 "New query"

3. **复制并执行修复脚本**
   
   复制 `docs/sql/fix_trips_rls.sql` 文件的全部内容，粘贴到 SQL 编辑器中，然后点击 "Run" 执行。

   或者直接复制下面的关键部分：

```sql
-- 删除旧策略
DROP POLICY IF EXISTS "Users can insert their trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips they own or join" ON trips;
DROP POLICY IF EXISTS "Only owners update trips" ON trips;
DROP POLICY IF EXISTS "Only owners delete trips" ON trips;

-- 创建新策略
CREATE POLICY "Allow authenticated users to insert their own trips" 
ON trips
FOR INSERT 
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Allow users to select their own trips" 
ON trips
FOR SELECT 
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM trip_members 
    WHERE trip_members.trip_id = trips.id 
    AND trip_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow owners to update their trips" 
ON trips
FOR UPDATE 
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Allow owners to delete their trips" 
ON trips
FOR DELETE 
TO authenticated
USING (owner_id = auth.uid());

-- 确保 RLS 启用
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- 确保权限正确
GRANT ALL ON trips TO authenticated;
```

4. **验证执行结果**

   执行下面的查询来验证策略已正确创建：

```sql
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'trips'
ORDER BY policyname;
```

   应该看到 4 条策略记录：
   - Allow authenticated users to insert their own trips (INSERT)
   - Allow users to select their own trips (SELECT)
   - Allow owners to update their trips (UPDATE)
   - Allow owners to delete their trips (DELETE)

5. **测试认证状态**

   在 SQL 编辑器中执行：

```sql
SELECT auth.uid() as current_user_id;
```

   - 如果返回 NULL：说明您没有在 Dashboard 中登录，需要使用前端应用测试
   - 如果返回一个 UUID：说明认证正常

### 方法 2：使用 Supabase CLI（如果安装了）

如果您安装了 Supabase CLI，可以运行：

```powershell
cd supabase
npx supabase db reset
```

这会重新应用所有迁移文件。

### 方法 3：临时禁用 RLS（不推荐，仅用于调试）

**警告**：这会让任何人都能修改数据库，仅用于本地开发测试！

```sql
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
```

测试完成后记得重新启用：

```sql
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
```

## 验证修复

执行 SQL 修复后，请在应用中进行以下测试：

1. **访问调试页面**
   - 打开 http://localhost:5173/trip-debug

2. **重新测试创建行程**
   - 点击 "3. 测试创建行程" 按钮
   - 应该看到 ✅ 创建成功的消息

3. **在行程规划页面测试**
   - 访问 http://localhost:5173/planner
   - 点击 "创建新行程" 按钮
   - 应该能够成功创建并跳转到行程详情页

## 常见问题排查

### Q1: 执行 SQL 后仍然报错

**可能原因**：浏览器缓存了旧的错误信息

**解决方法**：
1. 清除浏览器缓存
2. 硬刷新页面（Ctrl + Shift + R）
3. 或者使用无痕窗口重新登录测试

### Q2: SQL 执行报错 "policy already exists"

**解决方法**：
先执行 DROP POLICY 语句删除旧策略，然后再执行 CREATE POLICY

### Q3: `auth.uid()` 返回 NULL

**可能原因**：
- 用户未登录
- 认证令牌已过期
- Supabase 客户端配置问题

**解决方法**：
1. 重新登录应用
2. 检查 `.env.local` 中的 Supabase URL 和 Key 是否正确
3. 检查浏览器控制台是否有认证错误

### Q4: 仍然无法创建行程

**调试步骤**：

1. 在 Supabase Dashboard 的 Table Editor 中查看 `trips` 表
2. 检查 Authentication > Users 中是否有您的用户记录
3. 在 SQL 编辑器中手动测试插入：

```sql
-- 替换 YOUR_USER_ID 为您的实际用户 ID
INSERT INTO trips (owner_id, title, destination)
VALUES ('YOUR_USER_ID', '测试行程', '测试目的地')
RETURNING *;
```

如果手动插入成功，说明是前端代码的认证传递问题。
如果手动插入失败，说明是数据库策略配置问题。

## 技术说明

### RLS 工作原理

1. **启用 RLS**：`ALTER TABLE trips ENABLE ROW LEVEL SECURITY;`
   - 启用后，所有对该表的访问都需要通过策略检查

2. **策略类型**：
   - `FOR INSERT`：控制谁可以插入数据
   - `FOR SELECT`：控制谁可以查询数据
   - `FOR UPDATE`：控制谁可以更新数据
   - `FOR DELETE`：控制谁可以删除数据

3. **角色**：
   - `authenticated`：已登录的用户
   - `anon`：匿名用户
   - `service_role`：服务角色（绕过 RLS）

4. **检查条件**：
   - `USING (...)`: 决定哪些行对用户可见
   - `WITH CHECK (...)`: 决定是否允许操作

### 关键函数

- `auth.uid()`：返回当前已认证用户的 UUID
- `auth.role()`：返回当前用户的角色（authenticated/anon）

## 相关文件

- `supabase/migrations/20251106120000_initial_schema.sql` - 初始数据库架构
- `supabase/migrations/20251107120000_fix_trips_rls.sql` - RLS 修复迁移
- `docs/sql/fix_trips_rls.sql` - 手动执行的 SQL 脚本
- `apps/web/src/lib/tripApi.ts` - 前端 API 调用代码

## 后续优化建议

1. **添加更详细的错误日志**
   - 记录 `auth.uid()` 的返回值
   - 记录 RLS 策略检查失败的具体原因

2. **改进错误提示**
   - 区分不同的 RLS 错误类型
   - 提供用户友好的错误消息

3. **自动化迁移**
   - 设置 CI/CD 流程自动应用数据库迁移
   - 避免手动执行 SQL 的人为错误

## 更新日志

- **2025-11-07**：识别并创建 RLS 策略修复方案
  - 创建手动执行的 SQL 脚本
  - 编写详细的操作指南
  - 提供多种修复方法和故障排查步骤
