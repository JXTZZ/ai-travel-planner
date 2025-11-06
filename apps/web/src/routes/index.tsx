import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Navigate, useRoutes } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'

const HomePage = lazy(() => import('../modules/home/pages/HomePage.tsx'))
const PlannerDashboard = lazy(() => import('../modules/planner/pages/PlannerDashboard.tsx'))
const BudgetPage = lazy(() => import('../modules/budget/pages/BudgetPage.tsx'))
const VoiceAssistantPage = lazy(() => import('../modules/voice/pages/VoiceAssistantPage.tsx'))
const CalendarPage = lazy(() => import('../modules/calendar/pages/CalendarPage.tsx'))
const SettingsPage = lazy(() => import('../modules/settings/pages/SettingsPage.tsx'))

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
    {element}
  </Suspense>
)

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
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
