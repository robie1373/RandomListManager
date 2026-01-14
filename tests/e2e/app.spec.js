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

    test('should delete item from table', async ({ page }) => {
        const input = page.locator('#simpleInput');
        const addButton = page.locator('.btn-add');
        
        // Add two items
        await input.fill('Item 1');
        await addButton.click();
        await input.fill('Item 2');
        await addButton.click();
        
        // Verify both items are in the table
        await expect(page.locator('td:has-text("Item 1")')).toBeVisible();
        await expect(page.locator('td:has-text("Item 2")')).toBeVisible();
        
        // Delete the first item by clicking its delete button
        const deleteButtons = page.locator('.btn-delete');
        await deleteButtons.first().click();
        
        // Item 1 should be removed
        await expect(page.locator('td:has-text("Item 1")')).not.toBeVisible();
        // Item 2 should still be there
        await expect(page.locator('td:has-text("Item 2")')).toBeVisible();
    });

    test('should update header and navbar background color when switching tabs', async ({ page }) => {
        const itemsTab = page.locator('[data-tab="items"]');
        const weaponsTab = page.locator('[data-tab="weapons"]');
        const navContext = page.locator('#navContext');
        
        // Items tab is active by default, header should be orange
        let headerBg = await navContext.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        console.log('Items header bg:', headerBg);
        
        // Switch to weapons tab
        await weaponsTab.click();
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="weapons"]').classList.contains('active');
        });
        
        // Header should now be violet
        let headerBgWeapons = await navContext.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        console.log('Weapons header bg:', headerBgWeapons);
        
        // Colors should have changed
        expect(headerBg).not.toBe(headerBgWeapons);
    });

    test('should display header text with uppercase styling', async ({ page }) => {
        const navContext = page.locator('#navContext');
        
        // Check that the header has uppercase styling applied (CSS text-transform)
        const computedStyle = await navContext.evaluate((el) => window.getComputedStyle(el).textTransform);
        expect(computedStyle).toBe('uppercase');
        
        // Switch to weapons tab
        const weaponsTab = page.locator('[data-tab="weapons"]');
        await weaponsTab.click();
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="weapons"]').classList.contains('active');
        });
        
        // Still should have uppercase styling
        const computedStyleWeapons = await navContext.evaluate((el) => window.getComputedStyle(el).textTransform);
        expect(computedStyleWeapons).toBe('uppercase');
    });

    test('should copy roll result to clipboard', async ({ page }) => {
        // Add an item with known dice value
        await page.fill('#simpleInput', 'Test Item 2d4');
        await page.click('.btn-add');
        
        // Roll the dice
        await page.click('#rollBtn');
        
        // Copy button should be visible
        const copyBtn = page.locator('#copyBtn');
        await expect(copyBtn).toBeVisible();
        
        // Click copy button
        await copyBtn.click();
        
        // Button should still be enabled and clickable after copying
        await page.waitForTimeout(100);
        await expect(copyBtn).toBeEnabled();
    });

    test('should switch between different tabs and show correct items', async ({ page }) => {
        // Add item to Items tab
        await page.fill('#simpleInput', 'Items Tab Item');
        await page.click('.btn-add');
        
        // Switch to Weapons tab
        await page.click('[data-tab="weapons"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="weapons"]').classList.contains('active');
        });
        
        // Items Tab Item should not be visible
        await expect(page.locator('td:has-text("Items Tab Item")')).not.toBeVisible();
        
        // Add item to Weapons tab
        await page.fill('#simpleInput', 'Weapons Tab Item');
        await page.click('.btn-add');
        
        // Weapons Tab Item should be visible
        await expect(page.locator('td:has-text("Weapons Tab Item")')).toBeVisible();
        
        // Switch back to Items tab
        await page.click('[data-tab="items"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="items"]').classList.contains('active');
        });
        
        // Items Tab Item should be visible again
        await expect(page.locator('td:has-text("Items Tab Item")')).toBeVisible();
        // Weapons Tab Item should not be visible
        await expect(page.locator('td:has-text("Weapons Tab Item")')).not.toBeVisible();
    });

    test('should maintain separate data for each tab', async ({ page }) => {
        // Add item to Items tab
        await page.fill('#simpleInput', 'Item A');
        await page.click('.btn-add');
        
        // Switch to Weapons tab and add item
        await page.click('[data-tab="weapons"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="weapons"]').classList.contains('active');
        });
        await page.fill('#simpleInput', 'Weapon A');
        await page.click('.btn-add');
        
        // Switch to Encounters tab and add item
        await page.click('[data-tab="encounters"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="encounters"]').classList.contains('active');
        });
        await page.fill('#simpleInput', 'Encounter A');
        await page.click('.btn-add');
        
        // Verify Encounters has only Encounter A
        await expect(page.locator('td:has-text("Encounter A")')).toBeVisible();
        
        // Switch back to Items
        await page.click('[data-tab="items"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="items"]').classList.contains('active');
        });
        // Verify Items has only Item A
        await expect(page.locator('td:has-text("Item A")')).toBeVisible();
        await expect(page.locator('td:has-text("Weapon A")')).not.toBeVisible();
        await expect(page.locator('td:has-text("Encounter A")')).not.toBeVisible();
    });

    test('should display table header matching current tab name', async ({ page }) => {
        const tableNameHeader = page.locator('th#tableNameHeader');
        
        // Items tab is default, header should be "Item"
        await expect(tableNameHeader).toHaveText('Item');
        
        // Switch to Weapons tab
        const weaponsTab = page.locator('[data-tab="weapons"]');
        await weaponsTab.click();
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="weapons"]').classList.contains('active');
        });
        
        // Header should now be "Weapon"
        await expect(tableNameHeader).toHaveText('Weapon');
        
        // Switch to Encounters tab
        const encountersTab = page.locator('[data-tab="encounters"]');
        await encountersTab.click();
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="encounters"]').classList.contains('active');
        });
        
        // Header should now be "Encounter"
        await expect(tableNameHeader).toHaveText('Encounter');
    });

    test('should display example row when table is empty', async ({ page }) => {
        // Table should be empty initially, showing example row
        const exampleRow = page.locator('.example-row');
        await expect(exampleRow).toBeVisible();
        
        // Example row should contain "Example Item" (for Items tab)
        await expect(page.locator('.example-row td:first-child')).toContainText('Example Item');
        
        // Should have example tag
        await expect(page.locator('.example-row td:nth-child(2)')).toContainText('example-tag');
        
        // Should have reference column
        await expect(page.locator('.example-row td:nth-child(3)')).toContainText('Reference');
        
        // Should have weight
        await expect(page.locator('.example-row td:nth-child(4)')).toContainText('50');
    });

    test('should hide example row when item is added', async ({ page }) => {
        const exampleRow = page.locator('.example-row');
        
        // Example row should be visible initially
        await expect(exampleRow).toBeVisible();
        
        // Add an item
        const input = page.locator('#simpleInput');
        await input.fill('First Item');
        await page.click('.btn-add');
        
        // Example row should no longer be visible
        await expect(exampleRow).not.toBeVisible();
        
        // Real item should be visible
        await expect(page.locator('td:has-text("First Item")')).toBeVisible();
    });

    test('should show different example rows for each tab', async ({ page }) => {
        // Items tab should show "Example Item"
        const exampleRow = page.locator('.example-row td:first-child');
        await expect(exampleRow).toContainText('Example Item');
        
        // Switch to Weapons tab
        const weaponsTab = page.locator('[data-tab="weapons"]');
        await weaponsTab.click();
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="weapons"]').classList.contains('active');
        });
        
        // Should show "Example Weapon"
        await expect(exampleRow).toContainText('Example Weapon');
        
        // Switch to Encounters tab
        const encountersTab = page.locator('[data-tab="encounters"]');
        await encountersTab.click();
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="encounters"]').classList.contains('active');
        });
        
        // Should show "Example Encounter"
        await expect(exampleRow).toContainText('Example Encounter');
    });

    test('should have reference column in table', async ({ page }) => {
        // Add an item with a reference
        const input = page.locator('#simpleInput');
        await input.fill('Referenced Item');
        await page.click('.btn-add');
        
        // Item should be visible
        const itemRow = page.locator('tr:has-text("Referenced Item")');
        await expect(itemRow).toBeVisible();
        
        // Should have empty reference cell (reference not set during add)
        const cells = itemRow.locator('td');
        const cellCount = await cells.count();
        expect(cellCount).toBe(5); // name, tags, reference, weight, action
    });

    test('should display reference column between tags and weight', async ({ page }) => {
        // Get table headers
        const headers = page.locator('thead th');
        const headerTexts = await headers.allTextContents();
        
        // Verify column order
        expect(headerTexts).toContain('Item'); // or tab name
        expect(headerTexts).toContain('Tags');
        expect(headerTexts).toContain('Reference');
        expect(headerTexts).toContain('Weight');
        expect(headerTexts).toContain('Action');
        
        // Verify order by checking positions
        expect(headerTexts[1]).toBe('Tags');
        expect(headerTexts[2]).toBe('Reference');
        expect(headerTexts[3]).toBe('Weight');
    });
});
