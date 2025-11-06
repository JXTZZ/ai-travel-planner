import { Link } from 'react-router-dom';

export const HeroSection = (): JSX.Element => (
  <section className="grid gap-12 rounded-3xl bg-white/70 px-6 py-12 shadow-sm backdrop-blur-lg sm:grid-cols-2 sm:items-center sm:px-10">
    <div className="space-y-6">
      <p className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
        <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
        实时 AI 旅行助手
      </p>
      <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
        用 AI 设计你的下一次旅程
      </h1>
      <p className="text-base leading-relaxed text-slate-600">
        只需一句话，LoTus'AI assistant 即可生成个性化旅行行程、导航路线与预算建议，并支持语音交互和跨设备同步。
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          to="/planner"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:scale-105"
        >
          立即体验
        </Link>
        <Link
          to="/budget"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
        >
          管理预算
        </Link>
      </div>
    </div>
    <div className="relative flex h-80 items-center justify-center">
      <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/10 via-sky-200/40 to-primary/10 blur-2xl" />
      <img src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80" alt="旅行规划" className="h-full w-full rounded-3xl object-cover shadow-xl" />
    </div>
  </section>
);
