const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Services Section Tests', () => {
  let electronApp;
  let window;

  test.beforeAll(async ({ playwright }) => {
    // Launch Electron app
    electronApp = await playwright._electron.launch({
      args: [path.join(__dirname, '..', 'main.js')]
    });
    
    // Get the first window
    window = await electronApp.firstWindow();
    
    // Set reasonable window size
    await window.setViewportSize({ width: 1200, height: 800 });
    
    // Wait for the app to load
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should display Services section with container management', async () => {
    console.log('🔍 Testing Services Section...');
    
    // Wait for React to fully load
    await window.waitForSelector('[data-testid="app"]', { timeout: 10000 });
    
    // Check if sidebar is visible and navigate to Services
    const sidebar = await window.locator('[data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible();
    
    // The services navigation should already be active by default (renamed from logs)
    const servicesNav = await window.locator('[data-testid="nav-logs"]').first();
    await expect(servicesNav).toBeVisible();
    await servicesNav.click();
    
    // Wait for services section to load
    await window.waitForTimeout(1000);
    
    // Check for Services Management header
    const servicesHeader = await window.locator('text=Services Management').first();
    await expect(servicesHeader).toBeVisible();
    console.log('✅ Services Management header found');
    
    // Check for Docker Services section
    const dockerServicesHeader = await window.locator('text=Docker Services').first();
    await expect(dockerServicesHeader).toBeVisible();
    console.log('✅ Docker Services section found');
    
    // Check for System Services section
    const systemServicesHeader = await window.locator('text=System Services').first();
    await expect(systemServicesHeader).toBeVisible();
    console.log('✅ System Services section found');
    
    // Check for service cards (should have backend, postgres, wuzapi)
    const serviceCards = await window.locator('.bg-gray-800.rounded-lg.border-gray-700');
    const cardCount = await serviceCards.count();
    console.log(`📦 Found ${cardCount} service cards`);
    expect(cardCount).toBeGreaterThanOrEqual(3); // At least 3 Docker services + system services
    
    // Check for Start All and Stop All buttons
    const startAllBtn = await window.locator('text=Start All').first();
    await expect(startAllBtn).toBeVisible();
    console.log('✅ Start All button found');
    
    const stopAllBtn = await window.locator('text=Stop All').first();
    await expect(stopAllBtn).toBeVisible();
    console.log('✅ Stop All button found');
    
    // Check for specific service names
    const backendService = await window.locator('text=Backend API').first();
    await expect(backendService).toBeVisible();
    console.log('✅ Backend API service found');
    
    const postgresService = await window.locator('text=PostgreSQL DB').first();
    await expect(postgresService).toBeVisible();
    console.log('✅ PostgreSQL DB service found');
    
    const wuzapiService = await window.locator('text=WhatsApp API').first();
    await expect(wuzapiService).toBeVisible();
    console.log('✅ WhatsApp API service found');
    
    // Check for log display area
    const logArea = await window.locator('text=Service Logs').first();
    await expect(logArea).toBeVisible();
    console.log('✅ Service Logs area found');
    
    // Check for the default log message
    const selectServiceMessage = await window.locator('text=Select a service to view its logs').first();
    await expect(selectServiceMessage).toBeVisible();
    console.log('✅ Default log message found');
    
    // Test clicking on a View Logs button (if any service is running)
    const viewLogsButtons = await window.locator('text=View Logs');
    const viewLogsCount = await viewLogsButtons.count();
    console.log(`🔍 Found ${viewLogsCount} View Logs buttons`);
    
    if (viewLogsCount > 0) {
      // Click the first View Logs button
      await viewLogsButtons.first().click();
      await window.waitForTimeout(2000);
      
      // Check if log header changes
      const logHeaders = await window.locator('h3:has-text("Logs")');
      const logHeaderCount = await logHeaders.count();
      if (logHeaderCount > 0) {
        console.log('✅ Log streaming interface activated');
      }
    }
    
    // Test environment indicator
    const envIndicator = await window.locator('text=(development)').first();
    await expect(envIndicator).toBeVisible();
    console.log('✅ Environment indicator found');
    
    console.log('🎉 Services Section test completed successfully!');
  });

  test('should test log processing utilities', async () => {
    console.log('🔍 Testing log processing utilities...');
    
    // Since we can't directly test JavaScript utilities in Playwright,
    // we'll test them indirectly by checking if logs display properly
    
    // Navigate to services section
    await window.waitForSelector('[data-testid="app"]', { timeout: 10000 });
    const servicesNav = await window.locator('[data-testid="nav-logs"]').first();
    await servicesNav.click();
    await window.waitForTimeout(1000);
    
    // Check that log display area exists and is properly formatted
    const logDisplayArea = await window.locator('.bg-black.font-mono').first();
    await expect(logDisplayArea).toBeVisible();
    console.log('✅ Log display area with monospace font found');
    
    // Check for log level styling classes (should be in the DOM)
    const pageContent = await window.content();
    const hasLogStyling = pageContent.includes('text-gray-500') || 
                         pageContent.includes('text-blue-600') || 
                         pageContent.includes('text-green-500');
    expect(hasLogStyling).toBeTruthy();
    console.log('✅ Log level styling classes found in DOM');
    
    console.log('🎉 Log processing utilities test completed!');
  });

  test('should test service status display', async () => {
    console.log('🔍 Testing service status display...');
    
    // Navigate to services section
    await window.waitForSelector('[data-testid="app"]', { timeout: 10000 });
    const servicesNav = await window.locator('[data-testid="nav-logs"]').first();
    await servicesNav.click();
    await window.waitForTimeout(1000);
    
    // Look for status dots (colored circles indicating service status)
    const statusDots = await window.locator('.w-2.h-2.rounded-full');
    const statusDotCount = await statusDots.count();
    console.log(`🔴 Found ${statusDotCount} status indicator dots`);
    expect(statusDotCount).toBeGreaterThanOrEqual(3); // At least 3 for Docker services
    
    // Look for status text (running, stopped, etc.)
    const pageContent = await window.content();
    const hasStatusText = pageContent.includes('running') || 
                         pageContent.includes('stopped') || 
                         pageContent.includes('unknown');
    console.log(`📊 Service status text present: ${hasStatusText}`);
    
    // Check for refresh button
    const refreshBtn = await window.locator('button[title="Refresh status"]').first();
    await expect(refreshBtn).toBeVisible();
    console.log('✅ Refresh status button found');
    
    console.log('🎉 Service status display test completed!');
  });

  test('should capture final screenshot', async () => {
    console.log('📸 Capturing Services Section screenshot...');
    
    // Navigate to services section
    await window.waitForSelector('[data-testid="app"]', { timeout: 10000 });
    const servicesNav = await window.locator('[data-testid="nav-logs"]').first();
    await servicesNav.click();
    await window.waitForTimeout(2000);
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, '..', 'releasor_services_section_test.png');
    await window.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    
    // Verify the screenshot file exists
    const fs = require('fs');
    expect(fs.existsSync(screenshotPath)).toBeTruthy();
    console.log('✅ Screenshot file verified');
  });
}); 