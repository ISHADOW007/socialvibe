import { ReactNode, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  ChatBubbleLeftRightIcon,
  UserIcon,
  Cog6ToothIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  UserIcon as UserIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  PlayIcon as PlayIconSolid
} from '@heroicons/react/24/solid'
import { useAuthStore } from '@/store/authStore'
import socketService from '@/services/socketService'
import NotificationsManager from '@/components/common/NotificationsManager'

interface MainLayoutProps {
  children: ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation()
  const { user } = useAuthStore()

  // Initialize socket connection for authenticated users
  useEffect(() => {
    if (user) {
      socketService.connect()
    } else {
      socketService.disconnect()
    }

    return () => {
      // Don't disconnect on unmount as other components might need the connection
    }
  }, [user])

  const navigation = [
    {
      name: 'Home',
      href: '/',
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
    },
    {
      name: 'Explore',
      href: '/explore',
      icon: MagnifyingGlassIcon,
      iconSolid: MagnifyingGlassIconSolid,
    },
    {
      name: 'Reels',
      href: '/reels',
      icon: PlayIcon,
      iconSolid: PlayIconSolid,
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: ChatBubbleLeftRightIcon,
      iconSolid: ChatBubbleLeftRightIconSolid,
    },
    {
      name: 'Profile',
      href: `/profile/${user?.username || ''}`,
      icon: UserIcon,
      iconSolid: UserIconSolid,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      iconSolid: Cog6ToothIconSolid,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:overflow-y-auto lg:bg-dark-surface lg:pb-4">
        <div className="flex h-16 shrink-0 items-center px-6">
          <h1 className="text-2xl font-bold text-gradient">SocialVibe</h1>
        </div>
        <nav className="mt-8">
          <ul className="flex flex-col gap-y-2 px-4">
            {navigation.map((item) => {
              const active = isActive(item.href)
              const Icon = active ? item.iconSolid : item.icon
              
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                  >
                    <Icon className="h-6 w-6 mr-3" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-dark-border bg-dark-surface px-4 shadow-sm lg:hidden">
          <h1 className="text-xl font-bold text-gradient">SocialVibe</h1>
        </div>

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="mobile-bottom-nav lg:hidden bg-dark-surface border-t border-dark-border">
        <div className="flex justify-around py-2">
          {navigation.slice(0, 5).map((item) => {
            const active = isActive(item.href)
            const Icon = active ? item.iconSolid : item.icon
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center p-2 ${
                  active ? 'text-primary-500' : 'text-gray-400'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Real-time notifications for authenticated users */}
      {user && <NotificationsManager />}
    </div>
  )
}

export default MainLayout