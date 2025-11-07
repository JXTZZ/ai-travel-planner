// @ts-ignore: Edge function executed in Deno runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// eslint-disable-next-line import/no-relative-packages
import { supabaseAdmin } from '../_shared/supabaseClient.ts'

// @ts-ignore Supabase Edge Functions provide Deno global at runtime.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')

if (!deepseekApiKey) {
  console.warn('[plan-itinerary] Missing DEEPSEEK_API_KEY. Function will return 500.')
}

interface PlanRequestBody {
  tripId?: string
  userId?: string
  prompt: string
  constraints?: Record<string, unknown>
}

interface AIItinerary {
  title: string
  destination: string
  startDate?: string
  endDate?: string
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

/**
 * 解析 AI 返回的内容并存储到数据库
 */
async function parseAndStoreItinerary(
  content: string,
  userId: string,
): Promise<{ tripId: string; success: boolean; error?: string }> {
  try {
    // 尝试从 AI 响应中提取 JSON
    let itinerary: AIItinerary

    // 尝试直接解析 JSON
    try {
      itinerary = JSON.parse(content)
    } catch {
      // 如果失败，尝试从文本中提取 JSON（AI 可能包裹在 markdown 代码块中）
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Unable to extract JSON from AI response')
      }
      itinerary = JSON.parse(jsonMatch[1] || jsonMatch[0])
    }

    // 验证必需字段
    if (!itinerary.title || !itinerary.destination || !itinerary.days || itinerary.days.length === 0) {
      throw new Error('Invalid itinerary structure: missing required fields')
    }

    // 创建行程记录
    const { data: trip, error: tripError } = await supabaseAdmin
      .from('trips')
      .insert({
        owner_id: userId,
        title: itinerary.title,
        destination: itinerary.destination,
        start_date: itinerary.startDate || null,
        end_date: itinerary.endDate || null,
        party_size: itinerary.partySize || 1,
        budget_currency: itinerary.budgetCurrency || 'CNY',
        budget_total: itinerary.budgetTotal || null,
        notes: itinerary.notes || null,
        metadata: { source: 'ai_generated' },
      })
      .select('id')
      .single()

    if (tripError) {
      console.error('[plan-itinerary] Failed to create trip:', tripError)
      throw tripError
    }

    const tripId = trip.id

    // 批量创建每日行程
    const tripDaysData = itinerary.days.map((day) => ({
      trip_id: tripId,
      day_index: day.dayIndex,
      date: day.date || null,
      summary: day.summary,
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
    for (const day of itinerary.days) {
      const dayRecord = tripDays.find((d: { id: string; day_index: number }) => d.day_index === day.dayIndex)
      if (!dayRecord) continue

      for (const activity of day.activities) {
        activitiesData.push({
          trip_day_id: dayRecord.id,
          title: activity.title,
          location: activity.location || null,
          start_time: activity.startTime || null,
          end_time: activity.endTime || null,
          category: activity.category || 'other',
          estimated_cost: activity.estimatedCost || null,
          notes: activity.notes || null,
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
      tripId: '',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!deepseekApiKey || !supabaseUrl) {
    return new Response('Server misconfiguration', { status: 500 })
  }

  let body: PlanRequestBody
  try {
    body = await req.json()
  } catch (_error) {
    return new Response('Invalid JSON payload', { status: 400 })
  }

  if (!body.prompt) {
    return new Response('prompt is required', { status: 422 })
  }

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
          "location": "具体地点",
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

要求：
1. 必须返回有效的 JSON 格式，不要添加额外的解释文字
2. 每日至少包含 3-5 个活动
3. 包含详细的景点信息、开放时间、门票价格
4. 提供餐厅推荐和特色美食
5. 包含住宿区域建议
6. 标注交通方式和预估费用
7. 使用简体中文`,
          },
          {
            role: 'user',
            content: body.prompt,
          },
        ],
        stream: false,
      }),
    })

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text()
      console.error('[plan-itinerary] DeepSeek API error:', errorText)
      return new Response('Failed to generate plan', { status: 502 })
    }

    const completion = await llmResponse.json()
    const content = completion.choices[0]?.message?.content

    if (!content) {
      return new Response('No content in AI response', { status: 502 })
    }

    // 解析并存储行程到数据库
    let tripId: string | null = null
    let parseError: string | null = null

    if (body.userId) {
      const result = await parseAndStoreItinerary(content, body.userId)
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
          user_id: body.userId,
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
        raw: completion,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('[plan-itinerary] Unexpected error', error)
    return new Response('Internal server error', { status: 500 })
  }
})
