import { DiceEngine } from './logic.js';

// --- Application State ---
const STORAGE_KEY = 'myList_v1.9.0_';
const TABS_KEY = 'myList_tabs_v1.9.0';
let currentTab = 'items';
let filterLogic = 'OR';
let selectedTags = new Set();
let rollHistory = [];

// Initialize tabs structure
let tabs = JSON.parse(localStorage.getItem(TABS_KEY)) || [
    { id: 'items', name: 'Items', color: '#cb4b16' },
    { id: 'weapons', name: 'Weapons', color: '#6c71c4' },
    { id: 'encounters', name: 'Encounters', color: '#859900' }
];

let data = {};
tabs.forEach(tab => {
    data[tab.id] = JSON.parse(localStorage.getItem(STORAGE_KEY + tab.id)) || [];
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
                
                // Update nav context if this is the current tab
                if (currentTab === tabId) {
                    document.getElementById('navContext').innerText = tab.name;
                }
                
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
        const colors = ['#cb4b16', '#6c71c4', '#859900', '#2aa198', '#dc322f', '#b58900'];
        const color = colors[tabs.length % colors.length];
        
        const newTab = { id, name: 'Tab Name (click to edit)', color };
        tabs.push(newTab);
        data[id] = [];
        
        this.saveTabs();
        localStorage.setItem(STORAGE_KEY + id, JSON.stringify([]));
        
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
        
        // Find current tab metadata
        const currentTabObj = tabs.find(t => t.id === tab);
        const tabName = currentTabObj ? currentTabObj.name : tab;
        const tabColor = currentTabObj ? currentTabObj.color : '#2aa198';
        
        // Update CSS classes for active tabs and apply color
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            btn.classList.toggle('active', isActive);
            
            // Apply the tab's color to the active tab
            if (isActive) {
                btn.style.backgroundColor = tabColor;
            } else {
                btn.style.backgroundColor = '';
            }
        });
        
        // Contextual updates (headers, input visibility)
        const navContext = document.getElementById('navContext');
        navContext.innerText = tabName;
        navContext.style.backgroundColor = tabColor;
        navContext.style.color = 'white';
        
        // Update navbar background color
        const tabsContainer = document.querySelector('.tabs');
        if (tabsContainer) {
            tabsContainer.style.backgroundColor = tabColor;
        }
        
        this.renderTagCloud();
        this.renderList();
    },

    renderTagCloud() {
        const tagCloudEl = document.getElementById('tagCloud');
        if (!tagCloudEl) return;
        
        // Extract all unique tags from current tab's data
        const allTags = new Set();
        data[currentTab].forEach(item => {
            if (item.tags) {
                const tags = item.tags.split(',').map(t => t.trim()).filter(t => t);
                tags.forEach(tag => allTags.add(tag));
            }
        });
        
        // Clear existing tags
        tagCloudEl.innerHTML = '';
        
        if (allTags.size === 0) {
            tagCloudEl.innerHTML = '<span class="no-tags">No tags available. Add tags to items to enable filtering.</span>';
            return;
        }
        
        // Create tag buttons
        const sortedTags = Array.from(allTags).sort();
        sortedTags.forEach(tag => {
            const tagBtn = document.createElement('button');
            tagBtn.className = 'tag-btn';
            tagBtn.textContent = tag;
            tagBtn.dataset.tag = tag;
            
            if (selectedTags.has(tag)) {
                tagBtn.classList.add('selected');
            }
            
            tagBtn.addEventListener('click', () => this.toggleTag(tag));
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
            const rawName = selectedItem.ref ? `${selectedItem.name} (${selectedItem.ref})` : selectedItem.name;
            const resultText = DiceEngine.parseDice(rawName);
            
            const resultEl = document.getElementById('result');
            resultEl.innerText = resultText;
            
            document.getElementById('copyBtn').classList.remove('hidden');
            this.addToHistory(resultText);
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
                <td class="editable" data-field="tags">example-tag</td>
                <td class="editable" data-field="reference">Reference</td>
                <td class="editable" data-field="weight">50</td>
                <td><button class="btn-delete" disabled>×</button></td>
            </tr>
        `;
        
        body.innerHTML = itemsHTML + exampleRowHTML;

        localStorage.setItem(STORAGE_KEY + currentTab, JSON.stringify(data[currentTab]));
    },

    addItem() {
        const input = document.getElementById('simpleInput');
        const itemName = input.value.trim();
        
        if (!itemName) return;
        
        const newItem = {
            name: itemName,
            tags: '',
            weight: 1,
            ref: ''
        };
        
        data[currentTab].push(newItem);
        input.value = '';
        this.renderList();
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
        // Placeholder for history tracking functionality
        rollHistory.push(result);
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
        
        // Add autocomplete for tags field
        if (fieldName === 'tags') {
            const datalistId = 'tags-datalist-' + Date.now();
            input.setAttribute('list', datalistId);
            
            const datalist = document.createElement('datalist');
            datalist.id = datalistId;
            
            // Get all unique tags from current tab
            const allTags = new Set();
            data[currentTab].forEach(item => {
                if (item.tags) {
                    const tags = item.tags.split(',').map(t => t.trim()).filter(t => t);
                    tags.forEach(tag => allTags.add(tag));
                }
            });
            
            // Create options for each tag
            Array.from(allTags).sort().forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                datalist.appendChild(option);
            });
            
            document.body.appendChild(datalist);
            
            // Clean up datalist when input is removed
            const originalRemove = input.remove.bind(input);
            input.remove = () => {
                datalist.remove();
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
            
            // Validate and constrain weight
            if (fieldName === 'weight') {
                newValue = Math.max(1, Math.min(100, parseInt(newValue) || 40));
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
                
                // Validate and set defaults
                newItem.name = newItem.name || '';
                newItem.tags = newItem.tags || '';
                newItem.reference = newItem.reference || '';
                newItem.weight = Math.max(1, Math.min(100, parseInt(newItem.weight) || 40));
                
                // Only create item if name is not empty or example text
                if (newItem.name && !newItem.name.includes('Example')) {
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
                    // Shift+Tab: previous cell
                    nextCell = currentIndex > 0 ? cells[currentIndex - 1] : null;
                } else {
                    // Tab: next cell
                    nextCell = currentIndex < cells.length - 1 ? cells[currentIndex + 1] : null;
                }
                
                if (nextCell) {
                    this.editCell(nextCell, row);
                }
            }
        });
    }
};

// Initialize app if running in a browser
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => UI.init());
}