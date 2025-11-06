import { useForm } from 'react-hook-form';
import { differenceInDays, format } from 'date-fns';
import { usePlannerStore } from '../../../store/planner-store';
import type { TravelerProfile, TravelPreference } from '../../../types/itinerary';

const preferenceOptions: TravelPreference[] = ['美食', '亲子', '文化', '户外', '购物', '夜生活', '历史', '海岛'];

const defaultValues: TravelerProfile = {
  destination: '',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: format(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  budget: 10000,
  travelers: 2,
  preferences: ['美食', '文化'],
  notes: ''
};

export const PlannerForm = (): JSX.Element => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<TravelerProfile>({ defaultValues });
  const { generateItinerary, loading } = usePlannerStore((state) => ({
    generateItinerary: state.generateItinerary,
    loading: state.loading
  }));

  const onSubmit = async (values: TravelerProfile): Promise<void> => {
    await generateItinerary(values);
  };

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const dayCount = differenceInDays(new Date(endDate), new Date(startDate)) + 1;

  return (
    <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="destination">
          目的地
        </label>
        <input
          id="destination"
          type="text"
          placeholder="例如：日本东京"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          {...register('destination', { required: '请填写目的地' })}
        />
        {errors.destination && <p className="text-sm text-rose-500">{errors.destination.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="startDate">
            出发日期
          </label>
          <input
            id="startDate"
            type="date"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            {...register('startDate', { required: true })}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="endDate">
            返回日期
          </label>
          <input
            id="endDate"
            type="date"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            {...register('endDate', { required: true })}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">行程时长约 {Number.isFinite(dayCount) ? dayCount : '-'} 天</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="budget">
            总预算（元）
          </label>
          <input
            id="budget"
            type="number"
            min={0}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            {...register('budget', { valueAsNumber: true, min: 0 })}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="travelers">
            同行人数
          </label>
          <input
            id="travelers"
            type="number"
            min={1}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            {...register('travelers', { valueAsNumber: true, min: 1 })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <span className="block text-sm font-medium text-slate-700">旅行偏好</span>
        <div className="flex flex-wrap gap-2">
          {preferenceOptions.map((option) => (
            <label
              key={option}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-primary hover:text-primary"
            >
              <input
                type="checkbox"
                value={option}
                className="rounded border-slate-300 text-primary focus:ring-primary/30"
                {...register('preferences', {
                  validate: (value) => value.length > 0 || '至少选择一个偏好'
                })}
              />
              {option}
            </label>
          ))}
        </div>
        {errors.preferences && <p className="text-sm text-rose-500">{errors.preferences.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="notes">
          备注
        </label>
        <textarea
          id="notes"
          rows={4}
          placeholder="可选：补充更多旅行需求，例如与孩子同行、需要无障碍设施等"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          {...register('notes')}
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/40 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
      >
        {loading ? '正在生成行程…' : '生成专属行程'}
      </button>
    </form>
  );
};
