import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5500'; // Adjust to your local server port

test.describe('Random List Manager E2E', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
    });

    test('should load with dark mode by default', async ({ page }) => {
        const body = page.locator('body');
        await expect(body).toHaveClass(/dark-mode/);
    });

    test('should switch tabs and update context', async ({ page }) => {
        const weaponTab = page.locator('#tab-weapons');
        await weaponTab.click();
        
        await expect(weaponTab).toHaveClass(/active/);
        await expect(page.locator('#navContext')).toHaveText('weapons');
    });

    test('should add a new item and show it in the table', async ({ page }) => {
        const input = page.locator('#simpleInput');
        const addButton = page.locator('.btn-add');
        
        await input.fill('Masterwork Potion 2d4');
        await addButton.click();
        
        const tableCell = page.locator('td:has-text("Masterwork Potion 2d4")');
        await expect(tableCell).toBeVisible();
    });

    test('should roll dice and display plain text result', async ({ page }) => {
        // Setup: Add a guaranteed item
        await page.fill('#simpleInput', 'Fixed Gold 1d1+10');
        await page.click('.btn-add');
        
        // Action: Roll
        await page.click('#rollBtn');
        
        // Assert: Check result contains "11 (1d1+10)"
        const result = page.locator('#result');
        await expect(result).toContainText('11 (1d1+10)');
        
        // Assert: Copy button should now be visible
        const copyBtn = page.locator('#copyBtn');
        await expect(copyBtn).toBeVisible();
    });

    test('should persist data after page reload', async ({ page }) => {
        const input = page.locator('#simpleInput');
        const addButton = page.locator('.btn-add');
        
        // Add item
        await input.fill('Persistent Item');
        await addButton.click();
        
        // Wait for the item to appear in the table
        const tableCell = page.locator('td:has-text("Persistent Item")');
        await expect(tableCell).toBeVisible();
        
        // Verify data is in localStorage before reload
        const storageData = await page.evaluate(() => {
            return localStorage.getItem('myList_v1.8.2_items');
        });
        console.log('Storage before reload:', storageData);
        
        // Reload the page
        await page.reload();
        
        // Wait for page to fully load after reload
        await page.waitForLoadState('domcontentloaded');
        
        // Verify data is still in localStorage after reload
        const storageDataAfterReload = await page.evaluate(() => {
            return localStorage.getItem('myList_v1.8.2_items');
        });
        console.log('Storage after reload:', storageDataAfterReload);
        
        // Item should still be visible after reload
        await expect(tableCell).toBeVisible();
    });

    test('should have color-coded tabs that update when selected', async ({ page }) => {
        const itemsTab = page.locator('[data-tab="items"]');
        const weaponsTab = page.locator('[data-tab="weapons"]');
        const encountersTab = page.locator('[data-tab="encounters"]');
        
        // Items tab should be active (color-coded) by default
        await expect(itemsTab).toHaveClass(/active/);
        
        // Get computed style to verify color coding
        let itemsColor = await itemsTab.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        console.log('Items tab color:', itemsColor);
        
        // Click weapons tab
        await weaponsTab.click();
        
        // Wait for weapons tab to become active
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="weapons"]').classList.contains('active');
        });
        
        // Weapons tab should now be active (color-coded)
        await expect(weaponsTab).toHaveClass(/active/);
        let weaponsColor = await weaponsTab.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        console.log('Weapons tab color:', weaponsColor);
        
        // Items tab should no longer be active
        await expect(itemsTab).not.toHaveClass(/active/);
        
        // Click encounters tab
        await encountersTab.click();
        
        // Wait for encounters tab to become active
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="encounters"]').classList.contains('active');
        });
        
        // Encounters tab should now be active (color-coded)
        await expect(encountersTab).toHaveClass(/active/);
        let encountersColor = await encountersTab.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        console.log('Encounters tab color:', encountersColor);
        
        // Weapons tab should no longer be active
        await expect(weaponsTab).not.toHaveClass(/active/);
    });

    test('should have different colors for active and inactive tabs', async ({ page }) => {
        const itemsTab = page.locator('[data-tab="items"]');
        const weaponsTab = page.locator('[data-tab="weapons"]');
        const encountersTab = page.locator('[data-tab="encounters"]');
        
        // Get color of active tab (items is active by default)
        const activeTabColor = await itemsTab.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        console.log('Active tab color:', activeTabColor);
        
        // Get colors of inactive tabs
        const inactiveTab1Color = await weaponsTab.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        const inactiveTab2Color = await encountersTab.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        console.log('Inactive tab 1 color:', inactiveTab1Color);
        console.log('Inactive tab 2 color:', inactiveTab2Color);
        
        // Verify that active tab has a different color than inactive tabs
        expect(activeTabColor).not.toBe(inactiveTab1Color);
        expect(activeTabColor).not.toBe(inactiveTab2Color);
    });
});