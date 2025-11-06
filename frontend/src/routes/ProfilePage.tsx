import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabase } from '../lib/supabase';

export const ProfilePage = (): JSX.Element => {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithMagicLink = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        throw error;
      }
      setMessage('登录链接已发送至邮箱，请查看邮件完成认证。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发送登录链接失败');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setMessage('已退出登录');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '退出登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">账户与偏好</h2>
      <p className="mt-2 text-sm text-slate-600">登录后可保存行程、预算记录，并在多设备查看。</p>

      {session ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-600">当前登录邮箱</p>
            <p className="text-lg font-semibold text-slate-900">{session.user.email}</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md"
            onClick={signOut}
            disabled={loading}
          >
            {loading ? '处理中…' : '退出登录'}
          </button>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={signInWithMagicLink}>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">邮箱</span>
            <input
              type="email"
              required
              placeholder="输入邮箱获取登录链接"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md"
            disabled={loading}
          >
            {loading ? '发送中…' : '发送登录链接'}
          </button>
        </form>
      )}

      {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
    </div>
  );
};
