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
    },

    switchTab(tab) {
        currentTab = tab;
        // Update CSS classes for active tabs
        document.querySelectorAll('.tab-btn').forEach(btn => 
            btn.classList.toggle('active', btn.dataset.tab === tab)
        );
        
        // Contextual updates (headers, input visibility)
        document.getElementById('navContext').innerText = tab;
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
        const filtered = this.getFilteredList();
        
        body.innerHTML = filtered.map((item, index) => `
            <tr>
                <td>${item.name}</td>
                <td>${item.tags}</td>
                <td>${item.weight}</td>
                <td><button class="btn-delete" data-index="${index}">×</button></td>
            </tr>
        `).join('');

        localStorage.setItem(STORAGE_KEY + currentTab, JSON.stringify(data[currentTab]));
    },

    copyToClipboard() {
        const text = document.getElementById('result').innerText;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalText = btn.innerText;
            btn.innerText = '✅ Copied!';
            setTimeout(() => btn.innerText = originalText, 1500);
        });
    }
};

// Initialize app if running in a browser
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => UI.init());
}