# AI 旅游规划修复指南

## 问题诊断

发现的问题：
1. ✅ 模型能正常调用硅基流动平台的 DeepSeek-V3
2. ❌ 数据库表字段命名与前端 API 不一致，导致无法保存生成的行程

## 具体问题

### 字段不匹配

`trip_activities` 表字段：
- 数据库使用：`day_id` → 前端期望：`trip_day_id`
- 数据库使用：`cost_estimate` → 前端期望：`estimated_cost`
- 数据库使用：`description` → 前端期望：`notes`
- 数据库缺少：`category` 字段

### Edge Function 问题

- Edge Function 使用了错误的字段名保存活动数据
- 字段映射不正确导致 INSERT 操作失败

## 解决方案

### 步骤 1：应用数据库迁移

1. 访问 Supabase Dashboard：
   ```
   https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj
   ```

2. 点击左侧菜单 **SQL Editor**

3. 点击 **+ New query** 创建新查询

4. 复制并粘贴以下 SQL（已保存在 `supabase/migrations/20251107130000_rename_day_id_to_trip_day_id.sql`）：

```sql
-- 修复 trip_activities 表字段命名，使其与前端 API 保持一致

-- 1. 将 day_id 重命名为 trip_day_id
alter table trip_activities rename column day_id to trip_day_id;

-- 2. 将 cost_estimate 重命名为 estimated_cost
alter table trip_activities rename column cost_estimate to estimated_cost;

-- 3. 将 description 重命名为 notes（与前端 TripActivity 类型一致）
alter table trip_activities rename column description to notes;

-- 4. 添加 category 列（如果不存在）
do $$ 
begin
  if not exists (select 1 from information_schema.columns 
                 where table_name='trip_activities' and column_name='category') then
    alter table trip_activities add column category text;
  end if;
end $$;

-- 5. 更新索引
drop index if exists idx_trip_activities_day_id;
create index if not exists idx_trip_activities_trip_day_id on trip_activities(trip_day_id);

-- 6. 添加注释
comment on column trip_activities.trip_day_id is '关联的行程日ID（指向 trip_days 表）';
comment on column trip_activities.estimated_cost is '预估费用';
comment on column trip_activities.category is '活动分类: transportation/accommodation/dining/sightseeing/shopping/other';
```

5. 点击 **Run** 按钮执行

### 步骤 2：重新部署 Edge Function

已修复的文件：
- ✅ `supabase/functions/plan-itinerary/index.ts` - 修正字段映射

需要重新部署 Edge Function：

```bash
cd d:\nju-work\ai-travel-planner
supabase functions deploy plan-itinerary
```

如果无法使用 CLI，可以通过 Supabase Dashboard 部署：

1. 访问：https://supabase.com/dashboard/project/zhugdvqgkqpmxhixtqaj/functions
2. 找到 `plan-itinerary` 函数
3. 点击 **Edit** 或 **Deploy new version**
4. 上传或粘贴修复后的代码

### 步骤 3：验证修复

1. 在前端应用中，打开行程规划页面
2. 点击 "AI 智能生成" 按钮
3. 输入提示词，例如：
   ```
   帮我规划一个3天的南京旅游行程，预算3000元
   ```
4. 检查是否成功生成并保存行程

## 已修复的代码文件

### 1. Edge Function (`supabase/functions/plan-itinerary/index.ts`)

修复前：
```typescript
activitiesData.push({
  trip_id: tripId,
  day_id: dayRecord.id,  // ❌ 错误字段名
  cost_estimate: activity.estimatedCost,  // ❌ 错误字段名
  metadata: {
    category: activity.category,  // ❌ 应该是独立字段
  }
})
```

修复后：
```typescript
activitiesData.push({
  trip_id: tripId,
  trip_day_id: dayRecord.id,  // ✅ 正确字段名
  day_index: day.dayIndex,
  order_index: orderIndex++,
  estimated_cost: activity.estimatedCost,  // ✅ 正确字段名
  category: activity.category || 'other',  // ✅ 独立字段
  notes: activity.notes || null,
})
```

### 2. 数据库迁移 (`supabase/migrations/20251107130000_rename_day_id_to_trip_day_id.sql`)

新增迁移文件，统一字段命名规范。

## 技术细节

### 字段映射对照表

| 数据库字段 (原) | 数据库字段 (新) | 前端类型 | Edge Function |
|----------------|----------------|----------|---------------|
| `day_id` | `trip_day_id` | `trip_day_id` | `trip_day_id` |
| `cost_estimate` | `estimated_cost` | `estimated_cost` | `estimated_cost` |
| `description` | `notes` | `notes` | `notes` |
| (不存在) | `category` | `category` | `category` |

### 数据流

1. 用户输入提示词 → 前端调用 `planItinerary()`
2. Edge Function 调用 DeepSeek-V3 生成行程 JSON
3. 解析 JSON 并保存到数据库：
   - 创建 `trips` 记录
   - 批量创建 `trip_days` 记录
   - 批量创建 `trip_activities` 记录（现在字段正确）
4. 返回 `trip_id` 给前端
5. 前端跳转到行程详情页

## 测试建议

测试用例：

1. **创建新行程**：
   - 输入："帮我规划一个5天的杭州旅游行程"
   - 预期：成功生成行程并跳转

2. **为现有行程生成详情**：
   - 打开已有行程
   - 点击"AI 生成详细行程"
   - 预期：现有行程被更新

3. **检查活动数据**：
   - 验证 `category` 字段已正确保存
   - 验证 `estimated_cost` 显示正常
   - 验证活动按 `order_index` 排序

## 可能的错误信息

修复前可能看到的错误：

```
[plan-itinerary] Failed to create activities: column "day_id" does not exist
```

或者：

```
[plan-itinerary] Failed to create activities: column "cost_estimate" does not exist
```

修复后这些错误应该消失。

## 后续优化建议

1. **添加数据验证**：
   - 验证 AI 返回的 JSON 结构
   - 验证日期格式和时间范围

2. **错误处理**：
   - 当解析失败时，仍保存原始响应到 `voice_transcripts`
   - 向用户显示友好的错误信息

3. **性能优化**：
   - 批量插入活动时使用事务
   - 减少数据库往返次数

## 参考文档

- [AI Planning Guide](./AI-PLANNING-GUIDE.md)
- [Database Migration Guide](./database-migration-guide.md)
- [API Quick Reference](./API-QUICK-REFERENCE.md)
