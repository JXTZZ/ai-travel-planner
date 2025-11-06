import { useState } from 'react';
import clsx from 'clsx';
import { useBudgetStore } from '../../../store/budget-store';

const expenseCategories = ['交通', '住宿', '餐饮', '娱乐体验', '购物'] as const;

export const ExpenseRecorder = (): JSX.Element => {
  const addExpense = useBudgetStore((state) => state.addExpense);
  const [form, setForm] = useState({ category: expenseCategories[0], amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (field: 'category' | 'amount' | 'note', value: string): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('请输入大于 0 的金额');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      addExpense({
        amount,
        category: form.category,
        note: form.note,
        source: 'manual'
      });
      setForm({ category: form.category, amount: '', note: '' });
      setMessage('已记录开销');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="font-medium text-slate-700">类别</span>
          <select
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.category}
            onChange={(event) => handleChange('category', event.target.value)}
          >
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="font-medium text-slate-700">金额（元）</span>
          <input
            type="number"
            min={0}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.amount}
            onChange={(event) => handleChange('amount', event.target.value)}
          />
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm text-slate-600">
        <span className="font-medium text-slate-700">备注</span>
        <textarea
          rows={3}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={form.note}
          onChange={(event) => handleChange('note', event.target.value)}
          placeholder="可选：记录具体商家或同行人"
        />
      </label>
      <button
        type="submit"
        className={clsx(
          'w-full rounded-full px-4 py-3 text-sm font-semibold text-white shadow-md transition',
          saving ? 'bg-slate-400' : 'bg-primary hover:opacity-95'
        )}
        disabled={saving}
      >
        {saving ? '保存中…' : '添加开销'}
      </button>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
    </form>
  );
};
