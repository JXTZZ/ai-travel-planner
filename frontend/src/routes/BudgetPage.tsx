import { BudgetOverview } from '../features/budget/components/BudgetOverview';
import { ExpenseRecorder } from '../features/budget/components/ExpenseRecorder';
import { useBudgetStore } from '../store/budget-store';

export const BudgetPage = (): JSX.Element => {
  const { totalBudget } = useBudgetStore((state) => ({ totalBudget: state.totalBudget }));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">旅途记账</h2>
        <p className="mt-2 text-sm text-slate-600">通过语音或手动输入记录开销，系统自动对比预算。</p>
        <ExpenseRecorder />
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <BudgetOverview totalBudget={totalBudget} />
      </section>
    </div>
  );
};
