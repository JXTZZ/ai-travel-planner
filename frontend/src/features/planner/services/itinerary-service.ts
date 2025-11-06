import type { Itinerary, TravelerProfile } from '../../../types/itinerary';

const EDGE_FUNCTION_PATH = '/functions/v1/lotus-itinerary';

const buildEdgeFunctionUrl = (): string | null => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) {
    return null;
  }
  return `${baseUrl}${EDGE_FUNCTION_PATH}`;
};

export const fetchAiItinerary = async (profile: TravelerProfile): Promise<Itinerary> => {
  const endpoint = buildEdgeFunctionUrl();

  if (!endpoint) {
    return mockItinerary(profile, 'Supabase URL 未配置，返回模拟行程。');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''}`
    },
    body: JSON.stringify(profile)
  });

  if (!response.ok) {
    console.warn('Edge Function 调用失败，使用本地模拟数据。');
    return mockItinerary(profile, `Edge Function 调用失败：${response.status}`);
  }

  const data = (await response.json()) as Itinerary;
  return data;
};

const mockItinerary = (profile: TravelerProfile, reason: string): Itinerary => {
  const start = new Date(profile.startDate);
  const end = new Date(profile.endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const itineraryDays = Array.from({ length: days }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      summary: `${profile.destination} 第 ${index + 1} 天亮点`,
      activities: [
        {
          time: '09:00',
          title: '早餐与城市漫步',
          description: '探索当地街区，体验特色早餐与咖啡文化。',
          location: '城市中心'
        },
        {
          time: '13:30',
          title: '特色体验',
          description: `结合偏好 ${profile.preferences.join(' / ')} 推荐定制活动。`
        },
        {
          time: '19:00',
          title: '晚餐与夜生活',
          description: '预订口碑餐厅，安排夜景或亲子活动。'
        }
      ],
      accommodation: '推荐入住市中心四星酒店，方便交通与休息。',
      diningHighlights: ['本地特色料理', '热门咖啡店', '亲子友好餐厅'],
      transportationNotes: '建议购买一日交通票或使用当地公交/地铁。'
    };
  });

  return {
    title: `${profile.destination} 旅行计划`,
    intro: `以下行程由 LoTus'AI assistant 基于你的需求生成（${reason}）。`,
    days: itineraryDays,
    budget: {
      totalEstimate: profile.budget,
      breakdown: [
        { category: '交通', amount: profile.budget * 0.25 },
        { category: '住宿', amount: profile.budget * 0.35 },
        { category: '餐饮', amount: profile.budget * 0.2 },
        { category: '娱乐体验', amount: profile.budget * 0.2 }
      ]
    },
    recommendations: ['提前预约热门景点', '下载离线地图', '准备适合天气的衣物']
  };
};
