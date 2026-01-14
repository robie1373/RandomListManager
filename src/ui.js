import { DiceEngine } from './logic.js';

// --- Application State ---
const STORAGE_KEY = 'myList_v1.8.2_';
let currentTab = 'items';
let filterLogic = 'OR';
let selectedTags = new Set();
let rollHistory = [];

let data = {
    items: JSON.parse(localStorage.getItem(STORAGE_KEY + 'items')) || [],
    encounters: JSON.parse(localStorage.getItem(STORAGE_KEY + 'encounters')) || [],
    weapons: JSON.parse(localStorage.getItem(STORAGE_KEY + 'weapons')) || []
};

// --- Core UI Functions ---

export const UI = {
    init() {
        this.bindEvents();
        this.switchTab('items');
        this.renderList();
    },

    bindEvents() {
        // Main Action Buttons
        document.getElementById('rollBtn').addEventListener('click', () => this.handleRoll());
        document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());
        
        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
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
    },

    switchTab(tab) {
        currentTab = tab;
        // Update CSS classes for active tabs
        document.querySelectorAll('.tab-btn').forEach(btn => 
            btn.classList.toggle('active', btn.dataset.tab === tab)
        );
        
        // Contextual updates (headers, input visibility)
        const navContext = document.getElementById('navContext');
        navContext.innerText = tab;
        
        // Update header and navbar background color to match tab color
        const colorMap = {
            'items': '#cb4b16',      // orange
            'weapons': '#6c71c4',    // violet
            'encounters': '#859900'  // green
        };
        const tabColor = colorMap[tab] || '#2aa198'; // cyan fallback
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
        // Placeholder for tag cloud functionality
        // This would render a cloud of tags for filtering
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
        const filtered = this.getFilteredList();
        const nameHeader = document.getElementById('tableNameHeader');
        
        // Update header to reflect current tab
        const tabLabel = currentTab.charAt(0).toUpperCase() + currentTab.slice(1).slice(0, -1); // Remove 's'
        nameHeader.textContent = tabLabel;
        
        if (filtered.length === 0) {
            // Show example row when table is empty
            body.innerHTML = `
                <tr class="example-row">
                    <td class="editable" data-field="name">Example ${tabLabel}</td>
                    <td class="editable" data-field="tags">example-tag</td>
                    <td class="editable" data-field="reference">Reference</td>
                    <td class="editable" data-field="weight">50</td>
                    <td><button class="btn-delete" disabled>×</button></td>
                </tr>
            `;
        } else {
            body.innerHTML = filtered.map((item, index) => `
                <tr data-item-index="${index}">
                    <td class="editable" data-field="name">${item.name}</td>
                    <td class="editable" data-field="tags">${item.tags || ''}</td>
                    <td class="editable" data-field="reference">${item.reference || ''}</td>
                    <td class="editable" data-field="weight">${item.weight || 1}</td>
                    <td><button class="btn-delete" data-index="${index}">×</button></td>
                </tr>
            `).join('');
        }

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
        
        // Replace cell content with input
        cell.classList.add('editing');
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
        
        let escapePressed = false;
        
        // Save on blur or Enter
        const saveEdit = () => {
            if (input.parentElement !== cell) return; // Already removed
            if (escapePressed) return; // Don't save if escape was pressed
            
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