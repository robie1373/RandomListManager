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

    test.skip('should switch tabs and update context', async ({ page }) => {
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

    test.skip('should roll dice and display plain text result', async ({ page }) => {
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
});