import { DiceEngine } from './logic.js';

// --- Application State ---
const STORAGE_KEY = 'myList_v1.10.0_';
const TABS_KEY = 'myList_tabs_v1.10.0';
const ROLL_HISTORY_KEY = 'myList_rollHistory_v1.10.0_';

// --- Import Validation Constants ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FIELD_LENGTH = 500; // for name, tags, reference
const MAX_TAB_NAME_LENGTH = 100;
const WEIGHT_DEFAULT = 50;
const REFERENCE_DEFAULT = 'TBD';
const TAGS_DEFAULT = 'tbd';

let currentTab = 'items';
let filterLogic = 'OR';
let selectedTags = new Set();
let rollHistory = {}; // Per-tab roll history
let pendingImport = null;

// Initialize tabs structure
let tabs = JSON.parse(localStorage.getItem(TABS_KEY)) || [
    { id: 'items', name: 'Items' },
    { id: 'encounters', name: 'Encounters' },
    { id: 'weapons', name: 'Improvised Weapons' }
];

let data = {};
let legendData = {};
tabs.forEach(tab => {
    data[tab.id] = JSON.parse(localStorage.getItem(STORAGE_KEY + tab.id)) || [];
    legendData[tab.id] = JSON.parse(localStorage.getItem(STORAGE_KEY + 'legend_' + tab.id)) || [];
    rollHistory[tab.id] = JSON.parse(localStorage.getItem(ROLL_HISTORY_KEY + tab.id)) || [];
});

// --- Core UI Functions ---

export const UI = {
    init() {
        this.renderTabs();
        this.bindEvents();
        this.switchTab(tabs[0].id); // This calls renderTagCloud and renderList
    },

    renderTabs() {
        const tabsContainer = document.querySelector('.tabs');
        tabsContainer.innerHTML = '';
        
        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.dataset.tab = tab.id;
            btn.id = `tab-${tab.id}`;
            btn.textContent = tab.name;
            btn.addEventListener('click', () => this.switchTab(tab.id));
            
            // Make tab name editable on double-click
            btn.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.editTabName(tab.id, btn);
            });
            
            tabsContainer.appendChild(btn);
        });
        
        // Add "New Tab" button
        const newTabBtn = document.createElement('button');
        newTabBtn.className = 'tab-btn new-tab-btn';
        newTabBtn.textContent = '+ New Tab';
        newTabBtn.addEventListener('click', () => this.createNewTab());
        tabsContainer.appendChild(newTabBtn);
    },

    editTabName(tabId, btnElement) {
        const tab = tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = tab.name;
        input.className = 'tab-name-edit';
        
        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== tab.name) {
                tab.name = newName;
                this.saveTabs();
                this.renderTabs();
                
                // Re-apply active class
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === currentTab);
                });
                
                this.renderList();
            } else {
                btnElement.textContent = tab.name;
            }
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                this.renderTabs();
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === currentTab);
                });
            }
        });
        
        btnElement.textContent = '';
        btnElement.appendChild(input);
        input.focus();
        input.select();
    },

    createNewTab() {
        const id = 'tab_' + Date.now();
        
        const newTab = { id, name: 'Tab Name (click to edit)' };
        tabs.push(newTab);
        data[id] = [];
        legendData[id] = [];
        rollHistory[id] = [];
        
        this.saveTabs();
        localStorage.setItem(STORAGE_KEY + id, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEY + 'legend_' + id, JSON.stringify([]));
        
        this.renderTabs();
        this.switchTab(id);
        
        // Automatically open the tab for editing
        setTimeout(() => {
            const newTabBtn = document.querySelector(`[data-tab="${id}"]`);
            if (newTabBtn) {
                this.editTabName(id, newTabBtn);
            }
        }, 100);
    },

    saveTabs() {
        localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    },

    bindEvents() {
        // Main Action Buttons
        document.getElementById('rollBtn').addEventListener('click', () => this.handleRoll());
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());

        // Roll log toggle and clear
        document.getElementById('rollLogToggle').addEventListener('click', () => this.toggleRollLog());
        document.getElementById('clearRollLog').addEventListener('click', () => this.clearRollLog());

        // Tools Menu
        const toolsBtn = document.getElementById('toolsBtn');
        const toolsMenu = document.getElementById('toolsMenu');
        toolsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toolsMenu.classList.toggle('hidden');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!toolsMenu.contains(e.target) && !toolsBtn.contains(e.target)) {
                toolsMenu.classList.add('hidden');
            }
        });

        // Dark Mode Toggle
        const darkModeToggle = document.getElementById('darkModeToggle');
        darkModeToggle.addEventListener('change', () => this.toggleDarkMode());

        // Add click handler to dark mode switch container for better UX
        const switchContainer = document.querySelector('.switch-container');
        if (switchContainer) {
            switchContainer.addEventListener('click', (e) => {
                // Don't toggle if clicking the labels
                if (e.target.classList.contains('switch-label')) return;
                darkModeToggle.checked = !darkModeToggle.checked;
                darkModeToggle.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }


        // Export buttons
        document.getElementById('exportCSV').addEventListener('click', () => {
            this.exportData('csv');
            toolsMenu.classList.add('hidden');
        });
        document.getElementById('exportJSON').addEventListener('click', () => {
            this.exportData('json');
            toolsMenu.classList.add('hidden');
        });
        document.getElementById('exportXLSX').addEventListener('click', () => {
            this.exportData('xlsx');
            toolsMenu.classList.add('hidden');
        });
        document.getElementById('exportAllTabs').addEventListener('click', () => {
            this.exportAllTabs();
            toolsMenu.classList.add('hidden');
        });

        // Delete tab
        document.getElementById('deleteTab').addEventListener('click', () => {
            this.promptDeleteTab();
            toolsMenu.classList.add('hidden');
        });

        // About button
        document.getElementById('aboutBtn').addEventListener('click', () => {
            this.showAbout();
            toolsMenu.classList.add('hidden');
        });
        document.getElementById('closeAbout').addEventListener('click', () => {
            this.hideAbout();
        });
        document.getElementById('aboutModal').addEventListener('click', (e) => {
            if (e.target.id === 'aboutModal') {
                this.hideAbout();
            }
        });

        // Import button
        const importFileInput = document.getElementById('importFileInput');
        document.getElementById('importData').addEventListener('click', () => {
            importFileInput.click();
        });
        importFileInput.addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
            e.target.value = ''; // Reset input
            toolsMenu.classList.add('hidden');
        });

        // Add Item Button
        document.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', () => this.addItem());
        });
        
        // Delete Item Buttons (delegated)
        const tableBody = document.getElementById('tableBody');
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete')) {
                const index = parseInt(e.target.dataset.index);
                this.deleteItem(index);
            }
        });

        // Inline editing for table cells
        tableBody.addEventListener('click', (e) => {
            if (e.target.tagName === 'TD' && e.target.classList.contains('editable')) {
                const row = e.target.parentElement;
                this.editCell(e.target, row);
            }
        });
        
        // Delete Legend Entry Buttons (delegated)
        const legendTableBody = document.getElementById('legendTableBody');
        legendTableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete')) {
                const index = parseInt(e.target.dataset.legendIndex);
                this.deleteLegendItem(index);
            }
        });

        // Inline editing for legend table cells
        legendTableBody.addEventListener('click', (e) => {
            if (e.target.tagName === 'TD' && e.target.classList.contains('editable')) {
                const row = e.target.parentElement;
                this.editLegendCell(e.target, row);
            }
        });
        
        // Tag match mode change
        document.querySelectorAll('input[name="tagMatchMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                filterLogic = e.target.value;
                this.renderList();
            });
        });
    },

    switchTab(tab) {
        currentTab = tab;
        
        // Update CSS classes for active tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            btn.classList.toggle('active', isActive);
        });
        
        // Update the table header name
        const currentTabObj = tabs.find(t => t.id === tab);
        const tabName = currentTabObj ? currentTabObj.name : tab;
        const tableNameHeader = document.getElementById('tableNameHeader');
        if (tableNameHeader) {
            tableNameHeader.textContent = tabName;
        }
        
        this.renderTagCloud();
        this.renderList();
        this.renderRollLog();
    },

    renderTagCloud() {
        const tagCloudEl = document.getElementById('tagCloud');
        if (!tagCloudEl) return;
        
        // Extract all unique tags from current tab's data (case-insensitive)
        const allTagsMap = new Map(); // lowercase -> display case
        data[currentTab].forEach(item => {
            if (item.tags) {
                const tags = item.tags.split(',').map(t => t.trim()).filter(t => t);
                tags.forEach(tag => {
                    const lowerTag = tag.toLowerCase();
                    if (!allTagsMap.has(lowerTag)) {
                        allTagsMap.set(lowerTag, tag);
                    }
                });
            }
        });
        
        // Clear existing tags
        tagCloudEl.innerHTML = '';
        
        if (allTagsMap.size === 0) {
            tagCloudEl.innerHTML = '<span class="no-tags">No tags available. Add tags to items to enable filtering.</span>';
            return;
        }
        
        // Create tag buttons
        const sortedTags = Array.from(allTagsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        sortedTags.forEach(([lowerTag, displayTag]) => {
            const tagBtn = document.createElement('button');
            tagBtn.className = 'tag-btn';
            // Display in sentence case: first letter uppercase, rest lowercase
            const sentenceCase = lowerTag.charAt(0).toUpperCase() + lowerTag.slice(1);
            tagBtn.textContent = sentenceCase;
            tagBtn.dataset.tag = lowerTag;
            
            if (selectedTags.has(lowerTag)) {
                tagBtn.classList.add('selected');
            }
            
            tagBtn.addEventListener('click', () => this.toggleTag(lowerTag));
            tagCloudEl.appendChild(tagBtn);
        });
    },
    
    toggleTag(tag) {
        if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
        } else {
            selectedTags.add(tag);
        }
        this.renderTagCloud();
        this.renderList();
    },

    handleRoll() {
        const list = this.getFilteredList();
        const selectedItem = DiceEngine.pickWeightedItem(list);
        
        if (selectedItem) {
            const rawName = selectedItem.reference ? `${selectedItem.name} (${selectedItem.reference})` : selectedItem.name;
            const resultText = DiceEngine.parseDice(rawName);
            
            const resultEl = document.getElementById('result');
            resultEl.innerText = resultText;
            
            document.getElementById('copyBtn').classList.remove('hidden');
            this.addToHistory(resultText);
            this.renderRollLog();
        }
    },

    getFilteredList() {
        const rawList = data[currentTab];
        if (selectedTags.size === 0) return rawList;

        return rawList.filter(item => {
            const itemTags = (item.tags || "").toLowerCase().split(',').map(t => t.trim());
            const activeFilters = Array.from(selectedTags).map(t => t.toLowerCase());
            
            return filterLogic === 'OR' 
                ? activeFilters.some(ft => itemTags.includes(ft)) 
                : activeFilters.every(ft => itemTags.includes(ft));
        });
    },

    renderList() {
        const body = document.getElementById('tableBody');
        const allItems = data[currentTab];
        const filtered = this.getFilteredList();
        const nameHeader = document.getElementById('tableNameHeader');
        
        // Update header to reflect current tab name
        const currentTabObj = tabs.find(t => t.id === currentTab);
        const tabLabel = currentTabObj ? currentTabObj.name.replace(/s$/, '') : 'Item';
        nameHeader.textContent = tabLabel;
        
        // Render filtered items but preserve original indices for operations
        const itemsToShow = selectedTags.size === 0 ? allItems : filtered;
        const itemsHTML = itemsToShow.map((item) => {
            const originalIndex = allItems.indexOf(item);
            return `
            <tr data-item-index="${originalIndex}">
                <td class="editable" data-field="name">${item.name}</td>
                <td class="editable" data-field="tags">${item.tags || ''}</td>
                <td class="editable" data-field="reference">${item.reference || ''}</td>
                <td class="editable" data-field="weight">${item.weight || 1}</td>
                <td><button class="btn-delete" data-index="${originalIndex}">×</button></td>
            </tr>
        `}).join('');
        
        const exampleRowHTML = `
            <tr class="example-row">
                <td class="editable" data-field="name">Example ${tabLabel}</td>
                <td class="editable" data-field="tags">Treasure, Cave</td>
                <td class="editable" data-field="reference">Reference</td>
                <td class="editable" data-field="weight">50</td>
                <td><button class="btn-delete" disabled>×</button></td>
            </tr>
        `;
        
        body.innerHTML = itemsHTML + exampleRowHTML;

        localStorage.setItem(STORAGE_KEY + currentTab, JSON.stringify(data[currentTab]));
        
        // Render legend table
        this.renderLegend();
    },

    renderLegend() {
        const body = document.getElementById('legendTableBody');
        const legends = legendData[currentTab] || [];
        
        const legendsHTML = legends.map((legend, index) => {
            return `
            <tr data-legend-index="${index}">
                <td class="editable" data-field="acronym">${legend.acronym}</td>
                <td class="editable" data-field="fullName">${legend.fullName || ''}</td>
                <td><button class="btn-delete" data-legend-index="${index}">×</button></td>
            </tr>
        `}).join('');
        
        const exampleRowHTML = `
            <tr class="example-row">
                <td class="editable" data-field="acronym">DBR</td>
                <td class="editable" data-field="fullName">Dragonbane Rules</td>
                <td><button class="btn-delete" disabled>×</button></td>
            </tr>
        `;
        
        body.innerHTML = legendsHTML + exampleRowHTML;

        localStorage.setItem(STORAGE_KEY + 'legend_' + currentTab, JSON.stringify(legendData[currentTab]));
    },

    addItem() {
        const input = document.getElementById('simpleInput');
        let itemName = input.value.trim();
        
        if (!itemName) return;
        
        // Validate name length
        itemName = this.sanitizeString(itemName, MAX_FIELD_LENGTH);
        if (!itemName) {
            this.showMessage('Name is invalid or too long (max 500 characters).');
            return;
        }

        if (!this.isNameUnique(itemName, currentTab)) {
            this.showMessage('Name must be unique in this tab.');
            return;
        }
        
        const newItem = {
            name: itemName,
            tags: TAGS_DEFAULT,
            weight: WEIGHT_DEFAULT,
            reference: REFERENCE_DEFAULT
        };
        
        data[currentTab].push(newItem);
        input.value = '';
        this.renderList();
        
        // Focus on tags field of newly created item and select text
        setTimeout(() => {
            const tableBody = document.getElementById('tableBody');
            const rows = tableBody.querySelectorAll('tr:not(.example-row)');
            if (rows.length > 0) {
                const newRow = rows[rows.length - 1];
                const tagsCell = newRow.querySelector('td[data-field="tags"]');
                if (tagsCell) {
                    tagsCell.click(); // This triggers editCell
                }
            }
        }, 0);
    },

    deleteItem(index) {
        const filtered = this.getFilteredList();
        if (index >= 0 && index < filtered.length) {
            const itemToDelete = filtered[index];
            const actualIndex = data[currentTab].indexOf(itemToDelete);
            if (actualIndex > -1) {
                data[currentTab].splice(actualIndex, 1);
                this.renderTagCloud();
                this.renderList();
            }
        }
    },

    deleteLegendItem(index) {
        if (index >= 0 && index < legendData[currentTab].length) {
            legendData[currentTab].splice(index, 1);
            this.renderLegend();
        }
    },

    copyToClipboard() {
        const text = document.getElementById('result').innerText;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalText = btn.innerText;
            btn.innerText = '✅ Copied!';
            setTimeout(() => btn.innerText = originalText, 1500);
        });
    },

    addToHistory(result) {
        if (!rollHistory[currentTab]) {
            rollHistory[currentTab] = [];
        }
        const timestamp = new Date().toLocaleString();
        rollHistory[currentTab].unshift({ result, timestamp });
        
        // Keep only last 50 rolls per tab
        if (rollHistory[currentTab].length > 50) {
            rollHistory[currentTab] = rollHistory[currentTab].slice(0, 50);
        }
        
        localStorage.setItem(ROLL_HISTORY_KEY + currentTab, JSON.stringify(rollHistory[currentTab]));
    },

    toggleRollLog() {
        const logContainer = document.getElementById('rollLogContainer');
        const toggleBtn = document.getElementById('rollLogToggle');
        const isCollapsed = logContainer.classList.toggle('collapsed');
        toggleBtn.textContent = isCollapsed ? '▶ Show Roll Log' : '▼ Hide Roll Log';
    },

    clearRollLog() {
        if (!rollHistory[currentTab]) return;
        
        this.showPrompt({
            message: 'Clear all roll history for this tab?',
            primaryText: 'Clear',
            secondaryText: 'Cancel',
            onPrimary: () => {
                rollHistory[currentTab] = [];
                localStorage.setItem(ROLL_HISTORY_KEY + currentTab, JSON.stringify([]));
                this.renderRollLog();
            }
        });
    },

    renderRollLog() {
        const logList = document.getElementById('rollLogList');
        const history = rollHistory[currentTab] || [];
        
        if (history.length === 0) {
            logList.innerHTML = '<div class="roll-log-empty">No rolls yet. Roll on the table to see history here.</div>';
            return;
        }
        
        const historyHTML = history.map(entry => `
            <div class="roll-log-entry">
                <span class="roll-log-result">${entry.result}</span>
                <span class="roll-log-time">${entry.timestamp}</span>
            </div>
        `).join('');
        
        logList.innerHTML = historyHTML;
    },

    editCell(cell, row) {
        // Skip if already editing
        if (cell.classList.contains('editing')) return;
        
        const fieldName = cell.getAttribute('data-field');
        const originalValue = cell.innerText;
        const isExampleRow = row.classList.contains('example-row');
        
        let item = null;
        if (!isExampleRow) {
            const itemIndex = parseInt(row.getAttribute('data-item-index'));
            const filtered = this.getFilteredList();
            item = filtered[itemIndex];
            if (!item) return;
        }
        
        // Create input field
        const input = document.createElement('input');
        input.type = fieldName === 'weight' ? 'number' : 'text';
        input.value = originalValue;
        input.className = 'cell-input';
        
        if (fieldName === 'weight') {
            input.min = '1';
            input.max = '100';
        }
        
        // Add enhanced autocomplete for tags field
        if (fieldName === 'tags') {
            // Get all unique tags from current tab
            const allTags = new Set();
            data[currentTab].forEach(item => {
                if (item.tags) {
                    const tags = item.tags.split(',').map(t => t.trim()).filter(t => t);
                    tags.forEach(tag => allTags.add(tag));
                }
            });
            const availableTags = Array.from(allTags).sort();
            
            // Create autocomplete dropdown
            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'tag-autocomplete-container';
            dropdownContainer.style.position = 'absolute';
            dropdownContainer.style.display = 'none';
            dropdownContainer.style.backgroundColor = '#2a2a2a';
            dropdownContainer.style.border = '1px solid #666';
            dropdownContainer.style.borderRadius = '4px';
            dropdownContainer.style.maxHeight = '200px';
            dropdownContainer.style.overflowY = 'auto';
            dropdownContainer.style.zIndex = '1000';
            dropdownContainer.style.minWidth = '150px';
            
            let selectedSuggestionIndex = -1;
            let autocompleteHandled = false;
            
            const showSuggestions = (filter) => {
                const filtered = availableTags.filter(tag => 
                    tag.toLowerCase().includes(filter.toLowerCase())
                );
                
                if (filtered.length === 0) {
                    dropdownContainer.style.display = 'none';
                    selectedSuggestionIndex = -1;
                    return;
                }
                
                dropdownContainer.innerHTML = '';
                filtered.forEach((tag, index) => {
                    const option = document.createElement('div');
                    option.className = 'tag-suggestion';
                    option.textContent = tag;
                    option.style.padding = '8px 12px';
                    option.style.cursor = 'pointer';
                    option.style.color = '#ccc';
                    
                    option.addEventListener('mouseenter', () => {
                        // Remove previous highlight
                        document.querySelectorAll('.tag-suggestion').forEach(el => {
                            el.style.backgroundColor = 'transparent';
                            el.style.color = '#ccc';
                        });
                        // Highlight this one
                        option.style.backgroundColor = '#e67e22';
                        option.style.color = '#fff';
                        selectedSuggestionIndex = index;
                    });
                    
                    // Use mousedown to avoid input blur before we capture the click
                    option.addEventListener('mousedown', (evt) => {
                        evt.preventDefault();
                        selectedSuggestionIndex = index;
                        input.value = tag;
                        hideSuggestions();
                        input.focus();
                    });
                    option.addEventListener('click', () => {
                        selectedSuggestionIndex = index;
                        input.value = tag;
                        hideSuggestions();
                        input.focus();
                    });
                    
                    dropdownContainer.appendChild(option);
                });
                
                // Position dropdown below input
                const rect = input.getBoundingClientRect();
                dropdownContainer.style.display = 'block';
                dropdownContainer.style.position = 'fixed';
                dropdownContainer.style.top = (rect.bottom + 2) + 'px';
                dropdownContainer.style.left = rect.left + 'px';
                dropdownContainer.style.width = (rect.width - 2) + 'px';
            };
            
            const hideSuggestions = () => {
                dropdownContainer.style.display = 'none';
                selectedSuggestionIndex = -1;
            };
            
            // Input event for filtering suggestions
            input.addEventListener('input', (e) => {
                const filter = e.target.value.trim();
                if (filter.length > 0) {
                    showSuggestions(filter);
                } else {
                    hideSuggestions();
                }
            });
            
            // Store autocomplete handler on input so main keydown handler can check
            input.handleAutocompleteKeydown = (e) => {
                const suggestions = dropdownContainer.querySelectorAll('.tag-suggestion');
                autocompleteHandled = false;
                
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (suggestions.length > 0) {
                        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
                        // Remove previous highlight
                        suggestions.forEach(el => {
                            el.style.backgroundColor = 'transparent';
                            el.style.color = '#ccc';
                        });
                        // Highlight selected
                        suggestions[selectedSuggestionIndex].style.backgroundColor = '#e67e22';
                        suggestions[selectedSuggestionIndex].style.color = '#fff';
                    }
                    autocompleteHandled = true;
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (suggestions.length > 0) {
                        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                        // Remove previous highlight
                        suggestions.forEach(el => {
                            el.style.backgroundColor = 'transparent';
                            el.style.color = '#ccc';
                        });
                        // Highlight selected if valid
                        if (selectedSuggestionIndex >= 0) {
                            suggestions[selectedSuggestionIndex].style.backgroundColor = '#e67e22';
                            suggestions[selectedSuggestionIndex].style.color = '#fff';
                        }
                    }
                    autocompleteHandled = true;
                    return;
                } else if (e.key === 'Tab' && suggestions.length > 0) {
                    e.preventDefault();
                    // If none selected yet, pick the first
                    if (selectedSuggestionIndex < 0) {
                        selectedSuggestionIndex = 0;
                    }
                    const selectedTag = suggestions[selectedSuggestionIndex].textContent;
                    input.value = selectedTag;
                    hideSuggestions();
                    autocompleteHandled = true;
                    return;
                }
                
                autocompleteHandled = false;
            };
            
            // Keyboard navigation for suggestions - called before main keydown handler
            input.addEventListener('keydown', (e) => {
                input.handleAutocompleteKeydown(e);
            }, true); // Use capture phase to handle before main handler
            
            document.body.appendChild(dropdownContainer);
            
            // Clean up dropdown when input is removed
            const originalRemove = input.remove.bind(input);
            input.remove = () => {
                dropdownContainer.remove();
                originalRemove();
            };
        }
        
        // Replace cell content with input
        cell.classList.add('editing');
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
        
        let escapePressed = false;
        let saveInProgress = false;
        
        // Save on blur or Enter
        const saveEdit = () => {
            if (input.parentElement !== cell) return; // Already removed
            if (escapePressed) return; // Don't save if escape was pressed
            if (saveInProgress) return; // Prevent double-save
            
            saveInProgress = true;
            
            let newValue = input.value.trim();
            
            // Validate field lengths and types
            if (fieldName === 'weight') {
                newValue = this.sanitizeWeight(newValue);
            } else if (fieldName === 'tags') {
                newValue = this.sanitizeString(newValue, MAX_FIELD_LENGTH);
                if (!newValue) newValue = TAGS_DEFAULT;
                newValue = this.preventCSVInjection(newValue);
            } else if (fieldName === 'reference') {
                newValue = this.sanitizeString(newValue, MAX_FIELD_LENGTH);
                if (!newValue) newValue = REFERENCE_DEFAULT;
                newValue = this.preventCSVInjection(newValue);
            } else if (fieldName === 'name') {
                newValue = this.sanitizeString(newValue, MAX_FIELD_LENGTH);
            }
            
            if (isExampleRow) {
                // Create new item from example row
                const newItem = {
                    name: '',
                    tags: '',
                    reference: '',
                    weight: 40
                };
                
                // Get current values from the row
                const cells = row.querySelectorAll('td.editable');
                cells.forEach(currentCell => {
                    const field = currentCell.getAttribute('data-field');
                    let value;
                    
                    if (currentCell.classList.contains('editing')) {
                        // Get value from input if this is the cell being edited
                        const input = currentCell.querySelector('input');
                        value = input ? input.value : newValue;
                    } else {
                        // Get value from cell text
                        value = currentCell.innerText;
                    }
                    
                    if (field === fieldName) {
                        newItem[field] = newValue;
                    } else {
                        newItem[field] = value;
                    }
                });
                
                // Validate and set defaults with proper validation
                newItem.name = this.sanitizeString(newItem.name, MAX_FIELD_LENGTH) || '';
                newItem.tags = this.sanitizeString(newItem.tags, MAX_FIELD_LENGTH) || TAGS_DEFAULT;
                newItem.tags = this.preventCSVInjection(newItem.tags);
                newItem.reference = this.sanitizeString(newItem.reference, MAX_FIELD_LENGTH) || REFERENCE_DEFAULT;
                newItem.reference = this.preventCSVInjection(newItem.reference);
                newItem.weight = this.sanitizeWeight(newItem.weight);
                
                // Only create item if name is not empty or example text
                if (newItem.name && !newItem.name.includes('Example')) {
                    if (!this.isNameUnique(newItem.name, currentTab)) {
                        this.showMessage('Name must be unique in this tab.');
                        cell.classList.remove('editing');
                        cell.innerText = 'Example ' + tabLabel;
                        return;
                    }
                    data[currentTab].push(newItem);
                    localStorage.setItem(STORAGE_KEY + currentTab, JSON.stringify(data[currentTab]));
                    this.renderTagCloud();
                    this.renderList();
                    return;
                } else {
                    // Just update the cell display with the new value
                    cell.classList.remove('editing');
                    cell.innerText = newValue;
                    return;
                }
            } else {
                // Update existing item
                const actualIndex = data[currentTab].indexOf(item);
                if (actualIndex > -1) {
                    if (fieldName === 'name') {
                        if (!newValue) {
                            this.showMessage('Name cannot be empty.');
                            cell.classList.remove('editing');
                            cell.innerText = item.name;
                            return;
                        }
                        if (!this.isNameUnique(newValue, currentTab, actualIndex)) {
                            this.showMessage('Name must be unique in this tab.');
                            cell.classList.remove('editing');
                            cell.innerText = item.name;
                            return;
                        }
                    }
                    data[currentTab][actualIndex][fieldName] = newValue;
                }
                
                // Update cell display
                cell.classList.remove('editing');
                cell.innerText = newValue;
                
                // Save to localStorage
                localStorage.setItem(STORAGE_KEY + currentTab, JSON.stringify(data[currentTab]));
                
                // Update tag cloud if tags were edited
                if (fieldName === 'tags') {
                    this.renderTagCloud();
                }
            }
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            // If an earlier handler (like tag autocomplete) already handled this key, skip
            if (e.defaultPrevented) return;
            if (input.handleAutocompleteKeydown) {
                input.handleAutocompleteKeydown(e);
                if (e.defaultPrevented) return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                escapePressed = true;
                cell.classList.remove('editing');
                cell.innerText = originalValue;
            } else if (e.key === 'Tab') {
                e.preventDefault();
                
                // Find next or previous editable cell
                const cells = Array.from(row.querySelectorAll('td.editable'));
                const currentIndex = cells.indexOf(cell);
                let nextCell;
                
                if (e.shiftKey) {
                    // Shift+Tab: previous cell
                    nextCell = currentIndex > 0 ? cells[currentIndex - 1] : null;
                } else {
                    // Tab: next cell
                    nextCell = currentIndex < cells.length - 1 ? cells[currentIndex + 1] : null;
                }
                
                // For example row, move focus without committing until the row is complete
                if (isExampleRow && nextCell) {
                    this.editCell(nextCell, row);
                    return;
                }
                
                // Otherwise save and move on
                saveEdit();
                if (nextCell) {
                    this.editCell(nextCell, row);
                }
            }
        });
    },

    editLegendCell(cell, row) {
        // Skip if already editing
        if (cell.classList.contains('editing')) return;
        
        const fieldName = cell.getAttribute('data-field');
        const originalValue = cell.innerText;
        const isExampleRow = row.classList.contains('example-row');
        
        let legend = null;
        if (!isExampleRow) {
            const legendIndex = parseInt(row.getAttribute('data-legend-index'));
            legend = legendData[currentTab][legendIndex];
            if (!legend) return;
        }
        
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalValue;
        input.className = 'cell-input';
        
        // Replace cell content with input
        cell.classList.add('editing');
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
        
        let escapePressed = false;
        let saveInProgress = false;
        
        // Save on blur or Enter
        const saveEdit = () => {
            if (input.parentElement !== cell) return;
            if (escapePressed) return;
            if (saveInProgress) return;
            
            saveInProgress = true;
            
            let newValue = input.value.trim();
            
            // Validate field lengths for legend entries
            if (fieldName === 'acronym') {
                newValue = this.sanitizeString(newValue, MAX_FIELD_LENGTH);
            } else if (fieldName === 'fullName') {
                newValue = this.sanitizeString(newValue, MAX_FIELD_LENGTH);
                newValue = this.preventCSVInjection(newValue);
            }
            
            if (isExampleRow) {
                // Create new legend entry from example row
                const newLegend = {
                    acronym: '',
                    fullName: ''
                };
                
                // Get current values from the row
                const cells = row.querySelectorAll('td.editable');
                cells.forEach(currentCell => {
                    const field = currentCell.getAttribute('data-field');
                    let value;
                    
                    if (currentCell.classList.contains('editing')) {
                        value = newValue;
                    } else {
                        value = currentCell.innerText;
                    }
                    
                    if (field === fieldName) {
                        newLegend[field] = newValue;
                    } else {
                        newLegend[field] = value;
                    }
                });
                
                // Validate legend entry with proper field validation
                newLegend.acronym = this.sanitizeString(newLegend.acronym, MAX_FIELD_LENGTH) || '';
                newLegend.fullName = this.sanitizeString(newLegend.fullName, MAX_FIELD_LENGTH) || '';
                newLegend.fullName = this.preventCSVInjection(newLegend.fullName);
                
                // Only create entry if acronym is not empty or example text
                if (newLegend.acronym && !newLegend.acronym.includes('DBR')) {
                    if (!legendData[currentTab]) {
                        legendData[currentTab] = [];
                    }
                    legendData[currentTab].push(newLegend);
                    localStorage.setItem(STORAGE_KEY + 'legend_' + currentTab, JSON.stringify(legendData[currentTab]));
                    this.renderLegend();
                    return;
                } else {
                    // Just update the cell display with the new value
                    cell.classList.remove('editing');
                    cell.innerText = newValue;
                    return;
                }
            } else {
                // Update existing legend entry
                const legendIndex = parseInt(row.getAttribute('data-legend-index'));
                if (legendIndex >= 0 && legendIndex < legendData[currentTab].length) {
                    if (fieldName === 'acronym' && !newValue) {
                        this.showMessage('Acronym cannot be empty.');
                        cell.classList.remove('editing');
                        cell.innerText = legend.acronym;
                        return;
                    }
                    legendData[currentTab][legendIndex][fieldName] = newValue;
                }
                
                // Update cell display
                cell.classList.remove('editing');
                cell.innerText = newValue;
                
                // Save to localStorage
                localStorage.setItem(STORAGE_KEY + 'legend_' + currentTab, JSON.stringify(legendData[currentTab]));
            }
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                escapePressed = true;
                cell.classList.remove('editing');
                cell.innerText = originalValue;
            } else if (e.key === 'Tab') {
                e.preventDefault();
                saveEdit();
                
                // Find next or previous editable cell
                const cells = Array.from(row.querySelectorAll('td.editable'));
                const currentIndex = cells.indexOf(cell);
                let nextCell;
                
                if (e.shiftKey) {
                    nextCell = currentIndex > 0 ? cells[currentIndex - 1] : null;
                } else {
                    nextCell = currentIndex < cells.length - 1 ? cells[currentIndex + 1] : null;
                }
                
                if (nextCell) {
                    this.editLegendCell(nextCell, row);
                }
            }
        });
    },

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
    },

    showPrompt({ message, primaryText, secondaryText, onPrimary, onSecondary }) {
        const container = document.getElementById('promptContainer');
        const msgEl = document.getElementById('promptMessage');
        const primaryBtn = document.getElementById('promptPrimary');
        const secondaryBtn = document.getElementById('promptSecondary');
        const cancelBtn = document.getElementById('promptCancel');
        if (!container || !msgEl || !primaryBtn || !secondaryBtn || !cancelBtn) return;

        msgEl.innerText = message;
        primaryBtn.innerText = primaryText;
        secondaryBtn.innerText = secondaryText || 'Append';

        const hide = () => container.classList.add('hidden');

        const clearHandlers = () => {
            primaryBtn.onclick = null;
            secondaryBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        primaryBtn.onclick = () => { clearHandlers(); hide(); onPrimary && onPrimary(); };
        secondaryBtn.onclick = () => { clearHandlers(); hide(); onSecondary && onSecondary(); };
        cancelBtn.onclick = () => { clearHandlers(); hide(); };

        container.classList.remove('hidden');
    },

    exportData(format) {
        const currentTabObj = tabs.find(t => t.id === currentTab);
        const tabName = currentTabObj ? currentTabObj.name : currentTab;
        const tableData = data[currentTab];
        const legends = legendData[currentTab] || [];
        const filenameBase = this.buildFilenameBase(tabName);

        if (format === 'csv') {
            const csv = this.convertToCSV(tableData);
            const legendCsv = this.convertLegendToCSV(legends);
            const combined = csv + '\n\nLegend\n' + legendCsv;
            this.downloadFile(combined, `${filenameBase}.csv`, 'text/csv');
        } else if (format === 'json') {
            const exportObj = {
                items: tableData,
                legend: legends
            };
            const json = JSON.stringify(exportObj, null, 2);
            this.downloadFile(json, `${filenameBase}.json`, 'application/json');
        } else if (format === 'xlsx') {
            this.exportXLSX(tableData, legends, tabName);
        }
    },

    async exportAllTabs() {
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const items = data[tab.id] || [];
            const legends = legendData[tab.id] || [];
            const exportObj = {
                items,
                legend: legends
            };
            const json = JSON.stringify(exportObj, null, 2);
            const filenameBase = this.buildFilenameBase(tab.name);
            this.downloadFile(json, `${filenameBase}.json`, 'application/json');
            
            // Small delay between downloads to prevent browser blocking
            if (i < tabs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        this.showMessage(`Exported ${tabs.length} tabs`);
    },

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = ['name', 'tags', 'reference', 'weight'];
        const csvRows = [];
        
        // Add header row
        csvRows.push(headers.join(','));
        
        // Add data rows
        data.forEach(item => {
            const values = headers.map(header => {
                const value = item[header] || '';
                // Escape commas and quotes in CSV
                const escaped = String(value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    },

    convertLegendToCSV(legends) {
        if (!legends || legends.length === 0) return '';
        
        const headers = ['acronym', 'fullName'];
        const csvRows = [];
        
        // Add header row
        csvRows.push(headers.join(','));
        
        // Add data rows
        legends.forEach(legend => {
            const values = headers.map(header => {
                const value = legend[header] || '';
                const escaped = String(value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    },

    exportXLSX(data, legends, tabName) {
        if (typeof XLSX === 'undefined') {
            alert('XLSX library not loaded. Please refresh the page.');
            return;
        }

        const workbook = XLSX.utils.book_new();
        
        // Add items sheet
        const itemsSheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items');
        
        // Add legend sheet if there are legends
        if (legends && legends.length > 0) {
            const legendSheet = XLSX.utils.json_to_sheet(legends);
            XLSX.utils.book_append_sheet(workbook, legendSheet, 'Legend');
        }
        
        const filename = `${this.buildFilenameBase(tabName)}.xlsx`;
        XLSX.writeFile(workbook, filename);
    },

    buildFilenameBase(name) {
        const fallback = 'table';
        const trimmed = (name || '').trim();
        const sanitized = trimmed
            ? trimmed.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '')
            : '';
        return sanitized || fallback;
    },

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    },

    validateFileSize(file) {
        if (file.size > MAX_FILE_SIZE) {
            this.showMessage(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit. Upload failed.`);
            return false;
        }
        return true;
    },

    validateFileHeader(arrayBuffer, extension) {
        // Check file signatures (magic bytes) to match claimed file type
        const view = new Uint8Array(arrayBuffer);
        if (extension === 'json') {
            // JSON files typically start with { or [
            const firstByte = view[0];
            if (firstByte !== 123 && firstByte !== 91) { // { = 123, [ = 91
                return false;
            }
        } else if (extension === 'xlsx') {
            // XLSX is a ZIP file, starts with PK (0x50 0x4B)
            if (view[0] !== 0x50 || view[1] !== 0x4B) {
                return false;
            }
        } else if (extension === 'csv') {
            // CSV can start with various characters, just ensure it's text-like
            // Allow common BOM or text characters
            const firstByte = view[0];
            if (firstByte > 127 && firstByte !== 0xEF) { // Not ASCII or UTF-8 BOM
                return false;
            }
        }
        return true;
    },

    sanitizeString(value, maxLength) {
        if (typeof value !== 'string') return '';
        return value.trim().substring(0, maxLength);
    },

    sanitizeWeight(value) {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            return WEIGHT_DEFAULT;
        }
        return Math.max(1, Math.min(100, parsed));
    },

    preventCSVInjection(value) {
        // Prevent formula injection in CSV: =, +, -, @
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        if (/^[=+\-@]/.test(trimmed)) {
            return "'" + trimmed; // Prefix with single quote to prevent interpretation
        }
        return value;
    },

    async importData(file) {
        if (!file) return;

        // Validate file size
        if (!this.validateFileSize(file)) {
            return;
        }

        const extension = file.name.split('.').pop().toLowerCase();
        
        // Validate file extension
        if (!['json', 'csv', 'xlsx'].includes(extension)) {
            this.showMessage('Unsupported file format. Use CSV, JSON, or XLSX.');
            return;
        }

        try {
            let importedItems = [];
            let importedLegends = [];
            
            if (extension === 'json') {
                const arrayBuffer = await file.arrayBuffer();
                if (!this.validateFileHeader(arrayBuffer, 'json')) {
                    this.showMessage('Invalid JSON file format.');
                    return;
                }
                const text = await file.text();
                const parsed = JSON.parse(text);
                // Handle both old format (array) and new format (object with items and legend)
                if (Array.isArray(parsed)) {
                    importedItems = parsed;
                } else {
                    importedItems = parsed.items || [];
                    importedLegends = parsed.legend || [];
                }
            } else if (extension === 'csv') {
                const text = await file.text();
                const parsed = this.parseCSV(text);
                importedItems = parsed.items || [];
                importedLegends = parsed.legend || [];
            } else if (extension === 'xlsx') {
                if (typeof XLSX === 'undefined') {
                    this.showMessage('XLSX library not loaded. Please refresh the page.');
                    return;
                }
                const arrayBuffer = await file.arrayBuffer();
                if (!this.validateFileHeader(arrayBuffer, 'xlsx')) {
                    this.showMessage('Invalid XLSX file format.');
                    return;
                }
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                
                // Read Items sheet (or first sheet if no Items sheet)
                const itemsSheetName = workbook.SheetNames.includes('Items') ? 'Items' : workbook.SheetNames[0];
                const itemsSheet = workbook.Sheets[itemsSheetName];
                importedItems = XLSX.utils.sheet_to_json(itemsSheet);
                
                // Read Legend sheet if it exists
                if (workbook.SheetNames.includes('Legend')) {
                    const legendSheet = workbook.Sheets['Legend'];
                    importedLegends = XLSX.utils.sheet_to_json(legendSheet);
                }
            }

            if (importedItems.length === 0) {
                this.showMessage('No data found in file. Check file format.');
                return;
            }

            this.handleImportConflict(file.name, importedItems, importedLegends);
        } catch (error) {
            this.showMessage('Import failed: ' + (error.message || 'Unknown error'));
        }
    },

    parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return { items: [], legend: [] };
        
        // Find if there's a Legend section (look for a line that is just "Legend", accounting for quotes)
        let legendStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();
            if (trimmedLine.toLowerCase() === 'legend' || trimmedLine.toLowerCase() === '"legend"') {
                legendStartIndex = i;
                break;
            }
        }
        
        // Parse items section - items come before Legend marker
        let itemLines = [];
        if (legendStartIndex > 0) {
            // Get all lines up to "Legend", excluding empty lines at the end
            for (let i = 0; i < legendStartIndex; i++) {
                if (lines[i].trim()) {
                    itemLines.push(lines[i]);
                }
            }
        } else {
            // No legend section, all non-empty lines are items
            itemLines = lines.filter(line => line.trim());
        }
        
        const items = this.parseCSVSection(itemLines);
        
        // Parse legend section if it exists
        let legends = [];
        if (legendStartIndex > 0) {
            // Collect legend lines starting from line after "Legend"
            const legendLines = [];
            for (let i = legendStartIndex + 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    legendLines.push(lines[i]);
                }
            }
            if (legendLines.length >= 1) {
                legends = this.parseCSVSection(legendLines);
            }
        }
        
        return { items, legend: legends };
    },
    
    parseCSVSection(lines) {
        if (lines.length < 2) return [];
        
        // Parse headers from first line
        const headers = this.parseCSVLine(lines[0]);
        const data = [];
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            const item = {};
            headers.forEach((header, index) => {
                item[header] = values[index] || '';
            });
            data.push(item);
        }
        
        return data;
    },

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                result.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
    },

    handleImportConflict(filename, importedItems, importedLegends) {
        const baseName = filename.replace(/\.(json|csv|xlsx)$/i, '') || 'Imported Tab';
        const normalizedName = this.sanitizeString(baseName, MAX_TAB_NAME_LENGTH) || 'Imported Tab';

        const normalizedItems = this.normalizeImportedData(importedItems);
        const normalizedLegends = this.normalizeLegendData(importedLegends);

        const existing = tabs.find(t => t.name.toLowerCase() === normalizedName.toLowerCase());
        if (!existing) {
            this.createTabWithData(normalizedName, normalizedItems, normalizedLegends);
            return;
        }

        // Store pending import and show inline prompt
        pendingImport = { 
            name: normalizedName, 
            data: normalizedItems, 
            legend: normalizedLegends,
            tabId: existing.id 
        };
        this.showPrompt({
            message: `Tab "${normalizedName}" already exists. Overwrite or append?`,
            primaryText: 'Overwrite',
            secondaryText: 'Append',
            onPrimary: () => this.overwriteTabFromImport(),
            onSecondary: () => this.appendTabFromImport()
        });
    },

    normalizeLegendData(importedLegends) {
        if (!Array.isArray(importedLegends)) return [];
        const seen = new Set();
        const result = [];
        importedLegends.forEach(legend => {
            let acronym = (legend.acronym || '').trim();
            if (!acronym) return;
            acronym = this.sanitizeString(acronym, MAX_FIELD_LENGTH);
            const key = acronym.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            let fullName = (legend.fullName || '').trim();
            fullName = this.sanitizeString(fullName, MAX_FIELD_LENGTH);
            fullName = this.preventCSVInjection(fullName);
            result.push({
                acronym,
                fullName
            });
        });
        return result;
    },
        
    normalizeImportedData(importedData) {
        if (!Array.isArray(importedData)) return [];
        // Map to expected shape with strict validation and defaults
        const seen = new Set();
        const result = [];
        importedData.forEach(item => {
            let name = (item.name || '').trim();
            if (!name) return;
            name = this.sanitizeString(name, MAX_FIELD_LENGTH);
            if (!name) return;
            const key = name.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            
            // Validate weight - must be integer 1-100, default to 50
            const weight = this.sanitizeWeight(item.weight);
            
            // Validate reference - must be string, default to TBD
            let reference = (item.reference || '').trim();
            if (!reference) {
                reference = REFERENCE_DEFAULT;
            } else {
                reference = this.sanitizeString(reference, MAX_FIELD_LENGTH);
                if (!reference) {
                    reference = REFERENCE_DEFAULT;
                } else {
                    reference = this.preventCSVInjection(reference);
                }
            }
            
            // Validate tags - must be string, default to tbd
            let tags = (item.tags || '').trim();
            if (!tags) {
                tags = TAGS_DEFAULT;
            } else {
                tags = this.sanitizeString(tags, MAX_FIELD_LENGTH);
                if (!tags) {
                    tags = TAGS_DEFAULT;
                } else {
                    tags = this.preventCSVInjection(tags);
                }
            }
            
            result.push({
                name,
                tags,
                reference,
                weight
            });
        });
        return result;
    },

    createTabWithData(name, items, legends = []) {
        const id = 'tab_' + Date.now();
        const newTab = { id, name };
        tabs.push(newTab);
        data[id] = items;
        legendData[id] = legends;
        this.saveTabs();
        localStorage.setItem(STORAGE_KEY + id, JSON.stringify(items));
        localStorage.setItem(STORAGE_KEY + 'legend_' + id, JSON.stringify(legends));
        this.renderTabs();
        this.switchTab(id);
    },

    overwriteTabFromImport() {
        if (!pendingImport) return;
        const { tabId, data: items, legend: legends = [] } = pendingImport;
        data[tabId] = items;
        legendData[tabId] = legends;
        localStorage.setItem(STORAGE_KEY + tabId, JSON.stringify(items));
        localStorage.setItem(STORAGE_KEY + 'legend_' + tabId, JSON.stringify(legends));
        this.saveTabs();
        this.renderTabs();
        this.switchTab(tabId);
        pendingImport = null;
    },

    appendTabFromImport() {
        if (!pendingImport) return;
        const { tabId, data: items, legend: legends = [] } = pendingImport;
        const existingItems = data[tabId] || [];
        const existingLegends = legendData[tabId] || [];
        const mergedItems = this.mergeUniqueByName(existingItems, items);
        const mergedLegends = this.mergeLegendsByAcronym(existingLegends, legends);
        data[tabId] = mergedItems;
        legendData[tabId] = mergedLegends;
        localStorage.setItem(STORAGE_KEY + tabId, JSON.stringify(mergedItems));
        localStorage.setItem(STORAGE_KEY + 'legend_' + tabId, JSON.stringify(mergedLegends));
        this.saveTabs();
        this.renderTabs();
        this.switchTab(tabId);
        pendingImport = null;
    },

    promptDeleteTab() {
        if (tabs.length <= 1) {
            this.showMessage('Cannot delete the last tab.');
            return;
        }
        const currentTabObj = tabs.find(t => t.id === currentTab);
        const tabName = currentTabObj ? currentTabObj.name : currentTab;
        this.showPrompt({
            message: `Delete tab "${tabName}" and its data?`,
            primaryText: 'Delete',
            secondaryText: 'Keep',
            onPrimary: () => this.deleteCurrentTab()
        });
    },

    deleteCurrentTab() {
        if (tabs.length <= 1) return;
        const idx = tabs.findIndex(t => t.id === currentTab);
        if (idx === -1) return;

        const tabId = tabs[idx].id;
        tabs.splice(idx, 1);
        delete data[tabId];
        delete legendData[tabId];
        localStorage.removeItem(STORAGE_KEY + tabId);
        localStorage.removeItem(STORAGE_KEY + 'legend_' + tabId);
        this.saveTabs();
        this.renderTabs();
        const nextTab = tabs[0] ? tabs[0].id : null;
        if (nextTab) {
            this.switchTab(nextTab);
        }
    },

    mergeUniqueByName(listA, listB) {
        const seen = new Set();
        const combined = [...listA, ...listB];
        const result = [];
        combined.forEach(item => {
            const key = (item.name || '').trim().toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            result.push(item);
        });
        return result;
    },

    mergeLegendsByAcronym(listA, listB) {
        const seen = new Set();
        const combined = [...listA, ...listB];
        const result = [];
        combined.forEach(legend => {
            const key = (legend.acronym || '').trim().toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            result.push(legend);
        });
        return result;
    },

    isNameUnique(name, tabId, skipIndex = -1) {
        const list = data[tabId] || [];
        const key = name.trim().toLowerCase();
        return !list.some((item, idx) => idx !== skipIndex && (item.name || '').trim().toLowerCase() === key);
    },

    showMessage(message) {
        const resultEl = document.getElementById('result');
        if (!resultEl) return;
        const original = resultEl.innerText;
        resultEl.innerText = message;
        setTimeout(() => {
            resultEl.innerText = original;
        }, 1500);
    },

    showAbout() {
        const modal = document.getElementById('aboutModal');
        modal.classList.remove('hidden');
    },

    hideAbout() {
        const modal = document.getElementById('aboutModal');
        modal.classList.add('hidden');
    }
};

// Initialize app if running in a browser
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // Restore dark mode preference
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode !== null) {
            const isDark = savedDarkMode === 'true';
            document.body.classList.toggle('dark-mode', isDark);
            const toggle = document.getElementById('darkModeToggle');
            if (toggle) toggle.checked = isDark;
        }
        
        UI.init();
    });
}