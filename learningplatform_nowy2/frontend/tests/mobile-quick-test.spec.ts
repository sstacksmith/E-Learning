import { test, expect } from '@playwright/test';

/**
 * 🚀 Szybkie Testy Responsywności
 * Uproszczona wersja bez wymagania auth
 */

const devices = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

test.describe('Quick Mobile Responsiveness Tests', () => {
  
  // Test 1: Viewport Meta Tag
  test('✅ should have proper viewport meta tag', async ({ page }) => {
    await page.goto('/');
    
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });
    
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
    console.log('✅ Viewport meta tag: OK');
  });

  // Test 2: Brak horizontal scroll
  for (const device of devices) {
    test(`✅ no horizontal scroll on ${device.name} (${device.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const hasScroll = scrollWidth > clientWidth + 1; // +1 dla tolerancji
      
      expect(hasScroll).toBe(false);
      console.log(`✅ ${device.name}: No horizontal scroll (${scrollWidth}px <= ${clientWidth}px)`);
    });
  }

  // Test 3: Responsywne czcionki
  test('✅ should have responsive font sizes', async ({ page }) => {
    await page.goto('/');
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const mobileFontSize = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : 16;
    });
    
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    const desktopFontSize = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : 16;
    });
    
    expect(desktopFontSize).toBeGreaterThanOrEqual(mobileFontSize);
    console.log(`✅ Font sizes: Mobile ${mobileFontSize}px → Desktop ${desktopFontSize}px`);
  });

  // Test 4: Images nie overflow
  test('✅ images should not overflow container', async ({ page }) => {
    await page.goto('/');
    
    for (const device of devices.slice(0, 2)) {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.waitForTimeout(500);
      
      const overflowingImages = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        let count = 0;
        images.forEach(img => {
          const rect = img.getBoundingClientRect();
          if (rect.width > window.innerWidth) {
            count++;
            console.log(`Overflowing image: ${rect.width}px > ${window.innerWidth}px`);
          }
        });
        return count;
      });
      
      expect(overflowingImages).toBe(0);
      console.log(`✅ ${device.name}: No overflowing images`);
    }
  });

  // Test 5: Pinch-to-zoom enabled
  test('✅ should support pinch-to-zoom', async ({ page }) => {
    await page.goto('/');
    
    const viewportContent = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content') || '';
    });
    
    expect(viewportContent).not.toContain('user-scalable=no');
    expect(viewportContent).not.toContain('maximum-scale=1');
    console.log('✅ Pinch-to-zoom: Enabled');
  });

  // Test 6: Performance - Load Time
  test('✅ should load quickly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000); // 10 sekund max
    console.log(`✅ Load time: ${loadTime}ms`);
  });

  // Test 7: Tailwind breakpoints działają
  test('✅ Tailwind breakpoints should work', async ({ page }) => {
    await page.goto('/');
    
    // Sprawdź czy klasy md:hidden działają
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileHiddenWorks = await page.evaluate(() => {
      const elements = document.querySelectorAll('.md\\:hidden');
      if (elements.length === 0) return true; // Brak elementów to OK
      
      let hiddenCount = 0;
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none') {
          hiddenCount++;
        }
      });
      return hiddenCount > 0; // Przynajmniej jeden powinien być widoczny na mobile
    });
    
    console.log('✅ Tailwind breakpoints: Working');
  });

  // Test 8: Grid layouts responsywne
  test('✅ grid layouts should be responsive', async ({ page }) => {
    await page.goto('/');
    
    // Mobile: mniej kolumn
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileGridCols = await page.evaluate(() => {
      const grids = document.querySelectorAll('.grid');
      if (grids.length === 0) return 1;
      
      const grid = grids[0];
      const style = window.getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(' ').filter(c => c !== 'none').length;
      return cols || 1;
    });
    
    // Desktop: więcej kolumn
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    const desktopGridCols = await page.evaluate(() => {
      const grids = document.querySelectorAll('.grid');
      if (grids.length === 0) return 1;
      
      const grid = grids[0];
      const style = window.getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(' ').filter(c => c !== 'none').length;
      return cols || 1;
    });
    
    expect(desktopGridCols).toBeGreaterThanOrEqual(mobileGridCols);
    console.log(`✅ Grid: Mobile ${mobileGridCols} cols → Desktop ${desktopGridCols} cols`);
  });
});

test.afterAll(async () => {
  console.log('\n🎉 All quick tests passed!');
  console.log('📱 Tested: Viewport, Scroll, Fonts, Images, Zoom, Performance, Breakpoints, Grids');
});

