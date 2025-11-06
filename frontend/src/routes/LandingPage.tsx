import { Link } from 'react-router-dom';
import { FeatureHighlights } from '../components/sections/FeatureHighlights';
import { HeroSection } from '../components/sections/HeroSection';
import { WorkflowSteps } from '../components/sections/WorkflowSteps';

export const LandingPage = (): JSX.Element => (
  <div className="flex flex-col gap-16">
    <HeroSection />
    <FeatureHighlights />
    <WorkflowSteps />
    <section className="rounded-3xl bg-gradient-to-r from-primary to-primary-dark px-8 py-12 text-white">
      <div className="flex flex-col gap-4 text-center">
        <h2 className="text-3xl font-semibold">准备好体验 AI 驱动的旅行了吗？</h2>
        <p className="text-base text-white/80">
          立即开始规划下一次旅程，让 LoTus'AI assistant 为你提供全程智能陪伴。
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            to="/planner"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg shadow-black/10 transition hover:scale-105"
          >
            开始规划
          </Link>
          <Link
            to="/voice"
            className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            体验语音助手
          </Link>
        </div>
      </div>
    </section>
  </div>
);
