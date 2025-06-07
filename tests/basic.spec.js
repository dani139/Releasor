const { _electron: electron } = require('playwright');

// Simple test functions without playwright test framework

// Run tests if this file is executed directly
if (require.main === module) {
  (async () => {
    console.log('🚀 Running Releasor Electron App Tests...\n');
    
    try {
      // Basic launch test
      console.log('1️⃣ Testing app launch...');
      const electronApp = await electron.launch({ args: ['.'] });
      const window = await electronApp.firstWindow();
      
      const title = await window.title();
      console.log(`   ✅ App launched - Title: "${title}"`);
      
      // Check if main content exists
      await window.waitForSelector('body', { timeout: 10000 });
      console.log('   ✅ Main content loaded');
      
      await electronApp.close();
      console.log('   ✅ App closed successfully\n');
      
      console.log('🎉 All tests passed! Releasor is ready for development.');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  })();
} 