import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { useTokenExpiration } from '@/hooks/useAuthError'

// Layout components
import AuthLayout from '@/components/layouts/AuthLayout'
import MainLayout from '@/components/layouts/MainLayout'

// Error handling
import ErrorBoundary from '@/components/ErrorBoundary'

// Page components
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Profile from '@/pages/Profile'
import Reels from '@/pages/Reels'
import Messages from '@/pages/Messages'
import Explore from '@/pages/Explore'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'

// Protected route component
import ProtectedRoute from '@/components/common/ProtectedRoute'

// Global loading component
import GlobalLoading from '@/components/common/GlobalLoading'

// Connection status component
import ConnectionStatus from '@/components/common/ConnectionStatus'

function App() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore()
  const { theme, initializeTheme } = useThemeStore()
  
  // Monitor token expiration
  useTokenExpiration()

  // Initialize app on mount
  useEffect(() => {
    const initialize = async () => {
      // Initialize theme
      initializeTheme()
      
      // Initialize authentication
      await initializeAuth()
    }

    initialize()
  }, [initializeAuth, initializeTheme])

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Show loading screen during initial authentication check
  if (isLoading) {
    return <GlobalLoading />
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-dark-bg text-dark-text">
        <AnimatePresence mode="wait">
          <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <AuthLayout>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Login />
                  </motion.div>
                </AuthLayout>
              )
            }
          />
          
          <Route
            path="/register"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <AuthLayout>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Register />
                  </motion.div>
                </AuthLayout>
              )
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Home />
                  </motion.div>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Explore />
                  </motion.div>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reels"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Reels />
                  </motion.div>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Messages />
                  </motion.div>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/:username?"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Profile />
                  </motion.div>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Settings />
                  </motion.div>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 Not Found */}
          <Route
            path="*"
            element={
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <NotFound />
              </motion.div>
            }
          />
          </Routes>
        </AnimatePresence>
        
        {/* Connection status indicator */}
        {isAuthenticated && <ConnectionStatus />}
      </div>
    </ErrorBoundary>
  )
}

export default App