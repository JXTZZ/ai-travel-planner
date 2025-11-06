import type { RouteObject } from 'react-router-dom'
import { useRoutes } from 'react-router-dom'
import HomePage from '../modules/home/pages/HomePage'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
]

export const AppRoutes = () => {
  return useRoutes(routes)
}
