// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const destination = payload?.destination ?? '未知目的地';
  const budget = Number(payload?.budget ?? 10000);
  const preferences = Array.isArray(payload?.preferences) ? payload.preferences.join(' / ') : '通用体验';

  const body = {
    title: `${destination} 智能行程规划`,
    intro: `该行程由 LoTus'AI assistant 生成，参考预算 ¥${Math.round(budget)}，偏好：${preferences}`,
    days: [
      {
        date: payload?.startDate ?? 'Day 1',
        summary: `${destination} 体验开启`,
        activities: [
          {
            time: '09:00',
            title: '城市初探',
            description: '抵达后前往市中心，安排轻松步行或咖啡馆体验。',
            location: '市中心'
          },
          {
            time: '14:00',
            title: '特色活动',
            description: `根据偏好 ${preferences} 安排主题体验。`
          },
          {
            time: '19:00',
            title: '晚餐安排',
            description: '推荐评分 4.5+ 的本地餐厅，提前预约避免排队。'
          }
        ]
      }
    ],
    budget: {
      totalEstimate: budget,
      breakdown: [
        { category: '交通', amount: budget * 0.25 },
        { category: '住宿', amount: budget * 0.35 },
        { category: '餐饮', amount: budget * 0.2 },
        { category: '体验', amount: budget * 0.2 }
      ]
    },
    recommendations: [
      '请在实际部署后替换为调用 DeepSeek 模型的逻辑。',
      '在 Supabase Secret 中配置 LLM API Key，避免泄露。',
      '根据用户行程需求扩展每日活动数量。'
    ]
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
