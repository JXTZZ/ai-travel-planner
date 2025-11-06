import { useMemo } from 'react';
import { useBudgetStore } from '../../../store/budget-store';

type BudgetOverviewProps = {
  totalBudget: number;
};

const categories = ['交通', '住宿', '餐饮', '娱乐体验', '购物'] as const;

export const BudgetOverview = ({ totalBudget }: BudgetOverviewProps): JSX.Element => {
  const expenses = useBudgetStore((state) => state.expenses);

  const grouped = useMemo(() => {
    return categories.map((category) => {
      const categoryExpenses = expenses.filter((expense) => expense.category === category);
      const total = categoryExpenses.reduce((sum, item) => sum + item.amount, 0);
      return { category, total, count: categoryExpenses.length };
    });
  }, [expenses]);

  const spent = grouped.reduce((sum, item) => sum + item.total, 0);
  const remain = Math.max(0, totalBudget - spent);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-slate-900">预算概览</h2>
        <p className="text-sm text-slate-600">当前预算 ¥{totalBudget.toLocaleString()}，已花费 ¥{spent.toLocaleString()}</p>
        <div className="rounded-2xl bg-slate-100 p-4">
          <p className="text-sm text-slate-600">剩余预算</p>
          <p className="text-2xl font-semibold text-primary">¥{remain.toLocaleString()}</p>
        </div>
      </header>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">分类支出</h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {grouped.map(({ category, total, count }) => (
            <li key={category} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{category}</span>
                <span className="text-xs text-slate-400">{count} 笔</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">¥{total.toLocaleString()}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${totalBudget ? Math.min(100, Math.round((total / totalBudget) * 100)) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
