import { supabase } from './supabaseClient'
import type { TripWithDetails } from '../types/trip'

export type SpeechSignatureResponse = {
  appId: string
  host: string
  path: string
  date: string
  authorization: string
}

export type PlanItineraryRequest = {
  prompt: string
  tripId?: string
  userId?: string
}

export type PlanItineraryResponse = {
  trip_id: string | null
  parse_error: string | null
  raw_content: string
  raw: {
    choices: Array<{
      message: {
        content: string
      }
    }>
  }
}

const getAuthHeaders = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`,
    }
  }

  return undefined
}

export const fetchSpeechSignature = async () => {
  const headers = await getAuthHeaders()
  const { data, error } = await supabase.functions.invoke<SpeechSignatureResponse>('speech-signature', {
    body: {},
    headers,
  })

  if (error) {
    throw new Error(error.message ?? '无法获取语音签名')
  }

  if (!data) {
    throw new Error('语音签名响应为空')
  }

  return data
}

export type TripDetailsResponse = {
  trip: TripWithDetails | null
}

export const planItinerary = async (request: PlanItineraryRequest) => {
  const headers = await getAuthHeaders()
  const { data, error } = await supabase.functions.invoke<PlanItineraryResponse>('plan-itinerary', {
    body: request,
    headers,
  })

  if (error) {
    throw new Error(error.message ?? '行程规划失败')
  }

  if (!data) {
    throw new Error('行程规划响应为空')
  }

  return data
}

const fetchTripDetailsViaRest = async (tripId: string): Promise<TripWithDetails | null> => {
  const query = supabase
    .from('trips')
    .select(
      `
        *,
        trip_days (*,
          trip_activities (*))
      `,
    )
    .eq('id', tripId)
    .order('day_index', { ascending: true, foreignTable: 'trip_days' })
    .order('order_index', { ascending: true, foreignTable: 'trip_days.trip_activities' })
    .order('start_time', { ascending: true, foreignTable: 'trip_days.trip_activities' })

  const { data, error } = await query.maybeSingle()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return null
    }
    throw new Error(`获取行程详情失败: ${error.message}`)
  }

  return data
}

export const fetchTripDetails = async (tripId: string): Promise<TripWithDetails | null> => {
  try {
    const headers = await getAuthHeaders()
    const { data, error } = await supabase.functions.invoke<TripDetailsResponse>('trip-details', {
      body: { tripId },
      headers,
    })

    if (error) {
      const status = (error as { status?: number }).status

      if (status === 404) {
        return null
      }

      if (status === 403) {
        throw new Error('您没有权限查看该行程')
      }

      const message = error.message ?? ''
      if (status === 406 || message.includes('Function not found') || message.includes('does not exist')) {
        return fetchTripDetailsViaRest(tripId)
      }

      throw new Error(message || '加载行程详情失败')
    }

    if (!data) {
      return null
    }

    return data.trip ?? null
  } catch (invokeError) {
    console.warn('[edgeFunctions] trip-details invoke failed, falling back to REST', invokeError)
    return fetchTripDetailsViaRest(tripId)
  }
}