import { VoiceRecorder } from '../features/voice/VoiceRecorder';
import { VoiceHistory } from '../features/voice/VoiceHistory';

export const VoiceAssistantPage = (): JSX.Element => (
  <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">语音指令</h2>
      <p className="mt-2 text-sm text-slate-600">使用科大讯飞语音识别，快捷描述你的旅行需求或添加费用。</p>
      <VoiceRecorder />
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <VoiceHistory />
    </section>
  </div>
);
