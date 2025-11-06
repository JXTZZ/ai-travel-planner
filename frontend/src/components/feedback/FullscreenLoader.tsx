type FullscreenLoaderProps = {
  message?: string;
};

export const FullscreenLoader = ({ message }: FullscreenLoaderProps): JSX.Element => (
  <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 text-center">
    <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden />
    <div className="space-y-1">
      <p className="text-base font-medium text-slate-800">{message ?? '正在加载...'}</p>
      <p className="text-sm text-slate-500">请稍候，LoTus AI 正在准备需要的数据。</p>
    </div>
  </div>
);
