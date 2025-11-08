import { supabase } from './supabaseClient'
import { fetchTripDetails } from './edgeFunctions'
import type {
  Trip,
  TripInput,
  TripDay,
  TripDayInput,
  TripActivity,
  TripActivityInput,
  TripWithDetails,
} from '../types/trip'

// ==================== 行程管理 ====================

/**
 * 获取当前用户的所有行程
 */
export const getTrips = async (): Promise<Trip[]> => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`获取行程失败: ${error.message}`)
  }

  return data || []
}

/**
 * 根据 ID 获取单个行程（包含每日安排及活动）
 */
export const getTripById = async (id: string): Promise<TripWithDetails | null> => {
  return fetchTripDetails(id)
}

/**
 * 创建新行程
 */
export const createTrip = async (input: TripInput): Promise<Trip> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('用户未登录')
  }

  const { data, error } = await supabase
    .from('trips')
    .insert({
      owner_id: user.id,
      title: input.title,
      destination: input.destination,
      start_date: input.start_date,
      end_date: input.end_date,
      party_size: input.party_size,
      budget_currency: input.budget_currency || 'CNY',
      budget_total: input.budget_total,
      notes: input.notes,
      metadata: input.metadata,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`创建行程失败: ${error.message}`)
  }

  return data
}

/**
 * 更新行程
 */
export const updateTrip = async (id: string, updates: Partial<TripInput>): Promise<Trip> => {
  const { data, error } = await supabase
    .from('trips')
    .update({
      title: updates.title,
      destination: updates.destination,
      start_date: updates.start_date,
      end_date: updates.end_date,
      party_size: updates.party_size,
      budget_currency: updates.budget_currency,
      budget_total: updates.budget_total,
      notes: updates.notes,
      metadata: updates.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`更新行程失败: ${error.message}`)
  }

  return data
}

/**
 * 删除行程（级联删除相关的 days 和 activities）
 */
export const deleteTrip = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`删除行程失败: ${error.message}`)
  }
}

// ==================== 每日行程管理 ====================

/**
 * 获取行程的所有每日安排
 */
export const getTripDays = async (tripId: string): Promise<TripDay[]> => {
  const { data, error } = await supabase
    .from('trip_days')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_index', { ascending: true })

  if (error) {
    throw new Error(`获取每日行程失败: ${error.message}`)
  }

  return data || []
}

/**
 * 创建每日行程
 */
export const createTripDay = async (input: TripDayInput): Promise<TripDay> => {
  const { data, error } = await supabase
    .from('trip_days')
    .insert({
      trip_id: input.trip_id,
      day_index: input.day_index,
      date: input.date,
      summary: input.summary,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`创建每日行程失败: ${error.message}`)
  }

  return data
}

/**
 * 批量创建每日行程
 */
export const createTripDays = async (inputs: TripDayInput[]): Promise<TripDay[]> => {
  const { data, error } = await supabase
    .from('trip_days')
    .insert(
      inputs.map((input) => ({
        trip_id: input.trip_id,
        day_index: input.day_index,
        date: input.date,
        summary: input.summary,
      })),
    )
    .select()

  if (error) {
    throw new Error(`批量创建每日行程失败: ${error.message}`)
  }

  return data || []
}

/**
 * 更新每日行程
 */
export const updateTripDay = async (id: string, updates: Partial<TripDayInput>): Promise<TripDay> => {
  const { data, error } = await supabase
    .from('trip_days')
    .update({
      date: updates.date,
      summary: updates.summary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`更新每日行程失败: ${error.message}`)
  }

  return data
}

/**
 * 删除每日行程
 */
export const deleteTripDay = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('trip_days')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`删除每日行程失败: ${error.message}`)
  }
}

// ==================== 活动管理 ====================

/**
 * 获取某日的所有活动
 */
export const getTripActivities = async (tripDayId: string): Promise<TripActivity[]> => {
  const { data, error } = await supabase
    .from('trip_activities')
    .select('*')
    .eq('trip_day_id', tripDayId)
    .order('order_index', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(`获取活动列表失败: ${error.message}`)
  }

  return data || []
}

/**
 * 创建活动
 */
export const createTripActivity = async (input: TripActivityInput): Promise<TripActivity> => {
  const { data, error } = await supabase
    .from('trip_activities')
    .insert({
      trip_id: input.trip_id,
      trip_day_id: input.trip_day_id,
      day_index: input.day_index,
      order_index: input.order_index,
      title: input.title,
      location: input.location,
      start_time: input.start_time,
      end_time: input.end_time,
      category: input.category,
      estimated_cost: input.estimated_cost,
      notes: input.notes,
      metadata: input.metadata,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`创建活动失败: ${error.message}`)
  }

  return data
}

/**
 * 批量创建活动
 */
export const createTripActivities = async (inputs: TripActivityInput[]): Promise<TripActivity[]> => {
  const { data, error } = await supabase
    .from('trip_activities')
    .insert(
      inputs.map((input) => ({
        trip_id: input.trip_id,
        trip_day_id: input.trip_day_id,
        day_index: input.day_index,
        order_index: input.order_index,
        title: input.title,
        location: input.location,
        start_time: input.start_time,
        end_time: input.end_time,
        category: input.category,
        estimated_cost: input.estimated_cost,
        notes: input.notes,
        metadata: input.metadata,
      })),
    )
    .select()

  if (error) {
    throw new Error(`批量创建活动失败: ${error.message}`)
  }

  return data || []
}

/**
 * 更新活动
 */
export const updateTripActivity = async (id: string, updates: Partial<TripActivityInput>): Promise<TripActivity> => {
  const { data, error } = await supabase
    .from('trip_activities')
    .update({
      trip_id: updates.trip_id,
      trip_day_id: updates.trip_day_id,
      day_index: updates.day_index,
      order_index: updates.order_index,
      title: updates.title,
      location: updates.location,
      start_time: updates.start_time,
      end_time: updates.end_time,
      category: updates.category,
      estimated_cost: updates.estimated_cost,
      notes: updates.notes,
      metadata: updates.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`更新活动失败: ${error.message}`)
  }

  return data
}

/**
 * 删除活动
 */
export const deleteTripActivity = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('trip_activities')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`删除活动失败: ${error.message}`)
  }
}

/**
 * 更新活动的排序（以及可选的所属日期）
 */
export const reorderTripActivities = async (
  updates: Array<{
    id: string
    trip_day_id: string
    day_index?: number | null
    order_index: number
  }>,
): Promise<void> => {
  if (updates.length === 0) {
    return
  }

  const timestamp = new Date().toISOString()

  const results = await Promise.all(
    updates.map((item) =>
      supabase
        .from('trip_activities')
        .update({
          trip_day_id: item.trip_day_id,
          day_index: item.day_index ?? null,
          order_index: item.order_index,
          updated_at: timestamp,
        })
        .eq('id', item.id),
    ),
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) {
    throw new Error(`更新活动排序失败: ${failed.error.message}`)
  }
}

/**
 * 更新行程预算
 */
export const updateTripBudget = async (tripId: string, budgetTotal: number, budgetCurrency: string = 'CNY'): Promise<void> => {
  const { error } = await supabase
    .from('trips')
    .update({
      budget_total: budgetTotal,
      budget_currency: budgetCurrency,
    })
    .eq('id', tripId)

  if (error) {
    throw new Error(`更新预算失败: ${error.message}`)
  }
}
