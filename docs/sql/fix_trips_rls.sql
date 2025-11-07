-- =====================================================
-- Fix RLS Policies for Trips Table
-- Execute this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. 首先检查当前的 RLS 状态
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'trips';

-- 2. 查看当前的策略
SELECT * FROM pg_policies WHERE tablename = 'trips';

-- 3. 删除可能有问题的旧策略
DROP POLICY IF EXISTS "Users can insert their trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips they own or join" ON trips;
DROP POLICY IF EXISTS "Only owners update trips" ON trips;
DROP POLICY IF EXISTS "Only owners delete trips" ON trips;

-- 4. 创建新的、更宽松的策略（用于调试）
-- INSERT 策略：允许已认证用户创建自己的行程
CREATE POLICY "Allow authenticated users to insert their own trips" 
ON trips
FOR INSERT 
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
);

-- SELECT 策略：允许用户查看自己拥有的行程
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

-- UPDATE 策略：只有所有者可以更新
CREATE POLICY "Allow owners to update their trips" 
ON trips
FOR UPDATE 
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE 策略：只有所有者可以删除
CREATE POLICY "Allow owners to delete their trips" 
ON trips
FOR DELETE 
TO authenticated
USING (owner_id = auth.uid());

-- 5. 确保 RLS 已启用
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- 6. 确保权限正确
GRANT ALL ON trips TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. 验证配置（查询这个来确认设置成功）
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'trips'
ORDER BY policyname;

-- 8. 测试查询（应该返回当前用户的 ID）
SELECT auth.uid() as current_user_id;

-- 9. 如果上面的查询返回 NULL，说明认证有问题
-- 检查认证状态：
SELECT 
  auth.uid() as user_id,
  auth.role() as user_role;
