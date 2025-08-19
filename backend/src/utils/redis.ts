// In-memory storage to replace Redis
interface StorageItem {
  value: string;
  expiresAt?: number;
}

interface InMemoryStorage {
  keyValue: Map<string, StorageItem>;
  sets: Map<string, Set<string>>;
}

const storage: InMemoryStorage = {
  keyValue: new Map(),
  sets: new Map()
};

// Cleanup expired items periodically
const cleanupExpiredItems = () => {
  const now = Date.now();
  for (const [key, item] of storage.keyValue.entries()) {
    if (item.expiresAt && item.expiresAt <= now) {
      storage.keyValue.delete(key);
    }
  }
};

// Run cleanup every 60 seconds
setInterval(cleanupExpiredItems, 60000);

export const setupRedis = async (): Promise<void> => {
  try {
    console.log('Using in-memory storage (Redis bypassed)');
    console.log('In-memory storage initialized successfully');
  } catch (error) {
    console.error('In-memory storage initialization error:', error);
    throw error;
  }
};

// Helper functions for common storage operations
export const getRedisClient = () => {
  return {
    connected: true,
    isReady: true
  };
};

// Cache user session
export const setUserSession = async (userId: string, sessionData: any, expireInSeconds: number = 3600): Promise<void> => {
  try {
    const key = `session:${userId}`;
    const expiresAt = Date.now() + (expireInSeconds * 1000);
    storage.keyValue.set(key, {
      value: JSON.stringify(sessionData),
      expiresAt
    });
  } catch (error) {
    console.error('Error setting user session:', error);
  }
};

// Get user session
export const getUserSession = async (userId: string): Promise<any | null> => {
  try {
    const key = `session:${userId}`;
    const item = storage.keyValue.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      storage.keyValue.delete(key);
      return null;
    }
    
    return JSON.parse(item.value);
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
};

// Delete user session
export const deleteUserSession = async (userId: string): Promise<void> => {
  try {
    const key = `session:${userId}`;
    storage.keyValue.delete(key);
  } catch (error) {
    console.error('Error deleting user session:', error);
  }
};

// Cache feed data
export const cacheFeed = async (userId: string, feedData: any, expireInSeconds: number = 300): Promise<void> => {
  try {
    const key = `feed:${userId}`;
    const expiresAt = Date.now() + (expireInSeconds * 1000);
    storage.keyValue.set(key, {
      value: JSON.stringify(feedData),
      expiresAt
    });
  } catch (error) {
    console.error('Error caching feed:', error);
  }
};

// Get cached feed
export const getCachedFeed = async (userId: string): Promise<any | null> => {
  try {
    const key = `feed:${userId}`;
    const item = storage.keyValue.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      storage.keyValue.delete(key);
      return null;
    }
    
    return JSON.parse(item.value);
  } catch (error) {
    console.error('Error getting cached feed:', error);
    return null;
  }
};

// Store online users
export const setUserOnline = async (userId: string): Promise<void> => {
  try {
    // Add user to online users set
    if (!storage.sets.has('online_users')) {
      storage.sets.set('online_users', new Set());
    }
    storage.sets.get('online_users')!.add(userId);
    
    // Set last seen timestamp with expiration
    const key = `user_last_seen:${userId}`;
    const expiresAt = Date.now() + (300 * 1000); // 5 minutes
    storage.keyValue.set(key, {
      value: Date.now().toString(),
      expiresAt
    });
  } catch (error) {
    console.error('Error setting user online:', error);
  }
};

// Remove user from online list
export const setUserOffline = async (userId: string): Promise<void> => {
  try {
    // Remove user from online users set
    if (storage.sets.has('online_users')) {
      storage.sets.get('online_users')!.delete(userId);
    }
    
    // Delete last seen timestamp
    const key = `user_last_seen:${userId}`;
    storage.keyValue.delete(key);
  } catch (error) {
    console.error('Error setting user offline:', error);
  }
};

// Get online users
export const getOnlineUsers = async (): Promise<string[]> => {
  try {
    const onlineUsersSet = storage.sets.get('online_users');
    return onlineUsersSet ? Array.from(onlineUsersSet) : [];
  } catch (error) {
    console.error('Error getting online users:', error);
    return [];
  }
};

// Export a mock client for compatibility
export default {
  connected: true,
  isReady: true
};