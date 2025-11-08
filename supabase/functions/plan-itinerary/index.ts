// @ts-ignore: Edge function executed in Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// eslint-disable-next-line import/no-relative-packages
import { supabaseAdmin } from '../_shared/supabaseClient.ts'
// @ts-ignore: jsonrepair is resolved at runtime via esm.sh in Deno.
import { jsonrepair } from 'https://esm.sh/jsonrepair@3.4.0'

// @ts-ignore Supabase Edge Functions provide Deno global at runtime.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

interface PlanRequestBody {
  tripId?: string
  userId?: string
  prompt: string
  constraints?: Record<string, unknown>
}

type ChatCompletion = {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

interface AIItinerary {
  title: string
  destination: string
  startDate?: string
  endDate?: string
  departureLocation?: string
  partySize?: number
  budgetTotal?: number
  budgetCurrency?: string
  notes?: string
  days: Array<{
    dayIndex: number
    date?: string
    summary: string
    activities: Array<{
      title: string
      location?: string
      startTime?: string
      endTime?: string
      category?: 'transportation' | 'accommodation' | 'dining' | 'sightseeing' | 'shopping' | 'other'
      estimatedCost?: number
      notes?: string
    }>
  }>
}

type NormalizedCategory =
  | 'transportation'
  | 'accommodation'
  | 'dining'
  | 'sightseeing'
  | 'shopping'
  | 'other'

type NormalizedActivity = {
  title: string
  location: string | null
  startTimeIso: string | null
  endTimeIso: string | null
  startTimeText: string | null
  endTimeText: string | null
  category: NormalizedCategory
  estimatedCost: number | null
  notes: string | null
  orderIndex: number
}

type NormalizedDay = {
  dayIndex: number
  date: string | null
  summary: string
  activities: NormalizedActivity[]
}

type NormalizedItinerary = {
  title: string
  destination: string
  startDate: string | null
  endDate: string | null
  departureLocation: string | null
  departureTime: string | null
  returnTime: string | null
  partySize: number | null
  budgetTotal: number | null
  budgetCurrency: string
  notes: string | null
  days: NormalizedDay[]
}

const CATEGORY_ALIASES: Record<string, NormalizedCategory> = {
  交通: 'transportation',
  出行: 'transportation',
  接驳: 'transportation',
  住宿: 'accommodation',
  酒店: 'accommodation',
  入住: 'accommodation',
  餐饮: 'dining',
  美食: 'dining',
  用餐: 'dining',
  午餐: 'dining',
  晚餐: 'dining',
  早餐: 'dining',
  景点: 'sightseeing',
  游览: 'sightseeing',
  观光: 'sightseeing',
  拍照: 'sightseeing',
  购物: 'shopping',
  市场: 'shopping',
}

const ALLOWED_CATEGORIES: NormalizedCategory[] = [
  'transportation',
  'accommodation',
  'dining',
  'sightseeing',
  'shopping',
  'other',
]

const MIN_ACTIVITIES_PER_DAY = 4

type DefaultActivityTemplate = {
  start: string
  end: string
  category: NormalizedCategory
  title: (destination: string, dayIndex: number) => string
  location: (destination: string) => string | null
  notes?: (destination: string) => string | null
  estimatedCost?: number | null
}

const DEFAULT_ACTIVITY_TEMPLATES: DefaultActivityTemplate[] = [
  {
    start: '09:00',
    end: '11:30',
    category: 'sightseeing',
    title: (destination, dayIndex) => `${destination} 经典景点游览（第${dayIndex}天上午）`,
    location: (destination) => `${destination}市核心景区`,
    notes: () => '建议提前预约门票，适当留出排队时间。',
    estimatedCost: 120,
  },
  {
    start: '12:30',
    end: '14:00',
    category: 'dining',
    title: (destination) => `${destination} 当地特色午餐`,
    location: (destination) => `${destination}市中心特色餐厅`,
    notes: () => '可根据口味选择特色菜品，建议提前查阅评价。',
    estimatedCost: 80,
  },
  {
    start: '15:00',
    end: '17:30',
    category: 'sightseeing',
    title: (destination, dayIndex) => `${destination} 深度体验（第${dayIndex}天下午）`,
    location: (destination) => `${destination}市热门打卡景点`,
    notes: () => '合理安排拍照与休息时间，注意补充水分。',
    estimatedCost: 100,
  },
  {
    start: '19:00',
    end: '21:00',
    category: 'other',
    title: (destination) => `${destination} 夜间休闲安排`,
    location: (destination) => `${destination}市夜生活商圈`,
    notes: () => '可选择夜游、酒吧或文化演出，根据兴趣自由安排。',
    estimatedCost: 150,
  },
]

const clonePlainObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }
  return {}
}

const sanitizeAiJsonText = (raw: string): string => {
  let result = raw
  // 移除空字符串键值对：",""
  result = result.replace(/,\s*""\s*,/g, ',')
  result = result.replace(/,\s*""\s*}/g, '}')
  result = result.replace(/,\s*""\s*\]/g, ']')
  result = result.replace(/{\s*""\s*,/g, '{')
  result = result.replace(/\[\s*""\s*,/g, '[')
  
  // 修复键名相关错误
  result = result.replace(/"\s*,\s*"([A-Za-z0-9_]+)"\s*:/g, ',"$1":')
  result = result.replace(/,\s*":\s*"([A-Za-z0-9_]+)"\s*:/g, ', "$1":')
  result = result.replace(/:\s*",\s*"([A-Za-z0-9_]+)"/g, ': "$1"')
  
  // 修复字符串拼接相关错误
  result = result.replace(/,\s*"\+\s*"/g, ',"')
  result = result.replace(/:\s*"\+\s*"/g, ':"')
  result = result.replace(/"\s*\+\s*"/g, '"')
  result = result.replace(/\+\s*"/g, '"')
  
  // 修复尾部多余逗号
  result = result.replace(/"\s*,\s*"\s*}/g, '"}')
  result = result.replace(/"\s*,\s*"\s*\]/g, '"]')
  result = result.replace(/,\s*([}\]])/g, '$1')
  
  // 移除字段值为空字符串的无效键值对（更激进）
  result = result.replace(/"[^"]*"\s*:\s*""\s*,/g, '')
  result = result.replace(/,\s*"[^"]*"\s*:\s*""/g, '')
  
  return result
}

const timeTextToMinutes = (value: string): number | null => {
  const match = value.match(/^(\d{1,2})(?::(\d{1,2}))?$/)
  if (!match) {
    return null
  }

  const hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  const safeHours = Math.min(Math.max(hours, 0), 23)
  const safeMinutes = Math.min(Math.max(minutes, 0), 59)
  return safeHours * 60 + safeMinutes
}

const isoToTimeText = (value: string | null): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const match = value.match(/T(\d{2}):(\d{2})/)
  if (!match) {
    return null
  }

  return `${match[1]}:${match[2]}`
}

const shiftDateString = (date: string, offsetDays: number): string => {
  const base = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(base.getTime())) {
    return date
  }
  base.setUTCDate(base.getUTCDate() + offsetDays)
  return base.toISOString().slice(0, 10)
}

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`)

const sanitizeText = (value: unknown, maxLength = 500): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

const extractDateString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const match = value.match(/(\d{4})[\-/年](\d{1,2})[\-/月](\d{1,2})/)
  if (!match) {
    return null
  }
  const year = match[1]
  const month = pad2(parseInt(match[2], 10))
  const day = pad2(parseInt(match[3], 10))
  return `${year}-${month}-${day}`
}

const extractTimeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  // Ignore values that already look like a full date
  if (/\d{4}[\-/]/.test(trimmed)) {
    return null
  }

  const match = trimmed.match(/(\d{1,2})(?:[:：h点时](\d{1,2}))?/)
  if (!match) {
    return null
  }

  const hour = parseInt(match[1], 10)
  if (Number.isNaN(hour)) {
    return null
  }
  const minute = match[2] ? parseInt(match[2], 10) : 0

  const safeHour = Math.min(Math.max(hour, 0), 23)
  const safeMinute = Math.min(Math.max(minute, 0), 59)

  return `${pad2(safeHour)}:${pad2(safeMinute)}`
}

const toIsoDateTime = (date: string | null, time: string | null): string | null => {
  if (!time) {
    return null
  }

  const baseDate = date ?? '1970-01-01'
  const isoString = `${baseDate}T${time}:00`
  const parsed = new Date(isoString)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

const toPositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }
  if (typeof value === 'string') {
    const digits = value.match(/\d+/)
    if (digits) {
      const parsed = parseInt(digits[0], 10)
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }
  }
  return null
}

const toNumberValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100) / 100
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.')
    if (!cleaned) {
      return null
    }
    const parsed = parseFloat(cleaned)
    if (!Number.isNaN(parsed)) {
      return Math.round(parsed * 100) / 100
    }
  }
  return null
}

const normalizeCurrency = (value: unknown, fallback = 'CNY'): string => {
  if (typeof value !== 'string') {
    return fallback
  }
  const letters = value.replace(/[^a-zA-Z]/g, '').toUpperCase()
  if (letters.length >= 3) {
    return letters.slice(0, 3)
  }
  return fallback
}

const normalizeCategory = (value: unknown): NormalizedCategory => {
  if (typeof value !== 'string') {
    return 'other'
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return 'other'
  }

  const lowerKey = trimmed.toLowerCase()
  if ((ALLOWED_CATEGORIES as string[]).includes(lowerKey)) {
    return lowerKey as NormalizedCategory
  }

  const directAlias = CATEGORY_ALIASES[trimmed]
  if (directAlias) {
    return directAlias
  }

  const aliasFromLower = CATEGORY_ALIASES[lowerKey]
  if (aliasFromLower) {
    return aliasFromLower
  }

  for (const entryKey in CATEGORY_ALIASES) {
    if (Object.prototype.hasOwnProperty.call(CATEGORY_ALIASES, entryKey)) {
      if (trimmed.includes(entryKey) || lowerKey.includes(entryKey)) {
        return CATEGORY_ALIASES[entryKey]
      }
    }
  }

  return 'other'
}

const normalizeItinerary = (raw: AIItinerary): NormalizedItinerary => {
  const title = sanitizeText(raw.title, 120) ?? 'AI 智能行程'
  const destination = sanitizeText(raw.destination, 60) ?? '目的地待定'
  let startDate = extractDateString(raw.startDate)
  let endDate = extractDateString(raw.endDate)
  const departureLocation = sanitizeText(raw.departureLocation, 120)
  const partySize = toPositiveInt(raw.partySize)
  const budgetTotal = toNumberValue(raw.budgetTotal)
  const budgetCurrency = normalizeCurrency(raw.budgetCurrency)
  const notes = sanitizeText(raw.notes, 800)

  const daysInput = Array.isArray(raw.days) ? raw.days : []
  const normalizedDays: NormalizedDay[] = []

  let earliestDayDate: string | null = null
  let latestDayDate: string | null = null
  let earliestStartMinutes: number | null = null
  let earliestStartLabel: string | null = null
  let latestEndMinutes: number | null = null
  let latestEndLabel: string | null = null

  const applyTimeBounds = (
    startTimeText: string | null,
    startTimeIso: string | null,
    endTimeText: string | null,
    endTimeIso: string | null,
  ) => {
    const resolvedStartLabel = startTimeText ?? isoToTimeText(startTimeIso)
    const startMinutes = resolvedStartLabel ? timeTextToMinutes(resolvedStartLabel) : null
    if (startMinutes !== null && (earliestStartMinutes === null || startMinutes < earliestStartMinutes)) {
      earliestStartMinutes = startMinutes
      earliestStartLabel = resolvedStartLabel
    }

    const resolvedEndLabel = endTimeText ?? isoToTimeText(endTimeIso)
    const endMinutes = resolvedEndLabel ? timeTextToMinutes(resolvedEndLabel) : null
    if (endMinutes !== null && (latestEndMinutes === null || endMinutes > latestEndMinutes)) {
      latestEndMinutes = endMinutes
      latestEndLabel = resolvedEndLabel
    }
  }

  for (let index = 0; index < daysInput.length; index += 1) {
    const day = daysInput[index]
    const dayIndex = index + 1
    let date = extractDateString(day?.date)
    if (date) {
      if (!earliestDayDate || date < earliestDayDate) {
        earliestDayDate = date
      }
      if (!latestDayDate || date > latestDayDate) {
        latestDayDate = date
      }
    }

    const summary =
      sanitizeText(day?.summary, 400) ??
      `${destination} - 第${dayIndex}天行程`

    const activitiesInput = Array.isArray(day?.activities) ? day.activities : []
    const normalizedActivities: NormalizedActivity[] = []

    for (let activityIndex = 0; activityIndex < activitiesInput.length; activityIndex += 1) {
      const activity = activitiesInput[activityIndex]
      const activityTitle = sanitizeText(activity?.title, 120)
      if (!activityTitle) {
        continue
      }

      const location = sanitizeText(activity?.location, 120)
      const startTimeText = extractTimeString(activity?.startTime)
      const endTimeText = extractTimeString(activity?.endTime)
      const startTimeIso = toIsoDateTime(date, startTimeText)
      const endTimeIso = toIsoDateTime(date, endTimeText)
      const category = normalizeCategory(activity?.category)
      const estimatedCost = toNumberValue(activity?.estimatedCost)
      const notesValue = sanitizeText(activity?.notes, 400)

      normalizedActivities.push({
        title: activityTitle,
        location: location ?? null,
        startTimeIso,
        endTimeIso,
        startTimeText,
        endTimeText,
        category,
        estimatedCost,
        notes: notesValue ?? null,
        orderIndex: normalizedActivities.length,
      })

      applyTimeBounds(startTimeText, startTimeIso, endTimeText, endTimeIso)
    }

    if (normalizedActivities.length < MIN_ACTIVITIES_PER_DAY) {
      const needed = MIN_ACTIVITIES_PER_DAY - normalizedActivities.length
      const templateCandidates = [...DEFAULT_ACTIVITY_TEMPLATES]

      let added = 0
      for (const template of templateCandidates) {
        if (added >= needed) {
          break
        }

        const templateTitle = sanitizeText(template.title(destination, dayIndex), 120)
        if (!templateTitle) {
          continue
        }

        const templateLocation = sanitizeText(template.location(destination), 120)
        const startTimeText = template.start
        const endTimeText = template.end
        const startTimeIso = toIsoDateTime(date, startTimeText)
        const endTimeIso = toIsoDateTime(date, endTimeText)
        const existingTitle = normalizedActivities.find((activity) => activity.title === templateTitle)
        if (existingTitle) {
          continue
        }

        normalizedActivities.push({
          title: templateTitle,
          location: templateLocation ?? null,
          startTimeIso,
          endTimeIso,
          startTimeText,
          endTimeText,
          category: template.category,
          estimatedCost: typeof template.estimatedCost === 'number' ? template.estimatedCost : null,
          notes: sanitizeText(template.notes?.(destination) ?? null, 400),
          orderIndex: normalizedActivities.length,
        })

        applyTimeBounds(startTimeText, startTimeIso, endTimeText, endTimeIso)
        added += 1
      }
    }

    normalizedDays.push({
      dayIndex,
      date,
      summary,
      activities: normalizedActivities,
    })
  }

  if (!startDate && earliestDayDate) {
    startDate = earliestDayDate
  }

  if (!endDate && latestDayDate) {
    endDate = latestDayDate
  }

  if (normalizedDays.length === 0) {
    normalizedDays.push({
      dayIndex: 1,
      date: startDate,
      summary: `${destination} 行程安排`,
      activities: [],
    })
  }

  if (startDate) {
    for (const day of normalizedDays) {
      if (!day.date) {
        const resolvedDate = shiftDateString(startDate, day.dayIndex - 1)
        day.date = resolvedDate
        for (const activity of day.activities) {
          if (activity.startTimeText) {
            activity.startTimeIso = toIsoDateTime(resolvedDate, activity.startTimeText)
          }
          if (activity.endTimeText) {
            activity.endTimeIso = toIsoDateTime(resolvedDate, activity.endTimeText)
          }
        }
      }
    }
  } else if (endDate) {
    const derivedStart = shiftDateString(endDate, -(normalizedDays.length - 1))
    startDate = derivedStart
    for (const day of normalizedDays) {
      if (!day.date) {
        const resolvedDate = shiftDateString(derivedStart, day.dayIndex - 1)
        day.date = resolvedDate
        for (const activity of day.activities) {
          if (activity.startTimeText) {
            activity.startTimeIso = toIsoDateTime(resolvedDate, activity.startTimeText)
          }
          if (activity.endTimeText) {
            activity.endTimeIso = toIsoDateTime(resolvedDate, activity.endTimeText)
          }
        }
      }
    }
  }

  if (!endDate) {
    const collectedDates = normalizedDays
      .map((day) => day.date)
      .filter((value): value is string => Boolean(value))

    if (collectedDates.length > 0) {
      endDate = collectedDates.reduce((latest, current) => (current > latest ? current : latest), collectedDates[0])
    } else if (startDate) {
      endDate = shiftDateString(startDate, normalizedDays.length - 1)
    }
  }

  return {
    title,
    destination,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    departureLocation: departureLocation ?? null,
    departureTime: earliestStartLabel,
    returnTime: latestEndLabel,
    partySize,
    budgetTotal,
    budgetCurrency,
    notes,
    days: normalizedDays,
  }
}

/**
 * 解析 AI 返回的内容并存储到数据库
 * @param content AI 返回的 JSON 内容
 * @param userId 用户 ID
 * @param existingTripId 可选，如果提供则更新现有行程，否则创建新行程
 */
async function parseAndStoreItinerary(
  content: string,
  userId: string,
  existingTripId?: string,
  fallbackPrompt?: string,
): Promise<{ tripId: string; success: boolean; error?: string }> {
  try {
    // 尝试从 AI 响应中提取 JSON
    let itinerary: AIItinerary

    const parseCandidates: string[] = [content]

    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch && codeBlockMatch[1]) {
    parseCandidates.push(codeBlockMatch[1])
    }

    const genericJsonMatch = content.match(/\{[\s\S]*\}/)
    if (genericJsonMatch) {
    parseCandidates.push(genericJsonMatch[0])
    }

    const tryParseCandidate = (raw: string): AIItinerary => {
      try {
        return JSON.parse(raw)
      } catch (initialError) {
        try {
          const repaired = jsonrepair(raw)
          return JSON.parse(repaired)
        } catch (repairError) {
          console.warn('[plan-itinerary] JSON parse candidate failed', repairError)
          throw repairError instanceof Error ? repairError : initialError
        }
      }
    }

    let parsed: AIItinerary | null = null
    let lastError: unknown = null
    const seenVariants = new Set<string>()
    for (const candidate of parseCandidates) {
      const trimmedCandidate = typeof candidate === 'string' ? candidate.trim() : ''
      if (!trimmedCandidate) {
        continue
      }

      const variantCandidates = [trimmedCandidate, sanitizeAiJsonText(trimmedCandidate)]

      for (const variant of variantCandidates) {
        const normalizedVariant = variant.trim()
        if (!normalizedVariant || seenVariants.has(normalizedVariant)) {
          continue
        }
        seenVariants.add(normalizedVariant)

        try {
          parsed = tryParseCandidate(normalizedVariant)
          break
        } catch (variantError) {
          lastError = variantError
        }
      }

      if (parsed) {
        break
      }
    }

    if (!parsed) {
      throw lastError instanceof Error
        ? lastError
        : new Error('Unable to extract JSON from AI response')
    }

    itinerary = parsed

    let normalized = normalizeItinerary(itinerary)

    if (normalized.days.every((day) => day.activities.length === 0)) {
      console.warn('[plan-itinerary] Normalized itinerary has no activities, using fallback template')
      normalized = normalizeItinerary(buildFallbackItinerary(fallbackPrompt ?? ''))
    }

    if (!normalized.days || normalized.days.length === 0) {
      throw new Error('AI 行程缺少有效的每日安排')
    }

    let existingTrip: { start_date: string | null; end_date: string | null; metadata: unknown } | null = null

    if (existingTripId) {
      const {
        data: existing,
        error: existingFetchError,
      } = await supabaseAdmin
        .from('trips')
        .select('start_date, end_date, metadata')
        .eq('id', existingTripId)
        .eq('owner_id', userId)
        .maybeSingle()

      if (existingFetchError) {
        console.error('[plan-itinerary] Failed to load existing trip metadata:', existingFetchError)
      } else {
        existingTrip = existing
      }
    }

    const startDateForTrip = normalized.startDate ?? existingTrip?.start_date ?? null
    const endDateForTrip = normalized.endDate ?? existingTrip?.end_date ?? null

    const metadataBase = clonePlainObject(existingTrip?.metadata)
    const previousTravelWindow = clonePlainObject(metadataBase['travel_window'])
    delete metadataBase['travel_window']

    const travelWindowUpdate: Record<string, unknown> = {}
    if (startDateForTrip) {
      travelWindowUpdate.departure_date = startDateForTrip
    }
    if (normalized.departureLocation) {
      travelWindowUpdate.departure_location = normalized.departureLocation
    }
    if (normalized.departureTime) {
      travelWindowUpdate.departure_time = normalized.departureTime
    }
    if (endDateForTrip) {
      travelWindowUpdate.return_date = endDateForTrip
    }
    if (normalized.returnTime) {
      travelWindowUpdate.return_time = normalized.returnTime
    }

    const mergedTravelWindow = {
      ...previousTravelWindow,
      ...travelWindowUpdate,
    }

    const metadataPayload: Record<string, unknown> = {
      ...metadataBase,
      source: 'ai_generated',
    }

    if (existingTripId) {
      metadataPayload.updated_at = new Date().toISOString()
    }

    if (Object.keys(mergedTravelWindow).length > 0) {
      metadataPayload.travel_window = mergedTravelWindow
    }

    normalized = {
      ...normalized,
      startDate: startDateForTrip,
      endDate: endDateForTrip,
    }

    let tripId: string

    if (existingTripId) {
      // 更新现有行程
      const { error: updateError } = await supabaseAdmin
        .from('trips')
        .update({
          title: normalized.title,
          destination: normalized.destination,
          start_date: normalized.startDate || null,
          end_date: normalized.endDate || null,
          party_size: normalized.partySize ?? 1,
          budget_currency: normalized.budgetCurrency || 'CNY',
          budget_total: normalized.budgetTotal,
          notes: normalized.notes || null,
          metadata: metadataPayload,
        })
        .eq('id', existingTripId)
        .eq('owner_id', userId)

      if (updateError) {
        console.error('[plan-itinerary] Failed to update trip:', updateError)
        throw updateError
      }

      tripId = existingTripId

      // 删除现有的每日行程和活动（重新生成）
      await supabaseAdmin
        .from('trip_days')
        .delete()
        .eq('trip_id', tripId)
    } else {
      // 创建新行程记录
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .insert({
          owner_id: userId,
          title: normalized.title,
          destination: normalized.destination,
          start_date: normalized.startDate || null,
          end_date: normalized.endDate || null,
          party_size: normalized.partySize ?? 1,
          budget_currency: normalized.budgetCurrency || 'CNY',
          budget_total: normalized.budgetTotal,
          notes: normalized.notes || null,
          metadata: metadataPayload,
        })
        .select('id')
        .single()

      if (tripError) {
        console.error('[plan-itinerary] Failed to create trip:', tripError)
        throw tripError
      }

      tripId = trip.id
    }

    // 批量创建每日行程
    const tripDaysData = normalized.days.map((day) => ({
      trip_id: tripId,
      day_index: day.dayIndex,
      date: day.date || null,
      summary: day.summary || `${normalized.destination} 行程安排`,
    }))

    const { data: tripDays, error: daysError } = await supabaseAdmin
      .from('trip_days')
      .insert(tripDaysData)
      .select('id, day_index')

    if (daysError) {
      console.error('[plan-itinerary] Failed to create trip days:', daysError)
      throw daysError
    }

    // 创建活动记录（关联到对应的 day）
    const activitiesData: unknown[] = []
    for (const day of normalized.days) {
      const dayRecord = tripDays.find((d: { id: string; day_index: number }) => d.day_index === day.dayIndex)
      if (!dayRecord) continue

      for (const activity of day.activities) {
        activitiesData.push({
          trip_id: tripId,
          trip_day_id: dayRecord.id,
          day_index: day.dayIndex,
          order_index: activity.orderIndex,
          title: activity.title,
          location: activity.location,
          start_time: activity.startTimeIso,
          end_time: activity.endTimeIso,
          estimated_cost: activity.estimatedCost,
          category: activity.category,
          notes: activity.notes,
          metadata:
            activity.startTimeText || activity.endTimeText
              ? {
                  time_text: {
                    start: activity.startTimeText,
                    end: activity.endTimeText,
                  },
                }
              : {},
        })
      }
    }

    if (activitiesData.length > 0) {
      const { error: activitiesError } = await supabaseAdmin
        .from('trip_activities')
        .insert(activitiesData)

      if (activitiesError) {
        console.error('[plan-itinerary] Failed to create activities:', activitiesError)
        // 不抛出错误，因为行程主体已创建成功
      }
    }

    return { tripId, success: true }
  } catch (error) {
    console.error('[plan-itinerary] Parse and store error:', error)
    return {
      tripId: existingTripId || '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const buildFallbackItinerary = (prompt: string): AIItinerary => {
  const now = new Date()
  const dateString = now.toISOString().slice(0, 10)
  const destinationMatch = prompt.match(/去([\u4e00-\u9fa5A-Za-z\s]{1,12})玩|到([\u4e00-\u9fa5A-Za-z\s]{1,12})/)
  const destination = destinationMatch?.[1] || destinationMatch?.[2] || '目的地待定'

  // 尝试提取省份信息，如果没有则使用常见省会对应
  const provinceMap: Record<string, string> = {
    '北京': '北京市',
    '上海': '上海市',
    '杭州': '浙江省',
    '南京': '江苏省',
    '苏州': '江苏省',
    '成都': '四川省',
    '西安': '陕西省',
    '广州': '广东省',
    '深圳': '广东省',
  }
  
  const province = provinceMap[destination] || ''
  const fullLocation = province ? `${province}${destination}市` : destination

  const summaryBase = `根据偏好生成的基础行程草案，目的地：${destination}`

  const buildDay = (offset: number): AIItinerary['days'][number] => ({
    dayIndex: offset + 1,
    date: new Date(now.getTime() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    summary: `围绕 ${destination} 的观光与体验安排`,
    activities: [
      {
        title: `${destination} 市区漫步`,
        location: `${fullLocation}市中心商圈`,
        startTime: '09:00',
        endTime: '11:30',
        category: 'sightseeing',
        estimatedCost: 0,
        notes: '可根据兴趣选择城市地标或历史街区。',
      },
      {
        title: `${destination} 当地美食体验`,
        location: `${fullLocation}特色美食街区`,
        startTime: '12:30',
        endTime: '14:00',
        category: 'dining',
        estimatedCost: 120,
        notes: '尝试当地特色菜肴，记得提前预约热门餐厅。',
      },
      {
        title: `${destination} 文化景点`,
        location: `${fullLocation}核心景区`,
        startTime: '15:00',
        endTime: '18:00',
        category: 'sightseeing',
        estimatedCost: 80,
        notes: '建议提前在线购票，避开高峰时段进入。',
      },
      {
        title: `${destination} 夜间休闲`,
        location: `${fullLocation}夜生活区域`,
        startTime: '19:30',
        endTime: '21:30',
        category: 'other',
        estimatedCost: 100,
        notes: '可选择夜游或咖啡酒吧，根据团队喜好调整。',
      },
    ],
  })

  return {
    title: `${destination} 行程草稿`,
    destination,
    startDate: dateString,
    endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    departureLocation: '出发地待定',
    partySize: 2,
    budgetTotal: 2500,
    budgetCurrency: 'CNY',
    notes: summaryBase,
    days: [buildDay(0), buildDay(1), buildDay(2)],
  }
}

const parseBearerToken = (req: Request): string | null => {
  const authorization = req.headers.get('Authorization')
  if (!authorization) return null
  const token = authorization.trim()
  if (!token.toLowerCase().startsWith('bearer ')) return null
  return token.slice(7)
}

const resolveUserId = async (req: Request, hintedUserId?: string): Promise<string | null> => {
  const accessToken = parseBearerToken(req)
  if (accessToken) {
    const {
      data: authData,
      error,
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (!error && authData?.user?.id) {
      if (hintedUserId && hintedUserId !== authData.user.id) {
        console.warn('[plan-itinerary] userId mismatch between token and payload, using token value')
      }
      return authData.user.id
    }

    if (error) {
      console.error('[plan-itinerary] Failed to resolve user from token', error)
    }
  }

  if (hintedUserId) {
    return hintedUserId
  }

  return null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  if (!supabaseUrl) {
    return new Response('Server misconfiguration', { status: 500, headers: corsHeaders })
  }

  let body: PlanRequestBody
  try {
    body = await req.json()
  } catch (_error) {
    return new Response('Invalid JSON payload', { status: 400, headers: corsHeaders })
  }

  if (!body.prompt) {
    return new Response('prompt is required', { status: 422, headers: corsHeaders })
  }

  try {
  let completion: ChatCompletion | null = null
    let content: string | null = null
    const userId = await resolveUserId(req, body.userId)

    if (!userId) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    if (deepseekApiKey) {
      try {
        const llmResponse = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-ai/DeepSeek-V3',
            messages: [
              {
                role: 'system',
                content:
                  `你是专业的中国旅行规划助手。用户会提供目的地和天数，你需要直接输出完整的行程安排 JSON，格式如下：

{
  "title": "行程标题",
  "destination": "目的地城市",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "departureLocation": "出发省市+具体地点（例如：江苏省南京市南京南站）",
  "partySize": 人数（数字）,
  "budgetTotal": 预算金额（数字）,
  "budgetCurrency": "CNY",
  "notes": "整体说明",
  "days": [
    {
      "dayIndex": 1,
      "date": "YYYY-MM-DD",
      "summary": "当日概要",
      "activities": [
        {
          "title": "活动名称",
          "location": "省+市+区+具体地点全称（例如：浙江省杭州市西湖区西湖风景名胜区、北京市东城区天安门广场、江苏省苏州市姑苏区拙政园）",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "category": "transportation/accommodation/dining/sightseeing/shopping/other",
          "estimatedCost": 费用（数字）,
          "notes": "备注"
        }
      ]
    }
  ]
}

**关键要求 - 地理位置信息格式规范：**
1. 必须返回有效的 JSON 格式，不要添加额外的解释文字
2. 每日至少包含 3-5 个活动
3. **departureLocation 和每个活动的 location 字段都必须使用完整的行政区划格式："省+市+区/县+具体地点全称"**
4. **景点示例：**
   - ✅ 正确："浙江省杭州市西湖区西湖风景名胜区"
   - ✅ 正确："江苏省苏州市姑苏区拙政园"
   - ✅ 正确："北京市东城区故宫博物院"
   - ❌ 错误："西湖"、"杭州西湖"（太模糊）
5. **餐厅示例：**
   - ✅ 正确："浙江省杭州市上城区楼外楼（孤山路店）"
   - ✅ 正确："江苏省南京市秦淮区夫子庙美食街"
   - ❌ 错误："当地餐厅"、"市中心美食"
6. **酒店示例：**
   - ✅ 正确："浙江省杭州市西湖区湖滨商圈"
   - ✅ 正确："江苏省苏州市姑苏区观前街附近"
   - ❌ 错误："市区酒店"、"景区附近"
7. **交通站点示例：**
   - ✅ 正确："江苏省南京市玄武区南京站"
   - ✅ 正确："浙江省杭州市上城区杭州东站"
   - ❌ 错误："火车站"、"高铁站"
8. 如果跨省/跨市旅行，每个活动必须清晰标注完整的省市区信息
9. 优先使用景点、餐厅、酒店的官方全称或广为人知的完整名称
10. 包含详细的景点信息、开放时间、门票价格
11. 标注交通方式和预估费用
12. 使用简体中文

**地址质量检查清单：**
- 每个 location 是否包含省级行政区？
- 每个 location 是否包含市级行政区？
- 每个 location 是否包含区/县级行政区？
- 每个 location 是否包含可识别的具体地点名称？
- 地点名称是否足够详细，能够在地图上唯一定位？`,
              },
              {
                role: 'user',
                content: body.prompt,
              },
            ],
            stream: false,
          }),
        })

        if (llmResponse.ok) {
          const parsed = (await llmResponse.json()) as ChatCompletion
          completion = parsed
          content = parsed.choices[0]?.message?.content ?? null
        } else {
          const errorText = await llmResponse.text()
          console.error('[plan-itinerary] DeepSeek API error:', errorText)
        }
      } catch (apiError) {
        console.error('[plan-itinerary] DeepSeek request failed', apiError)
      }
    }

    if (!content) {
      const fallback = buildFallbackItinerary(body.prompt)
      content = JSON.stringify(fallback)
      completion = {
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      }
    }

    let tripId: string | null = null
    let parseError: string | null = null

    if (!content) {
      return new Response('No content generated', { status: 502, headers: corsHeaders })
    }

    if (userId) {
  const result = await parseAndStoreItinerary(content, userId, body.tripId, body.prompt)
      if (result.success) {
        tripId = result.tripId
      } else {
        parseError = result.error || 'Failed to parse itinerary'
        console.error('[plan-itinerary] Parse error:', parseError)
      }

      // 无论是否解析成功，都保存原始响应到 voice_transcripts
      const { error: transcriptError } = await supabaseAdmin
        .from('voice_transcripts')
        .insert({
          content: content,
          trip_id: tripId,
          user_id: userId,
        })

      if (transcriptError) {
        console.error('[plan-itinerary] Failed to save transcript:', transcriptError)
      }
    }

    return new Response(
      JSON.stringify({
        trip_id: tripId,
        parse_error: parseError,
        raw_content: content,
        raw: completion ?? {
          choices: [
            {
              message: {
                content,
              },
            },
          ],
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    )
  } catch (error) {
    console.error('[plan-itinerary] Unexpected error', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
