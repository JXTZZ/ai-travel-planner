const features = [
  {
    title: '语音驱动的快速规划',
    description: '通过科大讯飞语音识别，一句话即可捕捉旅行需求，系统自动补全细节并生成行程。'
  },
  {
    title: '地图联动导航',
    description: '整合高德地图，查看景点位置、交通路线与实时提醒，实现旅途全程可视化。'
  },
  {
    title: '智能费用管理',
    description: '利用 AI 估算预算、监控开销，并支持语音记账，保障行程在计划内运行。'
  },
  {
    title: '多设备云端同步',
    description: 'Supabase 提供认证与存储，行程、偏好、预算同步到云端，随时随地查看。'
  }
] as const;

export const FeatureHighlights = (): JSX.Element => (
  <section className="grid gap-6 sm:grid-cols-2">
    {features.map((feature) => (
      <article key={feature.title} className="rounded-2xl bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.description}</p>
      </article>
    ))}
  </section>
);
