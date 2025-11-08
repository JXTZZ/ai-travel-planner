import { AuthProvider } from './contexts/AuthContext'
import { AppRoutes } from './routes'
import { ErrorBoundary } from './components/ErrorBoundary'

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
