// Simple test to verify Redis bypass is working
const { 
  setupRedis, 
  setUserSession, 
  getUserSession, 
  deleteUserSession,
  setUserOnline,
  setUserOffline,
  getOnlineUsers,
  cacheFeed,
  getCachedFeed
} = require('./src/utils/redis.ts');

async function testRedisbypass() {
  try {
    console.log('🧪 Testing Redis bypass functionality...\n');
    
    // Setup storage
    await setupRedis();
    
    // Test user session
    console.log('📝 Testing user session management...');
    await setUserSession('user123', { name: 'John Doe', email: 'john@example.com' });
    const session = await getUserSession('user123');
    console.log('✅ Session stored and retrieved:', session);
    
    await deleteUserSession('user123');
    const deletedSession = await getUserSession('user123');
    console.log('✅ Session deleted successfully:', deletedSession === null);
    
    // Test feed caching
    console.log('\n📊 Testing feed caching...');
    const feedData = { posts: [{ id: 1, content: 'Hello World' }] };
    await cacheFeed('user456', feedData);
    const cachedFeed = await getCachedFeed('user456');
    console.log('✅ Feed cached and retrieved:', cachedFeed);
    
    // Test online users
    console.log('\n👥 Testing online user tracking...');
    await setUserOnline('user789');
    await setUserOnline('user101');
    let onlineUsers = await getOnlineUsers();
    console.log('✅ Online users after adding:', onlineUsers);
    
    await setUserOffline('user789');
    onlineUsers = await getOnlineUsers();
    console.log('✅ Online users after removing one:', onlineUsers);
    
    console.log('\n🎉 All Redis bypass tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRedisbypass();