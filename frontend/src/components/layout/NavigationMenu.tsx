import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';

const links = [
  { to: '/', label: '首页' },
  { to: '/planner', label: '行程规划' },
  { to: '/budget', label: '预算管理' },
  { to: '/voice', label: '语音助手' },
  { to: '/profile', label: '个人中心' }
] as const;

export const NavigationMenu = (): JSX.Element => {
  const items = useMemo(() => links, []);
  return (
    <nav className="hidden items-center gap-4 text-sm font-medium text-slate-600 sm:flex">
      {items.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `rounded-full px-3 py-1 transition-colors ${isActive ? 'bg-primary text-white shadow-sm' : 'hover:bg-slate-100'}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
};
