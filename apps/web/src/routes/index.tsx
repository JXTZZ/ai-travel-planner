import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Navigate, useRoutes } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AppLayout } from '../components/AppLayout'

const HomePage = lazy(() => import('../modules/home/pages/HomePage'))
const AuthPage = lazy(() => import('../modules/auth/pages/AuthPage'))
const AuthDebugPage = lazy(() => import('../pages/AuthDebugPage'))
const TripDebugPage = lazy(() => import('../pages/TripDebugPage'))
const PlannerDashboard = lazy(() => import('../modules/planner/pages/PlannerDashboard'))
const TripDetailPage = lazy(() => import('../modules/planner/pages/TripDetailPage'))
const BudgetPage = lazy(() => import('../modules/budget/pages/BudgetPage'))
const VoiceAssistantPage = lazy(() => import('../modules/voice/pages/VoiceAssistantPage'))
const CalendarPage = lazy(() => import('../modules/calendar/pages/CalendarPage'))
const SettingsPage = lazy(() => import('../modules/settings/pages/SettingsPage'))
const MapExplorerPage = lazy(() => import('../modules/map/pages/MapExplorerPage'))

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
    {element}
  </Suspense>
)

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

const routes: RouteObject[] = [
  {
    path: '/auth',
    element: withSuspense(<AuthPage />),
  },
  {
    path: '/debug',
    element: withSuspense(<AuthDebugPage />),
  },
  {
    path: '/trip-debug',
    element: withSuspense(<TripDebugPage />),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withSuspense(<HomePage />),
      },
      {
        path: 'planner',
        element: withSuspense(<PlannerDashboard />),
      },
      {
        path: 'planner/:id',
        element: withSuspense(<TripDetailPage />),
      },
      {
        path: 'map',
        element: withSuspense(<MapExplorerPage />),
      },
      {
        path: 'budget',
        element: withSuspense(<BudgetPage />),
      },
      {
        path: 'voice',
        element: withSuspense(<VoiceAssistantPage />),
      },
      {
        path: 'calendar',
        element: withSuspense(<CalendarPage />),
      },
      {
        path: 'settings',
        element: withSuspense(<SettingsPage />),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]

export const AppRoutes = () => {
  return useRoutes(routes)
}
