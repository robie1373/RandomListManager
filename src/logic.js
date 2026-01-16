// src/logic.js
export const DiceEngine = {
    parseDice: (text, cleanResults = false) => {
        // Support optional surrounding parentheses before modifiers, e.g., "(3d6)x10".
        const diceRegex = /\(?((?:\d+))d((?:\d+))(?:\s*\)?\s*([+\-*x])\s*(\d+))?/gi;
        return text.replace(diceRegex, (match, count, sides, op, mod) => {
            let total = 0;
            for (let i = 0; i < parseInt(count); i++) {
                total += Math.floor(Math.random() * parseInt(sides)) + 1;
            }

            const operator = op ? op.toLowerCase() : null;
            if (operator && mod) {
                if (operator === '+') {
                    total += parseInt(mod);
                } else if (operator === '-') {
                    total -= parseInt(mod);
                } else if (operator === 'x' || operator === '*') {
                    total *= parseInt(mod);
                }
            }
            // Normalize negative results to minimum of 1
            total = Math.max(1, total);
            const normalizedOp = operator ? (operator === '*' ? 'x' : operator) : '';
            const notation = mod ? `${count}d${sides}${normalizedOp}${mod}` : `${count}d${sides}`;
            return cleanResults ? `${total}` : `${total} (${notation})`;
        });
    },

    pickWeightedItem: (list) => {
        if (!list || list.length === 0) return null;
        
        // Constrain weights between 0 and 100, default to 50
        const constrainWeight = (weight) => {
            const w = weight !== undefined && weight !== null ? weight : 50;
            return Math.max(0, Math.min(100, w));
        };
        
        const totalWeight = list.reduce((sum, item) => sum + constrainWeight(item.weight), 0);
        let random = Math.random() * totalWeight;
        for (const item of list) {
            const constrainedWeight = constrainWeight(item.weight);
            if (random < constrainedWeight) return item;
            random -= constrainedWeight;
        }
        return list[0];
    }
};

// --- UI Utility Functions ---

export const UIUtils = {
    /**
     * Format tab name for display (e.g., "items" -> "Item")
     */
    formatTabLabel: (tabName) => {
        if (!tabName) return '';
        return tabName.charAt(0).toUpperCase() + tabName.slice(1).slice(0, -1);
    },

    /**
     * Constrain weight between 0 and 100, default to 50
     */
    constrainWeight: (weight) => {
        const w = weight !== undefined && weight !== null ? weight : 50;
        return Math.max(0, Math.min(100, w));
    },

    /**
     * Create a normalized item with default values
     */
    createItem: (name, tags = '', reference = '', weight = 50) => ({
        name: name || '',
        tags: tags || '',
        reference: reference || '',
        weight: UIUtils.constrainWeight(weight),
        ref: '' // Legacy field for compatibility
    }),

    /**
     * Normalize an existing item to ensure all properties are present and constrained
     */
    normalizeItem: (item) => {
        if (!item || typeof item !== 'object') return null;
        return {
            name: item.name || '',
            tags: item.tags || '',
            reference: item.reference || '',
            weight: UIUtils.constrainWeight(item.weight),
            ref: item.ref || ''
        };
    },

    /**
     * Filter items by tags with OR/AND logic
     */
    filterItems: (items, selectedTags, filterLogic = 'OR') => {
        if (!items || items.length === 0) return [];
        if (!selectedTags || selectedTags.size === 0) return items;

        const tagSet = typeof selectedTags === 'string' ? new Set(selectedTags.split(',')) : selectedTags;
        
        return items.filter(item => {
            const itemTags = (item.tags || "").toLowerCase().split(',').map(t => t.trim());
            const activeFilters = Array.from(tagSet).map(t => t.toString().toLowerCase());
            
            return filterLogic === 'OR' 
                ? activeFilters.some(ft => itemTags.includes(ft)) 
                : activeFilters.every(ft => itemTags.includes(ft));
        });
    }
};