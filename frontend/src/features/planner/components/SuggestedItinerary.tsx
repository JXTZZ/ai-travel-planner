import type { Itinerary } from '../../../types/itinerary';

type SuggestedItineraryProps = {
  itinerary: Itinerary | null;
};

export const SuggestedItinerary = ({ itinerary }: SuggestedItineraryProps): JSX.Element => {
  if (!itinerary) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-slate-500">
        <img
          src="https://illustrations.popsy.co/violet/paper-work.svg"
          alt="等待行程生成"
          className="h-40 w-40"
        />
        <div>
          <p className="text-base font-medium text-slate-600">准备好生成第一份智能行程</p>
          <p className="text-sm text-slate-500">填写左侧信息，LoTus AI 将为你提供详细规划。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">{itinerary.title}</h2>
        <p className="text-sm text-slate-600">{itinerary.intro}</p>
      </header>

      {itinerary.budget && (
        <section className="rounded-2xl bg-sky-50 p-4">
          <h3 className="text-lg font-semibold text-slate-900">预算概览</h3>
          <p className="text-sm text-slate-600">总预算约 ¥{Math.round(itinerary.budget.totalEstimate).toLocaleString()}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {itinerary.budget.breakdown.map((item) => (
              <li key={item.category} className="flex items-center justify-between rounded-xl bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
                <span>{item.category}</span>
                <span>¥{Math.round(item.amount).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-6">
        {itinerary.days.map((day) => (
          <article key={day.date} className="rounded-2xl border border-slate-200 p-5 shadow-sm">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">{day.date}</p>
                <h3 className="text-lg font-semibold text-slate-900">{day.summary}</h3>
              </div>
              {day.accommodation && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">住宿：{day.accommodation}</span>}
            </header>
            <div className="mt-4 space-y-3">
              {day.activities.map((activity) => (
                <div key={`${day.date}-${activity.time}-${activity.title}`} className="rounded-xl bg-white px-4 py-3 shadow-inner ring-1 ring-slate-100">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-semibold text-primary">{activity.time}</span>
                    <span className="text-sm font-semibold text-slate-800">{activity.title}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{activity.description}</p>
                  {activity.location && <p className="text-xs text-slate-500">地点：{activity.location}</p>}
                  {activity.costEstimate && (
                    <p className="text-xs text-slate-500">预计费用：¥{Math.round(activity.costEstimate).toLocaleString()}</p>
                  )}
                  {activity.tips && <p className="text-xs text-slate-500">提示：{activity.tips}</p>}
                </div>
              ))}
            </div>
            {day.diningHighlights && day.diningHighlights.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                {day.diningHighlights.map((highlight) => (
                  <li key={highlight} className="rounded-full bg-slate-100 px-3 py-1">
                    美食推荐：{highlight}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      {itinerary.recommendations && itinerary.recommendations.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">行前提醒</h3>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-600">
            {itinerary.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
