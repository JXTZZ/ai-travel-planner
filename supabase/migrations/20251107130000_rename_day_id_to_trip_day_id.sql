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
