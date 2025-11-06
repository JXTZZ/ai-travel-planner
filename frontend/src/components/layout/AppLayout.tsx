import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { NavigationMenu } from './NavigationMenu';

const brandName = "LoTus'AI assistant";

export const AppLayout = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg text-primary">
            <img src="/logo.svg" alt="LoTus'AI" className="h-8 w-8" />
            {brandName}
          </Link>
          <NavigationMenu />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 gap-6">
        {children}
      </main>

      <footer className="bg-slate-900 py-6 text-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} {brandName}</span>
          <span>AI 驱动的旅行规划与实时辅助平台</span>
        </div>
      </footer>
    </div>
  );
};
