import { useState } from 'react';
import clsx from 'clsx';
import { useVoiceStore } from '../../store/voice-store';

const modes = [
  {
    key: 'planning' as const,
    label: '行程规划',
    hint: '示例：帮我规划 5 天东京亲子游'
  },
  {
    key: 'budget' as const,
    label: '费用记账',
    hint: '示例：记录餐饮 350 元'
  }
];

export const VoiceRecorder = (): JSX.Element => {
  const addCommand = useVoiceStore((state) => state.addCommand);
  const updateCommand = useVoiceStore((state) => state.updateCommand);
  const [currentMode, setCurrentMode] = useState<(typeof modes)[number]['key']>('planning');
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleRecording = async (): Promise<void> => {
    if (recording) {
      // TODO: 集成科大讯飞 SDK 停止录音，获取最终文本
      setRecording(false);
      if (!transcript) {
        setError('未捕获到语音内容，可尝试重新录制');
        return;
      }
      const command = addCommand({ transcript, mode: currentMode, result: undefined });
      setTranscript('');
      setError(null);
      updateCommand(command.id, { status: 'processing' });
      // TODO: 调用后端处理语音结果（行程生成或记账）
      updateCommand(command.id, {
        status: 'completed',
        result: '示例：已将语音内容提交给 AI 处理，稍后可在记录中查看详细结果。'
      });
    } else {
      setRecording(true);
      setError(null);
      // TODO: 初始化科大讯飞实时语音识别，持续更新 transcript
      setTranscript('（示例文本）帮我安排 3 天厦门美食之旅');
    }
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => (
          <button
            key={mode.key}
            type="button"
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-medium transition',
              currentMode === mode.key ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
            onClick={() => setCurrentMode(mode.key)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center">
        <p className="text-sm text-slate-600">{modes.find((mode) => mode.key === currentMode)?.hint}</p>
        <p className="mt-2 text-xs text-slate-400">即将集成科大讯飞实时语音识别 SDK</p>
        <button
          type="button"
          className={clsx(
            'mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition',
            recording ? 'bg-rose-500 hover:bg-rose-600' : 'bg-primary hover:bg-primary-dark'
          )}
          onClick={toggleRecording}
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-white" aria-hidden />
          {recording ? '停止录音' : '开始录音'}
        </button>
        {transcript && <p className="mt-4 text-sm text-primary">实时转写：{transcript}</p>}
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
};
