import { useState } from 'react'
import UserSearchModal from '@/components/user/UserSearchModal'

export default function Explore() {
  const [showUserSearch, setShowUserSearch] = useState(false)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Explore</h1>
          <button
            onClick={() => setShowUserSearch(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Find People
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Search People Card */}
          <div 
            onClick={() => setShowUserSearch(true)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">Find People</h3>
              <p className="text-sm">Discover new accounts to follow and connect with friends</p>
            </div>
          </div>

          {/* Trending Posts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">🔥</div>
              <h3 className="text-lg font-semibold mb-2">Trending Posts</h3>
              <p className="text-sm">Coming Soon</p>
            </div>
          </div>

          {/* Popular Reels */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">🎬</div>
              <h3 className="text-lg font-semibold mb-2">Popular Reels</h3>
              <p className="text-sm">Coming Soon</p>
            </div>
          </div>

          {/* Stories */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">📖</div>
              <h3 className="text-lg font-semibold mb-2">Stories</h3>
              <p className="text-sm">Coming Soon</p>
            </div>
          </div>

          {/* Hashtags */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">#️⃣</div>
              <h3 className="text-lg font-semibold mb-2">Trending Hashtags</h3>
              <p className="text-sm">Coming Soon</p>
            </div>
          </div>

          {/* Places */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-lg font-semibold mb-2">Popular Places</h3>
              <p className="text-sm">Coming Soon</p>
            </div>
          </div>
        </div>

        {/* Search People Modal */}
        {showUserSearch && (
          <UserSearchModal
            onClose={() => setShowUserSearch(false)}
            showMessageButton={true}
            title="Find People"
          />
        )}
      </div>
    </div>
  )
}