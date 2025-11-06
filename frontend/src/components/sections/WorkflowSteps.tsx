const steps = [
  {
    title: '1. 描述旅程',
    detail: '通过语音或文字告诉 LoTus 目的地、日期、预算、偏好与同行人。'
  },
  {
    title: '2. AI 生成行程',
    detail: '调用 DeepSeek 模型与已有数据，输出每日行程、交通、住宿与预算。'
  },
  {
    title: '3. 地图导航与协作',
    detail: '在地图上查看路线，与家人或朋友共享并实时调整计划。'
  },
  {
    title: '4. 费用跟踪',
    detail: '在旅途中语音记账，系统自动对比预算，提醒可能的超支。'
  }
] as const;

export const WorkflowSteps = (): JSX.Element => (
  <section className="space-y-8 rounded-3xl bg-white px-8 py-10 shadow-sm">
    <h2 className="text-2xl font-semibold text-slate-900">旅程如何生成？</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      {steps.map((step) => (
        <article key={step.title} className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h3 className="text-lg font-semibold text-primary">{step.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{step.detail}</p>
        </article>
      ))}
    </div>
  </section>
);
