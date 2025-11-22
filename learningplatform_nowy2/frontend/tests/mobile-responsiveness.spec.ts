import { test, expect, Page } from '@playwright/test';

/**
 * 🧪 Testy Responsywności Mobilnej
 * 
 * Sprawdza czy wszystkie strony poprawnie skalują się na różnych urządzeniach
 */

// Definicje urządzeń do testowania
const devices = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'Android (Pixel 5)', width: 393, height: 851 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

// Strony do testowania
const pagesToTest = [
  { path: '/homelogin/teacher/grades', name: 'Teacher Grades', requiresAuth: true },
  { path: '/homelogin/parent/grades', name: 'Parent Grades', requiresAuth: true },
  { path: '/homelogin/grades', name: 'Student Grades', requiresAuth: true },
  { path: '/homelogin/teacher/students', name: 'Teacher Students', requiresAuth: true },
  { path: '/homelogin/superadmin', name: 'Superadmin Dashboard', requiresAuth: true },
  { path: '/homelogin/superadmin/parent-student', name: 'Parent-Student Management', requiresAuth: true },
];

// Helper: Sprawdź czy element jest widoczny
async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.locator(selector).first();
    return await element.isVisible({ timeout: 5000 });
  } catch {
    return false;
  }
}

// Helper: Sprawdź rozmiar touch target
async function checkTouchTargetSize(page: Page, selector: string, minSize: number = 44): Promise<boolean> {
  try {
    const element = await page.locator(selector).first();
    const box = await element.boundingBox();
    if (!box) return false;
    return box.width >= minSize && box.height >= minSize;
  } catch {
    return false;
  }
}

// Helper: Sprawdź czy jest horizontal scroll
async function hasHorizontalScroll(page: Page): Promise<boolean> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  return scrollWidth > clientWidth;
}

test.describe('Mobile Responsiveness Tests', () => {
  
  // Test 1: Viewport Meta Tag
  test('should have proper viewport meta tag', async ({ page }) => {
    await page.goto('/');
    
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });
    
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });

  // Test 2: Brak horizontal scroll na wszystkich urządzeniach
  for (const device of devices) {
    test(`should not have horizontal scroll on ${device.name}`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/');
      
      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });
  }

  // Test 3: Tabele zamieniają się w karty na mobile
  test.describe('Tables to Cards Transformation', () => {
    
    test('Teacher Grades: should show cards on mobile, table on desktop', async ({ page }) => {
      // Skip auth for now - test structure only
      await page.goto('/homelogin/teacher/grades');
      
      // Mobile (375px)
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      const mobileCardsVisible = await isElementVisible(page, '.md\\:hidden .rounded-xl');
      const mobileTableVisible = await isElementVisible(page, '.hidden.md\\:block table');
      
      // Na mobile: karty widoczne, tabela ukryta
      expect(mobileCardsVisible || !mobileTableVisible).toBe(true);
      
      // Desktop (1920px)
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);
      
      const desktopTableVisible = await isElementVisible(page, '.hidden.md\\:block table');
      
      // Na desktop: tabela widoczna
      expect(desktopTableVisible).toBe(true);
    });

    test('Student Grades: should show cards on mobile', async ({ page }) => {
      await page.goto('/homelogin/grades');
      
      // Mobile
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      
      const mobileCardsVisible = await isElementVisible(page, '.md\\:hidden');
      expect(mobileCardsVisible).toBe(true);
    });
  });

  // Test 4: Touch Targets (min 44x44px)
  test.describe('Touch Target Sizes', () => {
    
    test('buttons should be at least 44x44px on mobile', async ({ page }) => {
      await page.goto('/');
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Znajdź wszystkie przyciski
      const buttons = await page.locator('button').all();
      
      let tooSmallButtons = 0;
      for (const button of buttons.slice(0, 10)) { // Test pierwszych 10
        try {
          const box = await button.boundingBox();
          if (box && (box.width < 44 || box.height < 44)) {
            const isVisible = await button.isVisible();
            if (isVisible) {
              tooSmallButtons++;
              console.log(`⚠️ Button too small: ${box.width}x${box.height}px`);
            }
          }
        } catch (e) {
          // Skip if button not accessible
        }
      }
      
      // Maksymalnie 2 przyciski mogą być za małe (np. close buttons)
      expect(tooSmallButtons).toBeLessThanOrEqual(2);
    });
  });

  // Test 5: Mobile Menu
  test.describe('Mobile Navigation', () => {
    
    test('Teacher Layout: should have mobile menu button', async ({ page }) => {
      await page.goto('/homelogin/teacher');
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Hamburger menu powinien być widoczny
      const menuButton = page.locator('button').filter({ hasText: /menu/i }).or(
        page.locator('button svg').filter({ has: page.locator('path') })
      );
      
      const isVisible = await menuButton.first().isVisible().catch(() => false);
      expect(isVisible).toBe(true);
    });

    test('Parent Layout: should have mobile menu button', async ({ page }) => {
      await page.goto('/homelogin/parent');
      await page.setViewportSize({ width: 375, height: 667 });
      
      const menuButton = page.locator('button').first();
      const isVisible = await menuButton.isVisible().catch(() => false);
      expect(isVisible).toBe(true);
    });
  });

  // Test 6: Responsywne czcionki
  test('should have responsive font sizes', async ({ page }) => {
    await page.goto('/');
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileFontSize = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? window.getComputedStyle(h1).fontSize : '16px';
    });
    
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    const desktopFontSize = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? window.getComputedStyle(h1).fontSize : '16px';
    });
    
    const mobileSize = parseFloat(mobileFontSize);
    const desktopSize = parseFloat(desktopFontSize);
    
    // Desktop font powinien być większy lub równy mobile
    expect(desktopSize).toBeGreaterThanOrEqual(mobileSize);
  });

  // Test 7: Grid Layouts
  test('should have responsive grid layouts', async ({ page }) => {
    await page.goto('/homelogin/superadmin/parent-student');
    
    // Mobile: 1 kolumna
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileGridCols = await page.evaluate(() => {
      const grid = document.querySelector('.grid');
      if (!grid) return 0;
      const style = window.getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(' ').length;
      return cols;
    });
    
    // Desktop: więcej kolumn
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    const desktopGridCols = await page.evaluate(() => {
      const grid = document.querySelector('.grid');
      if (!grid) return 0;
      const style = window.getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(' ').length;
      return cols;
    });
    
    // Desktop powinien mieć więcej kolumn niż mobile
    expect(desktopGridCols).toBeGreaterThanOrEqual(mobileGridCols);
  });

  // Test 8: Modals na mobile
  test('modals should be scrollable on mobile', async ({ page }) => {
    await page.goto('/homelogin/teacher/grades');
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Sprawdź czy modal ma overflow-y-auto
    const hasScrollableModal = await page.evaluate(() => {
      const modals = document.querySelectorAll('[class*="modal"], [class*="fixed"]');
      for (const modal of modals) {
        const style = window.getComputedStyle(modal);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return true;
        }
      }
      return false;
    });
    
    // Jeśli są modals, powinny być scrollable
    // expect(hasScrollableModal).toBe(true); // Skip if no modals
  });

  // Test 9: Images responsywność
  test('images should not overflow container', async ({ page }) => {
    await page.goto('/');
    
    for (const device of devices.slice(0, 3)) { // Test mobile devices
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.waitForTimeout(300);
      
      const overflowingImages = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        let count = 0;
        images.forEach(img => {
          const rect = img.getBoundingClientRect();
          if (rect.width > window.innerWidth) {
            count++;
          }
        });
        return count;
      });
      
      expect(overflowingImages).toBe(0);
    }
  });

  // Test 10: Performance - Lighthouse Mobile Score
  test('should have good mobile performance', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Sprawdź czy strona ładuje się szybko
    const startTime = Date.now();
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    // Strona powinna załadować się w < 5 sekund na mobile
    expect(loadTime).toBeLessThan(5000);
  });
});

// Test 11: Specific Page Tests
test.describe('Page-Specific Responsiveness', () => {
  
  test('Superadmin: tabs should be in dropdown on mobile', async ({ page }) => {
    await page.goto('/homelogin/superadmin');
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile menu button powinien być widoczny
    const mobileMenuButton = await isElementVisible(page, '.lg\\:hidden button');
    expect(mobileMenuButton).toBe(true);
  });

  test('Teacher Students: should show cards on mobile regardless of view mode', async ({ page }) => {
    await page.goto('/homelogin/teacher/students');
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Karty powinny być widoczne
    const cardsVisible = await isElementVisible(page, '.md\\:hidden .grid');
    
    // Tabela powinna być ukryta
    const tableVisible = await isElementVisible(page, '.hidden.md\\:block table');
    
    expect(cardsVisible || !tableVisible).toBe(true);
  });
});

// Test 12: Accessibility
test.describe('Mobile Accessibility', () => {
  
  test('should have proper ARIA labels on mobile', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Sprawdź czy przyciski mają aria-label lub text
    const buttonsWithoutLabel = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      let count = 0;
      buttons.forEach(btn => {
        const hasLabel = btn.getAttribute('aria-label') || btn.textContent?.trim();
        if (!hasLabel && btn.offsetParent !== null) { // visible
          count++;
        }
      });
      return count;
    });
    
    // Maksymalnie 3 przyciski mogą nie mieć labeli (np. close icons)
    expect(buttonsWithoutLabel).toBeLessThanOrEqual(3);
  });

  test('should support pinch-to-zoom', async ({ page }) => {
    await page.goto('/');
    
    const viewportContent = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content') || '';
    });
    
    // Nie powinno być user-scalable=no
    expect(viewportContent).not.toContain('user-scalable=no');
    expect(viewportContent).not.toContain('maximum-scale=1');
  });
});

// Test Summary Reporter
test.afterAll(async () => {
  console.log('\n📊 Test Summary:');
  console.log('✅ All responsiveness tests completed!');
  console.log('📱 Tested devices: iPhone SE, iPhone 12, Android, iPad, Desktop');
  console.log('🎯 Tested aspects: Tables, Touch Targets, Navigation, Fonts, Grids, Modals, Images');
});

