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
              `你是专业的中国旅行规划助手。用户会提供目的地和天数，你需要直接输出完整的行程安排，包括：
- 每日详细景点（开放时间、门票）
- 推荐餐厅与特色美食
- 住宿区域建议
- 交通方式与预估费用
请用简体中文回复，格式清晰，不要询问用户补充信息。`,
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

    // TODO: transform completion into structured itinerary and persist to trips/trip_days tables.
    let transcriptId: string | null = null
    if (body.userId) {
      const { data, error } = await supabaseAdmin
        .from('voice_transcripts')
        .insert({
          content: JSON.stringify(completion),
          trip_id: body.tripId ?? null,
          user_id: body.userId,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[plan-itinerary] Failed to persist raw response', error)
      } else {
        transcriptId = data?.id ?? null
      }
    }

    return new Response(
      JSON.stringify({
        transcript_id: transcriptId,
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
