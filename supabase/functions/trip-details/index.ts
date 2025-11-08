// @ts-ignore Edge Function runtime uses Deno APIs.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// eslint-disable-next-line import/no-relative-packages
import { supabaseAdmin } from '../_shared/supabaseClient.ts'

// @ts-ignore Supabase Edge Functions provide Deno global runtime configuration.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

type TripDetailsResponse = {
  trip: Record<string, unknown> | null
}

const parseAuthHeader = (req: Request): string | null => {
  const authorization = req.headers.get('Authorization')
  if (!authorization) return null
  const token = authorization.trim()
  if (!token.toLowerCase().startsWith('bearer ')) return null
  return token.slice(7)
}

const ensureUserCanAccessTrip = async (tripId: string, userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[trip-details] Failed to verify membership', error)
    throw new Error('Failed to verify trip membership')
  }

  return Boolean(data)
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const accessToken = parseAuthHeader(req)
  if (!accessToken) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  let body: { tripId?: string } | null = null
  try {
    body = await req.json()
  } catch (_error) {
    return new Response('Invalid JSON payload', { status: 400, headers: corsHeaders })
  }

  const tripId = body?.tripId
  if (!tripId) {
    return new Response('tripId is required', { status: 422, headers: corsHeaders })
  }

  const {
    data: authData,
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken)

  if (authError || !authData?.user) {
    console.error('[trip-details] Failed to resolve user from token', authError)
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const userId = authData.user.id

  const {
    data: trip,
    error: tripError,
  } = await supabaseAdmin
    .from('trips')
    .select(
      `
        *,
        trip_days (
          *,
          trip_activities (*)
        )
      `,
    )
    .eq('id', tripId)
    .maybeSingle()

  if (tripError) {
    console.error('[trip-details] Failed to fetch trip', tripError)
    return new Response('Failed to load trip', { status: 500, headers: corsHeaders })
  }

  if (!trip) {
    return new Response('Trip not found', { status: 404, headers: corsHeaders })
  }

  if (trip.owner_id !== userId) {
    const hasPermission = await ensureUserCanAccessTrip(tripId, userId)
    if (!hasPermission) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
  }

  const sortedTripDays = Array.isArray(trip.trip_days)
    ? (trip.trip_days as Array<Record<string, unknown>>)
        .map((dayRaw) => {
          const day = dayRaw as Record<string, unknown> & {
            day_index?: number
            trip_activities?: Array<Record<string, unknown>>
          }

          const activities = Array.isArray(day.trip_activities)
            ? (day.trip_activities as Array<Record<string, unknown>>).sort((a, b) => {
                const orderA = typeof a.order_index === 'number' ? a.order_index : 0
                const orderB = typeof b.order_index === 'number' ? b.order_index : 0
                if (orderA !== orderB) {
                  return orderA - orderB
                }

                const startA = typeof a.start_time === 'string' ? a.start_time : ''
                const startB = typeof b.start_time === 'string' ? b.start_time : ''
                return startA.localeCompare(startB)
              })
            : []

          return {
            ...day,
            trip_activities: activities,
          }
        })
        .sort((aRaw, bRaw) => {
          const a = aRaw as { day_index?: number }
          const b = bRaw as { day_index?: number }
          const indexA = typeof a.day_index === 'number' ? a.day_index : 0
          const indexB = typeof b.day_index === 'number' ? b.day_index : 0
          return indexA - indexB
        })
    : []

  const payload: TripDetailsResponse = {
    trip: {
      ...trip,
      trip_days: sortedTripDays,
    },
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
})
