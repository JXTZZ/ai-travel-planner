import { useMemo } from 'react';
import { useVoiceStore } from '../../store/voice-store';

const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700'
};

export const VoiceHistory = (): JSX.Element => {
  const commands = useVoiceStore((state) => state.commands);

  const sorted = useMemo(
    () => [...commands].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [commands]
  );

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-slate-500">
        <img src="https://illustrations.popsy.co/violet/microphone.svg" alt="语音记录为空" className="h-32 w-32" />
        <p className="text-sm text-slate-500">尚未使用语音助手，点击左侧开始录音。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">语音记录</h2>
      <ul className="space-y-3">
        {sorted.map((command) => (
          <li key={command.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">{command.transcript}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[command.status] ?? ''}`}>
                {command.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{new Date(command.createdAt).toLocaleString()}</p>
            {command.result && <p className="mt-2 text-sm text-slate-600">{command.result}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
};
