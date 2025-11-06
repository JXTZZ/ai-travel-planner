import { createContext, useContext, type PropsWithChildren } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from './supabase-client';

const SupabaseContext = createContext<SupabaseClient | null>(null);

export const SupabaseProvider = ({ children }: PropsWithChildren): JSX.Element => (
  <SupabaseContext.Provider value={supabaseClient}>{children}</SupabaseContext.Provider>
);

export const useSupabase = (): SupabaseClient => {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error('useSupabase 必须在 SupabaseProvider 内使用');
  }
  return ctx;
};
