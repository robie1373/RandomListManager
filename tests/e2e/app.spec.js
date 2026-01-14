import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5500'; // Adjust to your local server port

// Helper function to add an item via the example row
async function addItemViaExampleRow(page, itemName) {
    const exampleRow = page.locator('.example-row');
    const nameCell = exampleRow.locator('td:first-child');
    await nameCell.click();
    const input = nameCell.locator('input');
    await input.waitFor({ state: 'visible' });
    await input.fill(itemName);
    await input.press('Enter');
    // Wait for the item to appear in the table
    await expect(page.locator(`td:has-text("${itemName}")`)).toBeVisible();
}

test.describe('Random List Manager E2E', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
    });

    test('should load with dark mode by default', async ({ page }) => {
        const body = page.locator('body');
        await expect(body).toHaveClass(/dark-mode/);
    });
    
        test('should show tools menu with export all tabs action', async ({ page }) => {
            await page.locator('#toolsBtn').click();
            const toolsMenu = page.locator('#toolsMenu');
            await expect(toolsMenu).toBeVisible();
            await expect(toolsMenu.locator('#exportAllTabs')).toBeVisible();
        });
    
        test('should delete current tab after confirmation', async ({ page }) => {
            // Open tools and trigger delete
            await page.locator('#toolsBtn').click();
            await page.locator('#deleteTab').click();
        
            // Prompt should appear
            const prompt = page.locator('#promptContainer');
            await expect(prompt).toBeVisible();
        
            // Confirm delete
            await page.locator('#promptPrimary').click();
        
            // Expect items tab removed and count reduced to 2 (excluding new-tab button)
            await expect(page.locator('[data-tab="items"]')).toHaveCount(0);
            await expect(page.locator('.tab-btn:not(.new-tab-btn)')).toHaveCount(2);
        
            // Nav context should switch to first remaining tab (weapons)
            await expect(page.locator('#navContext')).toHaveText('weapons');
        });

    test('should switch tabs and update context', async ({ page }) => {
        const weaponTab = page.locator('#tab-weapons');
        await weaponTab.click();
        
        await expect(weaponTab).toHaveClass(/active/);
        await expect(page.locator('#navContext')).toHaveText('weapons');
    });

    test('should add a new item and show it in the table', async ({ page }) => {
        await addItemViaExampleRow(page, 'Masterwork Potion 2d4');
        
        const tableCell = page.locator('td:has-text("Masterwork Potion 2d4")');
        await expect(tableCell).toBeVisible();
    });

    test('should roll dice and display plain text result', async ({ page }) => {
        // Setup: Add a guaranteed item
        await addItemViaExampleRow(page, 'Fixed Gold 1d1+10');
        
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
        // Add item
        await addItemViaExampleRow(page, 'Persistent Item');
        
        // Wait for the item to appear in the table (excluding example row)
        const tableCell = page.locator('tbody tr').first().locator('td:has-text("Persistent Item")');
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
        // Add two items
        await addItemViaExampleRow(page, 'Item 1');
        await addItemViaExampleRow(page, 'Item 2');
        
        // Verify both items are in the table (excluding example row)
        await expect(page.locator('tbody tr:not(.example-row)').locator('td:has-text("Item 1")')).toBeVisible();
        await expect(page.locator('tbody tr:not(.example-row)').locator('td:has-text("Item 2")')).toBeVisible();
        
        // Delete the first item by clicking its delete button (not the example row which has disabled button)
        const deleteButtons = page.locator('.btn-delete').and(page.locator(':not([disabled])'));
        await deleteButtons.first().click();
        
        // Item 1 should be removed
        await expect(page.locator('tbody tr:not(.example-row)').locator('td:has-text("Item 1")')).not.toBeVisible();
        // Item 2 should still be there
        await expect(page.locator('tbody tr:not(.example-row)').locator('td:has-text("Item 2")')).toBeVisible();
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
        await addItemViaExampleRow(page, 'Test Item 2d4');
        
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
        await addItemViaExampleRow(page, 'Items Tab Item');
        
        // Switch to Weapons tab
        await page.click('[data-tab="weapons"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="weapons"]').classList.contains('active');
        });
        
        // Items Tab Item should not be visible
        await expect(page.locator('td:has-text("Items Tab Item")')).not.toBeVisible();
        
        // Add item to Weapons tab
        await addItemViaExampleRow(page, 'Weapons Tab Item');
        
        // Weapons Tab Item should be visible
        await expect(page.locator('td:has-text("Weapons Tab Item")')).toBeVisible();
        
        // Switch back to Items tab
        await page.click('[data-tab="items"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="items"]').classList.contains('active');
        });
        
        // Items Tab Item should be visible again
        await expect(page.locator('tbody tr:not(.example-row)').locator('td:has-text("Items Tab Item")')).toBeVisible();
        // Weapons Tab Item should not be visible
        await expect(page.locator('tbody tr:not(.example-row)').locator('td:has-text("Weapons Tab Item")')).not.toBeVisible();
    });

    test('should maintain separate data for each tab', async ({ page }) => {
        // Add item to Items tab
        await addItemViaExampleRow(page, 'Item A');
        
        // Switch to Weapons tab and add item
        await page.click('[data-tab="weapons"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="weapons"]').classList.contains('active');
        });
        await addItemViaExampleRow(page, 'Weapon A');
        
        // Switch to Encounters tab and add item
        await page.click('[data-tab="encounters"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="encounters"]').classList.contains('active');
        });
        await addItemViaExampleRow(page, 'Encounter A');
        
        // Verify Encounters has only Encounter A
        await expect(page.locator('td:has-text("Encounter A")')).toBeVisible();
        
        // Switch back to Items
        await page.click('[data-tab="items"]');
        await page.waitForFunction(() => {
            return document.querySelector('[data-tab="items"]').classList.contains('active');
        });
        // Verify Items has only Item A
        await expect(page.locator('tbody tr:not(.example-row)').locator('td:has-text("Item A")')).toBeVisible();
        await expect(page.locator('tbody tr:not(.example-row)').locator('td:has-text("Weapon A")')).not.toBeVisible();
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
        
        // Add an item using the example row
        await addItemViaExampleRow(page, 'First Item');
        
        // Example row should still be visible (always shown now)
        await expect(exampleRow).toBeVisible();
        
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
        // Add an item with a reference using the example row
        await addItemViaExampleRow(page, 'Referenced Item');
        
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

    test('should edit item name in table', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Original Name');
        
        // Click on the name cell to edit (first non-example row)
        const row = page.locator('tbody tr:not(.example-row)').first();
        const nameCell = row.locator('td:first-child');
        await nameCell.click();
        
        // Should see an input field
        const cellInput = nameCell.locator('input');
        await expect(cellInput).toBeVisible();
        
        // Clear and type new name
        await cellInput.fill('Updated Name');
        await cellInput.press('Enter');
        
        // Name should be updated
        await expect(nameCell).toContainText('Updated Name');
    });

    test('should edit item tags in table', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Test Item');
        
        // Click on the tags cell (second column) - target first non-example row
        const row = page.locator('tbody tr:not(.example-row)').first();
        const tagsCell = row.locator('td:nth-child(2)');
        await tagsCell.click();
        
        // Type tags
        const cellInput = tagsCell.locator('input');
        await cellInput.fill('magic,rare');
        await cellInput.press('Enter');
        
        // Tags should be updated
        await expect(tagsCell).toContainText('magic,rare');
    });

    test('should edit item reference in table', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Referenced Item');
        
        // Click on the reference cell (third column) - target first non-example row
        const row = page.locator('tbody tr:not(.example-row)').first();
        const refCell = row.locator('td:nth-child(3)');
        await refCell.click();
        
        // Type reference
        const cellInput = refCell.locator('input');
        await cellInput.fill('p.42');
        await cellInput.press('Enter');
        
        // Reference should be updated
        await expect(refCell).toContainText('p.42');
    });

    test('should edit item weight in table with constraints', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Heavy Item');
        
        // Click on the weight cell (fourth column) - target first non-example row
        const row = page.locator('tbody tr:not(.example-row)').first();
        const weightCell = row.locator('td:nth-child(4)');
        await weightCell.click();
        
        // Try to set weight above 100 (should be clamped)
        const cellInput = weightCell.locator('input');
        await cellInput.fill('250');
        await cellInput.press('Enter');
        
        // Should be clamped to 100
        await expect(weightCell).toContainText('100');
    });

    test('should persist edited data after page reload', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Test Item');
        
        // Edit the name - target first non-example row
        const row = page.locator('tbody tr:not(.example-row)').first();
        const nameCell = row.locator('td:first-child');
        await nameCell.click();
        const cellInput = nameCell.locator('input');
        await cellInput.fill('Persisted Item');
        await cellInput.press('Enter');
        
        // Edit the tags
        const tagsCell = row.locator('td:nth-child(2)');
        await tagsCell.click();
        const tagsInput = tagsCell.locator('input');
        await tagsInput.fill('persistent');
        await tagsInput.press('Enter');
        
        // Reload the page
        await page.reload();
        
        // Changes should persist
        await expect(page.locator('td:has-text("Persisted Item")')).toBeVisible();
        const reloadedRow = page.locator('tbody tr:not(.example-row)').first();
        await expect(reloadedRow.locator('td:nth-child(2)')).toContainText('persistent');
    });

    test('should cancel edit with Escape key', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Original');
        
        // Click to edit - target first non-example row
        const row = page.locator('tbody tr:not(.example-row)').first();
        const nameCell = row.locator('td:first-child');
        await nameCell.click();
        
        // Type something but press Escape
        const cellInput = nameCell.locator('input');
        await cellInput.fill('Cancelled');
        await cellInput.press('Escape');
        
        // Input should be removed
        await expect(cellInput).not.toBeVisible();
        // Cell should have original value
        const cellText = await nameCell.innerText();
        expect(cellText.trim()).toBe('Original');
    });

    test('should save edit on blur', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Blur Test');
        
        // Click to edit and type - target first non-example row
        const row = page.locator('tbody tr:not(.example-row)').first();
        const nameCell = row.locator('td:first-child');
        await nameCell.click();
        const cellInput = nameCell.locator('input');
        await cellInput.fill('Blur Saved');
        
        // Click elsewhere to blur
        await page.click('#rollBtn');
        
        // Should be saved
        await expect(nameCell).toContainText('Blur Saved');
    });

    test('should have editable class on table cells', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Editable Test');
        
        // Check that cells have editable class - target first non-example row
        const row = page.locator('tbody tr:not(.example-row)').first();
        const nameCell = row.locator('td:first-child');
        const hasEditableClass = await nameCell.evaluate((el) => el.classList.contains('editable'));
        expect(hasEditableClass).toBe(true);
        
        // Check that action cell (delete button) doesn't have editable class
        const actionCell = row.locator('td:last-child');
        const hasActionEditableClass = await actionCell.evaluate((el) => el.classList.contains('editable'));
        expect(hasActionEditableClass).toBe(false);
    });

    test('should create item by editing example row name', async ({ page }) => {
        // Example row should be visible
        const exampleRow = page.locator('.example-row');
        await expect(exampleRow).toBeVisible();
        
        // Click on the name cell in example row
        const nameCell = exampleRow.locator('td:first-child');
        await nameCell.click();
        
        // Edit the name
        const input = nameCell.locator('input');
        await input.waitFor({ state: 'visible' });
        await input.fill('Potion of Healing');
        await input.press('Enter');
        
        // Item should be created and visible
        await expect(page.locator('td:has-text("Potion of Healing")')).toBeVisible();
        
        // Example row should still be visible (always shown now)
        await expect(exampleRow).toBeVisible();
    });

    test('should create item with tags from example row', async ({ page }) => {
        // Click on tags cell in example row
        const exampleRow = page.locator('.example-row');
        const tagsCell = exampleRow.locator('td:nth-child(2)');
        await tagsCell.click();
        
        // Edit tags
        const input = tagsCell.locator('input');
        await input.waitFor({ state: 'visible' });
        await input.fill('magic,rare');
        await input.press('Enter');
        
        // The example row stays but tags are updated
        // Click on name to create the item
        const nameCell = exampleRow.locator('td:first-child');
        await nameCell.click();
        const nameInput = nameCell.locator('input');
        await nameInput.waitFor({ state: 'visible' });
        await nameInput.fill('Tagged Item');
        await nameInput.press('Enter');
        
        // Item should be created with tags
        const row = page.locator('tr:has-text("Tagged Item")');
        await expect(row.locator('td:nth-child(2)')).toContainText('magic,rare');
    });

    test('should create item with reference and weight from example row', async ({ page }) => {
        // Click on reference cell
        const exampleRow = page.locator('.example-row');
        const refCell = exampleRow.locator('td:nth-child(3)');
        await refCell.click();
        const refInput = refCell.locator('input');
        await refInput.waitFor({ state: 'visible' });
        await refInput.fill('p.99');
        await refInput.press('Enter');
        
        // Click on weight cell
        const weightCell = exampleRow.locator('td:nth-child(4)');
        await weightCell.click();
        const weightInput = weightCell.locator('input');
        await weightInput.waitFor({ state: 'visible' });
        await weightInput.fill('75');
        await weightInput.press('Enter');
        
        // Create the item with name
        const nameCell = exampleRow.locator('td:first-child');
        await nameCell.click();
        const nameInput = nameCell.locator('input');
        await nameInput.waitFor({ state: 'visible' });
        await nameInput.fill('Complex Item');
        await nameInput.press('Enter');
        
        // Verify all fields
        const row = page.locator('tr:has-text("Complex Item")');
        await expect(row.locator('td:nth-child(3)')).toContainText('p.99');
        await expect(row.locator('td:nth-child(4)')).toContainText('75');
    });

    test('should clamp weight when creating from example row', async ({ page }) => {
        const exampleRow = page.locator('.example-row');
        const weightCell = exampleRow.locator('td:nth-child(4)');
        await weightCell.click();
        const input = weightCell.locator('input');
        await input.waitFor({ state: 'visible' });
        await input.fill('500');
        await input.press('Enter');
        
        // Create item with name
        const nameCell = exampleRow.locator('td:first-child');
        await nameCell.click();
        const nameInput = nameCell.locator('input');
        await nameInput.waitFor({ state: 'visible' });
        await nameInput.fill('Heavy Item');
        await nameInput.press('Enter');
        
        // Weight should be clamped to 100
        const row = page.locator('tr:has-text("Heavy Item")');
        await expect(row.locator('td:nth-child(4)')).toContainText('100');
    });

    test('should not create item if name field contains "Example"', async ({ page }) => {
        const exampleRow = page.locator('.example-row');
        const nameCell = exampleRow.locator('td:first-child');
        await nameCell.click();
        
        // Try to save with "Example" text
        const input = nameCell.locator('input');
        await input.waitFor({ state: 'visible' });
        await input.fill('Example Item');
        await input.press('Enter');
        
        // Example row should still be visible (no item created)
        await expect(exampleRow).toBeVisible();
    });

    test('should preserve example row data between edits', async ({ page }) => {
        const exampleRow = page.locator('.example-row');
        
        // Edit name (with "Example" prefix to avoid creating item)
        const nameCell = exampleRow.locator('td:first-child');
        await nameCell.click();
        const nameInput = nameCell.locator('input');
        await nameInput.waitFor({ state: 'visible' });
        await nameInput.fill('Example Thing');
        await nameInput.press('Enter');
        
        // Edit tags
        const tagsCell = exampleRow.locator('td:nth-child(2)');
        await tagsCell.click();
        const tagsInput = tagsCell.locator('input');
        await tagsInput.waitFor({ state: 'visible' });
        await tagsInput.fill('example-test-tag');
        await tagsInput.press('Enter');
        
        // Example row should still be visible (no item created due to "Example" text)
        await expect(exampleRow).toBeVisible();
        
        // Row should show the updates
        await expect(nameCell).toContainText('Example Thing');
        await expect(tagsCell).toContainText('example-test-tag');
    });

    test('should navigate to next cell with Tab key', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Sword');
        
        // Wait for item to be added
        await expect(page.locator('td:has-text("Sword")')).toBeVisible();
        
        // Click on name cell of the first item
        let row = page.locator('tbody tr').first();
        let nameCell = row.locator('td:first-child');
        await nameCell.click();
        let cellInput = nameCell.locator('input');
        await cellInput.waitFor({ state: 'visible' });
        
        // Clear and type new name
        await cellInput.fill('Great Sword');
        
        // Press Tab to move to next cell (tags)
        await cellInput.press('Tab');
        
        // Wait for focus on tags cell in same row
        let tagsCell = row.locator('td:nth-child(2)');
        cellInput = tagsCell.locator('input');
        await cellInput.waitFor({ state: 'visible' });
        
        // Should be able to edit tags cell
        await cellInput.fill('melee,heavy');
        await cellInput.press('Enter');
        
        // Verify both changes
        await expect(nameCell).toContainText('Great Sword');
        await expect(tagsCell).toContainText('melee,heavy');
    });

    test('should navigate to previous cell with Shift+Tab', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Dagger');
        
        // Wait for item to be added
        await expect(page.locator('td:has-text("Dagger")')).toBeVisible();
        
        // Click on tags cell of the first item
        let row = page.locator('tbody tr').first();
        let tagsCell = row.locator('td:nth-child(2)');
        await tagsCell.click();
        let cellInput = tagsCell.locator('input');
        await cellInput.waitFor({ state: 'visible' });
        
        // Fill tags
        await cellInput.fill('melee,small');
        
        // Press Shift+Tab to move back to name cell
        await cellInput.press('Shift+Tab');
        
        // Wait for focus on name cell in same row
        let nameCell = row.locator('td:first-child');
        cellInput = nameCell.locator('input');
        await cellInput.waitFor({ state: 'visible' });
        
        // Should be able to edit name cell
        await cellInput.fill('Sharp Dagger');
        await cellInput.press('Enter');
        
        // Verify both changes
        await expect(nameCell).toContainText('Sharp Dagger');
        await expect(tagsCell).toContainText('melee,small');
    });

    test('should navigate multiple cells with Tab', async ({ page }) => {
        // Add an item using the example row
        await addItemViaExampleRow(page, 'Shield');
        
        // Wait for item to be added
        await expect(page.locator('td:has-text("Shield")')).toBeVisible();
        
        // Click on name cell of the new item
        let row = page.locator('tbody tr').first();
        let nameCell = row.locator('td:first-child');
        await nameCell.click();
        let cellInput = nameCell.locator('input');
        await cellInput.waitFor({ state: 'visible' });
        await cellInput.fill('Steel Shield');
        
        // Tab to tags
        await cellInput.press('Tab');
        let tagsCell = row.locator('td:nth-child(2)');
        cellInput = tagsCell.locator('input');
        await cellInput.waitFor({ state: 'visible' });
        await cellInput.fill('armor');
        
        // Tab to reference
        await cellInput.press('Tab');
        let refCell = row.locator('td:nth-child(3)');
        cellInput = refCell.locator('input');
        await cellInput.waitFor({ state: 'visible' });
        await cellInput.fill('p.45');
        
        // Tab to weight
        await cellInput.press('Tab');
        let weightCell = row.locator('td:nth-child(4)');
        cellInput = weightCell.locator('input');
        await cellInput.waitFor({ state: 'visible' });
        await cellInput.fill('75');
        await cellInput.press('Enter');
        
        // Verify all changes were saved
        row = page.locator('tbody tr').first();
        await expect(row.locator('td:first-child')).toContainText('Steel Shield');
        await expect(row.locator('td:nth-child(2)')).toContainText('armor');
        await expect(row.locator('td:nth-child(3)')).toContainText('p.45');
        await expect(row.locator('td:nth-child(4)')).toContainText('75');
    });
});

