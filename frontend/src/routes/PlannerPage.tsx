import { PlannerForm } from '../features/planner/components/PlannerForm';
import { SuggestedItinerary } from '../features/planner/components/SuggestedItinerary';
import { ItineraryMap } from '../features/planner/components/ItineraryMap';
import { usePlannerStore } from '../store/planner-store';

export const PlannerPage = (): JSX.Element => {
  const itinerary = usePlannerStore((state) => state.itinerary);

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className="space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">规划旅程</h2>
          <p className="mt-2 text-sm text-slate-600">输入旅行要素，让 LoTus 的 AI 立即生成定制行程。</p>
          <PlannerForm />
        </section>
      </div>
      <section className="flex flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SuggestedItinerary itinerary={itinerary} />
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">地图预览</h3>
          <p className="mt-1 text-sm text-slate-600">后续将根据 AI 行程在高德地图上展示关键地点与路线。</p>
          <div className="mt-4">
            <ItineraryMap itinerary={itinerary} />
          </div>
        </div>
      </section>
    </div>
  );
};
