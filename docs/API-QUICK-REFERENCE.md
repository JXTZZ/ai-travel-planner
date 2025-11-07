# 快速参考 - API 使用指南

## 🚀 行程管理 API

### 获取行程列表
```typescript
import { useTripsQuery } from '@/hooks/useTripsQuery'

const { data: trips, isLoading, isError, error } = useTripsQuery()
```

### 创建行程
```typescript
import { useCreateTripMutation } from '@/hooks/useTripsQuery'

const createMutation = useCreateTripMutation()

await createMutation.mutateAsync({
  title: '南京三日游',
  destination: '南京',
  start_date: '2025-11-15',
  end_date: '2025-11-17',
  party_size: 2,
  budget_total: 2000,
  budget_currency: 'CNY',
  notes: '轻松游',
})
```

### 更新行程
```typescript
import { useUpdateTripMutation } from '@/hooks/useTripsQuery'

const updateMutation = useUpdateTripMutation()

await updateMutation.mutateAsync({
  id: 'trip-uuid',
  updates: {
    title: '南京四日游',
    end_date: '2025-11-18',
  },
})
```

### 删除行程
```typescript
import { useDeleteTripMutation } from '@/hooks/useTripsQuery'

const deleteMutation = useDeleteTripMutation()

await deleteMutation.mutateAsync('trip-uuid')
```

### 获取单个行程详情
```typescript
import { useQuery } from '@tanstack/react-query'
import { getTripById } from '@/lib/tripApi'

const { data: trip } = useQuery({
  queryKey: ['trip', id],
  queryFn: () => getTripById(id),
  enabled: !!id,
})
```

---

## 📅 每日行程 API

### 获取每日行程
```typescript
import { getTripDays } from '@/lib/tripApi'

const tripDays = await getTripDays('trip-uuid')
```

### 创建每日行程
```typescript
import { createTripDays } from '@/lib/tripApi'

const tripDays = await createTripDays([
  {
    trip_id: 'trip-uuid',
    day_index: 1,
    date: '2025-11-15',
    summary: '抵达南京，游览夫子庙',
  },
  {
    trip_id: 'trip-uuid',
    day_index: 2,
    date: '2025-11-16',
    summary: '中山陵、明孝陵',
  },
])
```

---

## 🎯 活动管理 API

### 获取某日活动
```typescript
import { getTripActivities } from '@/lib/tripApi'

const activities = await getTripActivities('day-uuid')
```

### 创建活动
```typescript
import { createTripActivities } from '@/lib/tripApi'

const activities = await createTripActivities([
  {
    trip_day_id: 'day-uuid',
    title: '抵达南京南站',
    location: '南京南站',
    start_time: '10:00',
    end_time: '11:00',
    category: 'transportation',
    estimated_cost: 300,
  },
  {
    trip_day_id: 'day-uuid',
    title: '游览夫子庙',
    location: '夫子庙',
    start_time: '15:00',
    end_time: '18:00',
    category: 'sightseeing',
    estimated_cost: 0,
    notes: '免费景点',
  },
])
```

---

## 🎤 语音生成行程

```typescript
import { planItinerary } from '@/lib/edgeFunctions'
import { message } from 'antd'
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

try {
  const response = await planItinerary({
    prompt: '我想去上海玩三天，预算3000元',
    userId: user?.id,
  })

  if (response.trip_id) {
    message.success('行程已生成！')
    navigate(`/planner/${response.trip_id}`)
  } else if (response.parse_error) {
    message.error(`解析失败: ${response.parse_error}`)
  }
} catch (err) {
  message.error(err instanceof Error ? err.message : '生成失败')
}
```

---

## 📝 类型定义参考

### Trip (完整行程)
```typescript
interface Trip {
  id: string
  owner_id: string
  title: string
  destination?: string | null
  start_date?: string | null
  end_date?: string | null
  party_size?: number
  budget_currency?: string
  budget_total?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}
```

### TripInput (创建/更新)
```typescript
interface TripInput {
  title: string
  destination?: string
  start_date?: string
  end_date?: string
  party_size?: number
  budget_currency?: string
  budget_total?: number
  notes?: string
  metadata?: Record<string, unknown>
}
```

### TripDay (每日行程)
```typescript
interface TripDay {
  id: string
  trip_id: string
  day_index: number
  date?: string | null
  summary?: string | null
  created_at?: string
  updated_at?: string
}
```

### TripActivity (活动)
```typescript
interface TripActivity {
  id: string
  trip_day_id: string
  title: string
  location?: string | null
  start_time?: string | null
  end_time?: string | null
  category?: 'transportation' | 'accommodation' | 'dining' | 'sightseeing' | 'shopping' | 'other' | null
  estimated_cost?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}
```

---

## 🔍 常见问题

### Q: 如何处理加载状态？
```typescript
const { data, isLoading, isError, error } = useTripsQuery()

if (isLoading) return <Spin />
if (isError) return <Alert message={error.message} />
return <div>{data.map(...)}</div>
```

### Q: 如何处理 mutation 加载状态？
```typescript
const createMutation = useCreateTripMutation()

<Button 
  onClick={() => createMutation.mutate(input)}
  loading={createMutation.isPending}
>
  创建行程
</Button>
```

### Q: 如何自动刷新数据？
```typescript
// React Query 会自动处理！
// mutation 成功后会自动 invalidate 相关查询
const updateMutation = useUpdateTripMutation()

await updateMutation.mutateAsync(...)
// trips 列表会自动刷新
```

### Q: 删除行程时会删除子数据吗？
是的！数据库配置了级联删除：
- 删除 Trip → 自动删除 TripDay → 自动删除 TripActivity
- 删除 Trip → 自动删除 Expense
- 不需要手动清理

---

## 🎯 最佳实践

### 1. 错误处理
```typescript
try {
  await createMutation.mutateAsync(input)
  message.success('创建成功')
} catch (err) {
  message.error(err instanceof Error ? err.message : '创建失败')
}
```

### 2. 表单验证
```typescript
const [form] = Form.useForm()

const handleSubmit = async () => {
  try {
    const values = await form.validateFields()
    await updateMutation.mutateAsync({ id, updates: values })
  } catch (err) {
    // 验证失败或提交失败
  }
}
```

### 3. 条件查询
```typescript
const { data: trip } = useQuery({
  queryKey: ['trip', id],
  queryFn: () => getTripById(id),
  enabled: !!id, // 只在 id 存在时查询
})
```

---

## 📚 更多资源

- **完整文档**: `docs/IMPLEMENTATION_SUMMARY.md`
- **项目回顾**: `docs/project-review-2025-11-07.md`
- **成功报告**: `docs/implementation-success.html`
- **API 源码**: `apps/web/src/lib/tripApi.ts`
- **类型定义**: `apps/web/src/types/trip.ts`

---

**更新日期**: 2025年11月7日  
**版本**: 1.0.0
