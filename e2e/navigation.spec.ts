import { _electron as electron, test, expect, Page, ElectronApplication } from '@playwright/test';

test.describe('Costerra ERP UI Navigation', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    // Launch Electron app using the compiled output
    app = await electron.launch({
      args: ['.'],
    });
    page = await app.firstWindow();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('should load the dashboard successfully', async () => {
    // Wait for React to render
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Costerra', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should navigate to products page', async () => {
    await page.getByRole('link', { name: 'Products' }).click();
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
  });

  test('should toggle theme', async () => {
    // Determine initial state
    const htmlLocator = page.locator('html');
    // We don't await toHaveClass initially because we don't know the persisted state in Playwright across runs
    const initialClass = await htmlLocator.getAttribute('class') || '';
    const isInitiallyDark = initialClass.includes('dark');
    
    // Find the theme toggle button and click it
    const themeButton = page.locator('header button[aria-label^="Switch to"]');
    await themeButton.click();
    
    // After click, the state should be inverted
    if (isInitiallyDark) {
      await expect(htmlLocator).not.toHaveClass(/dark/);
    } else {
      await expect(htmlLocator).toHaveClass(/dark/);
    }
  });
});



