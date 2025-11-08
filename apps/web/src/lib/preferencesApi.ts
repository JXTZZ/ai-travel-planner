import { supabase } from './supabaseClient'
import type { UserPreferences } from '../types/preferences'
import { DEFAULT_PREFERENCES } from '../types/preferences'

export const fetchUserPreferences = async (): Promise<UserPreferences> => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw new Error(`获取用户信息失败: ${authError.message}`)
  }

  if (!user) {
    throw new Error('用户未登录')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`获取偏好设置失败: ${error.message}`)
  }

  if (!data) {
    await supabase
      .from('profiles')
      .upsert({ id: user.id, preferences: DEFAULT_PREFERENCES }, { onConflict: 'id' })
    return DEFAULT_PREFERENCES
  }

  const preferences = (data.preferences ?? {}) as Partial<UserPreferences>

  return {
    homeCity: preferences.homeCity ?? DEFAULT_PREFERENCES.homeCity,
    travelPace: preferences.travelPace ?? DEFAULT_PREFERENCES.travelPace,
    dailyHours: preferences.dailyHours ?? DEFAULT_PREFERENCES.dailyHours,
  }
}

export const updateUserPreferences = async (updates: UserPreferences): Promise<UserPreferences> => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw new Error(`获取用户信息失败: ${authError.message}`)
  }

  if (!user) {
    throw new Error('用户未登录')
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        preferences: updates,
      },
      { onConflict: 'id' },
    )
    .select('preferences')
    .single()

  if (error) {
    throw new Error(`更新偏好设置失败: ${error.message}`)
  }

  const preferences = (data?.preferences ?? {}) as Partial<UserPreferences>

  return {
    homeCity: preferences.homeCity ?? updates.homeCity,
    travelPace: preferences.travelPace ?? updates.travelPace,
    dailyHours: preferences.dailyHours ?? updates.dailyHours,
  }
}
