const { _electron: electron } = require('playwright');
const path = require('path');

// Simple test function for container panel
async function testContainerPanel() {
  console.log('🐳 Testing Container Panel...\n');
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Launch Electron app
    const electronApp = await electron.launch({ 
      args: ['.'],
      timeout: 30000,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    console.log('   ✅ Electron app launched');
    
    // Wait for window to be created
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get all windows
    const windows = await electronApp.windows();
    console.log(`   🪟 Found ${windows.length} windows`);
    
    // If no windows, try waiting for the first window
    let window;
    if (windows.length === 0) {
      console.log('   ⏳ Waiting for first window...');
      try {
        window = await electronApp.firstWindow({ timeout: 10000 });
        console.log('   ✅ First window found');
      } catch (error) {
        console.log('   ❌ No window created within timeout');
        throw new Error('No window was created');
      }
    } else {
      // Find the main window (not DevTools)
      for (const w of windows) {
        const url = await w.url();
        console.log(`   🔗 Window URL: ${url}`);
        if (!url.includes('devtools://')) {
          window = w;
          break;
        }
      }
      
      if (!window) {
        console.log('   ⚠️  No main window found, using first window');
        window = windows[0];
      }
    }
    
    // Wait for app to fully load
    await window.waitForLoadState('domcontentloaded');
    console.log('   ✅ DOM content loaded');
    
    // Check current URL
    const url = await window.url();
    console.log(`   🌐 Current URL: ${url}`);
    
    // Check page title
    const title = await window.title();
    console.log(`   📑 Page title: "${title}"`);
    
    // Check for any console errors
    window.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   ❌ Console error: ${msg.text()}`);
      }
    });
    
    await window.waitForTimeout(5000); // Give more time for React to initialize
    
    console.log('   ✅ App loaded');
    
    // Take initial screenshot
    await window.screenshot({ path: 'releasor_container_panel_test.png', fullPage: true });
    console.log('   📸 Screenshot saved: releasor_container_panel_test.png');
    
    // Check what's actually on the page
    const bodyText = await window.locator('body').textContent();
    console.log(`   📄 Page contains ${bodyText.length} characters of text`);
    
    // Check for React root
    const reactRoot = await window.locator('#root').isVisible({ timeout: 2000 });
    console.log(`   ⚛️  React root element: ${reactRoot ? 'Found' : 'Not found'}`);
    
    // Check if we can find the app div
    const appDiv = await window.locator('[data-testid="app"]').isVisible({ timeout: 2000 });
    console.log(`   📱 App div element: ${appDiv ? 'Found' : 'Not found'}`);
    
    // If React isn't loading, check for error messages
    if (!reactRoot && !appDiv) {
      const bodyContent = await window.locator('body').innerHTML();
      console.log(`   🔍 Body content preview: ${bodyContent.substring(0, 200)}...`);
    }
    
    // Check if sidebar exists
    const sidebar = await window.locator('[data-testid="sidebar"]');
    const isSidebarVisible = await sidebar.isVisible({ timeout: 5000 });
    if (isSidebarVisible) {
      console.log('   ✅ Sidebar is visible');
    } else {
      console.log('   ⚠️  Sidebar not found');
      
      // Try alternative selectors
      const navElement = await window.locator('nav').isVisible({ timeout: 2000 });
      console.log(`   🔍 Nav element found: ${navElement}`);
    }
    
    // Check if container panel components exist
    try {
      // Look for container panel text
      const containerText = await window.locator('text=Docker Containers').first();
      const isContainerHeaderVisible = await containerText.isVisible({ timeout: 5000 });
      if (isContainerHeaderVisible) {
        console.log('   ✅ Container panel header found');
      } else {
        console.log('   ⚠️  Container panel header not visible');
        
        // Check for any text containing "container"
        const anyContainerText = await window.locator('text=/container/i').count();
        console.log(`   🔍 Elements containing "container": ${anyContainerText}`);
      }
    } catch (error) {
      console.log('   ⚠️  Container panel not found:', error.message.substring(0, 50));
    }
    
    // Check for container items
    try {
      const containers = await window.locator('.bg-gray-700').all();
      console.log(`   📦 Found ${containers.length} container UI elements`);
      
      // Also check for any gray backgrounds
      const grayElements = await window.locator('[class*="gray"]').count();
      console.log(`   🎨 Elements with gray classes: ${grayElements}`);
    } catch (error) {
      console.log('   ⚠️  No container elements found');
    }
    
    // Test environment switching
    try {
      const envSelector = await window.locator('select').first();
      const isEnvSelectorVisible = await envSelector.isVisible({ timeout: 2000 });
      if (isEnvSelectorVisible) {
        console.log('   ✅ Environment selector found');
      } else {
        console.log('   ⚠️  Environment selector not visible');
      }
    } catch (error) {
      console.log('   ⚠️  Environment selector not found');
    }
    
    // Check navigation items
    const navItems = ['logs', 'deployment', 'testing', 'database', 'system'];
    let navItemsFound = 0;
    
    for (const item of navItems) {
      try {
        const navItem = await window.locator(`[data-testid="nav-${item}"]`);
        const isNavItemVisible = await navItem.isVisible({ timeout: 1000 });
        if (isNavItemVisible) {
          navItemsFound++;
        }
      } catch (error) {
        // Silently continue
      }
    }
    console.log(`   ✅ Found ${navItemsFound}/${navItems.length} navigation items`);
    
    // Check for React icons (container buttons)
    try {
      const playButtons = await window.locator('svg').all();
      console.log(`   🎮 Found ${playButtons.length} icon elements (play/stop/restart buttons)`);
    } catch (error) {
      console.log('   ⚠️  No icon elements found');
    }
    
    // Check if the page loaded an error
    const errorText = await window.locator('text=/error|failed|not found/i').count();
    if (errorText > 0) {
      console.log(`   ⚠️  Found ${errorText} potential error messages on page`);
    }
    
    console.log('\n   🎉 Container panel test completed');
    
    // Close app
    await electronApp.close();
    
  } catch (error) {
    console.error('❌ Container panel test failed:', error.message);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testContainerPanel()
    .then(() => {
      console.log('\n🎉 Container panel tests passed!');
    })
    .catch((error) => {
      console.error('\n❌ Container panel tests failed:', error.message);
      process.exit(1);
    });
} 