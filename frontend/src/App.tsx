import { Suspense } from 'react';
import { SupabaseProvider } from './lib/supabase';
import { AppRoutes } from './routes/AppRoutes';
import { AppLayout } from './components/layout/AppLayout';
import { FullscreenLoader } from './components/feedback/FullscreenLoader';
import { Toaster } from './components/feedback/Toaster';

const App = (): JSX.Element => (
  <SupabaseProvider>
    <AppLayout>
      <Suspense fallback={<FullscreenLoader message="正在加载 LoTus'AI assistant..." />}>
        <AppRoutes />
      </Suspense>
      <Toaster />
    </AppLayout>
  </SupabaseProvider>
);

export default App;
