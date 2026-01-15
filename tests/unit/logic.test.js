// tests/logic.test.js
import { describe, it, expect } from 'vitest';
import { DiceEngine, UIUtils } from '../../src/logic.js';

describe('DiceEngine - parseDice', () => {
    it('calculates 1d1+10 as 11', () => {
        const result = DiceEngine.parseDice("Loot 1d1+10");
        expect(result).toBe("Loot 11 (1d1+10)");
    });

    it('calculates 2d1-1 as 1', () => {
        const result = DiceEngine.parseDice("2d1-1");
        expect(result).toBe("1 (2d1-1)");
    });

    it('handles multiple dice expressions in text', () => {
        const result = DiceEngine.parseDice("Roll 2d4 and 1d6+2");
        expect(result).toMatch(/Roll \d+ \(2d4\) and \d+ \(1d6\+2\)/);
    });

    it('handles plain dice notation without modifiers', () => {
        const result = DiceEngine.parseDice("2d4");
        expect(result).toMatch(/\d+ \(2d4\)/);
    });

    it('returns unmodified text with no dice notation', () => {
        const result = DiceEngine.parseDice("Just a regular item");
        expect(result).toBe("Just a regular item");
    });

    it('handles subtraction modifier', () => {
        const result = DiceEngine.parseDice("1d10-3");
        expect(result).toMatch(/\d+ \(1d10-3\)/);
    });

    it('handles multiplication modifier', () => {
        const result = DiceEngine.parseDice("2d6x10");
        const match = result.match(/^(\d+) \(2d6x10\)$/);
        expect(match).not.toBeNull();

        const value = parseInt(match[1], 10);
        expect(value % 10).toBe(0);
        expect(value).toBeGreaterThanOrEqual(20);
        expect(value).toBeLessThanOrEqual(120);
    });

    it('handles multiplication when wrapped in parentheses', () => {
        const result = DiceEngine.parseDice("(3d6)x10");
        const match = result.match(/^(\d+) \(3d6x10\)$/);
        expect(match).not.toBeNull();

        const value = parseInt(match[1], 10);
        expect(value % 10).toBe(0);
        expect(value).toBeGreaterThanOrEqual(30);
        expect(value).toBeLessThanOrEqual(180);
    });

    it('handles multiple dice (3d6)', () => {
        const result = DiceEngine.parseDice("3d6");
        expect(result).toMatch(/\d+ \(3d6\)/);
    });

    it('handles whitespace around operators', () => {
        const result = DiceEngine.parseDice("1d6 + 5");
        expect(result).toMatch(/\d+ \(1d6\+5\)/);
    });

    it('case-insensitive for dice notation', () => {
        const result = DiceEngine.parseDice("2D4");
        expect(result).toMatch(/\d+ \(2d4\)/);
    });
});

describe('DiceEngine - pickWeightedItem', () => {
    it('returns null for empty list', () => {
        const list = [];
        const picked = DiceEngine.pickWeightedItem(list);
        expect(picked).toBeNull();
    });

    it('returns null for null/undefined list', () => {
        expect(DiceEngine.pickWeightedItem(null)).toBeNull();
        expect(DiceEngine.pickWeightedItem(undefined)).toBeNull();
    });

    it('always picks the only item in a list', () => {
        const list = [{ name: "Epic Sword", weight: 100 }];
        const picked = DiceEngine.pickWeightedItem(list);
        expect(picked.name).toBe("Epic Sword");
    });

    it('defaults to weight 50 for items without weight property', () => {
        const list = [
            { name: "Item A" },
            { name: "Item B" }
        ];
        
        // With equal default weights, should pick one of them
        const picked = DiceEngine.pickWeightedItem(list);
        expect(['Item A', 'Item B']).toContain(picked.name);
    });

    it('constrains weights between 0 and 100', () => {
        const list = [
            { name: "Low", weight: -50 },  // Should be clamped to 0
            { name: "High", weight: 200 }  // Should be clamped to 100
        ];
        
        // High weight item should have much higher chance
        let highCount = 0;
        for (let i = 0; i < 100; i++) {
            const picked = DiceEngine.pickWeightedItem(list);
            if (picked.name === "High") highCount++;
        }
        
        // With High clamped to 100 and Low to 0, High should win every time
        expect(highCount).toBe(100);
    });

    it('handles items with weight 0 by excluding them from rolls', () => {
        const list = [
            { name: "Zero Weight", weight: 0 },
            { name: "Normal Weight", weight: 50 }
        ];
        
        // With weight 0 excluded, should never pick the zero-weight item
        let zeroCount = 0;
        for (let i = 0; i < 500; i++) {
            const picked = DiceEngine.pickWeightedItem(list);
            if (picked.name === "Zero Weight") zeroCount++;
        }
        
        // With zero probability, it should not be selected
        expect(zeroCount).toBe(0);
    });

    it('respects weight distribution across multiple items', () => {
        const list = [
            { name: "Common", weight: 50 },
            { name: "Uncommon", weight: 30 },
            { name: "Rare", weight: 20 }
        ];
        
        const counts = { Common: 0, Uncommon: 0, Rare: 0 };
        const iterations = 1000;
        
        for (let i = 0; i < iterations; i++) {
            const picked = DiceEngine.pickWeightedItem(list);
            counts[picked.name]++;
        }
        
        // Common should be ~50% (within variance)
        expect(counts.Common).toBeGreaterThan(400);
        expect(counts.Common).toBeLessThan(600);
        
        // Uncommon should be ~30%
        expect(counts.Uncommon).toBeGreaterThan(200);
        expect(counts.Uncommon).toBeLessThan(400);
        
        // Rare should be ~20%
        expect(counts.Rare).toBeGreaterThan(100);
        expect(counts.Rare).toBeLessThan(300);
    });

    it('handles single item with default weight', () => {
        const list = [{ name: "Only Item" }];
        const picked = DiceEngine.pickWeightedItem(list);
        expect(picked.name).toBe("Only Item");
    });

    it('mixed explicit and default weights', () => {
        const list = [
            { name: "Explicit", weight: 80 },
            { name: "Default", weight: undefined }
        ];
        
        // Explicit (80) should win over Default (40) more often
        let explicitCount = 0;
        for (let i = 0; i < 100; i++) {
            const picked = DiceEngine.pickWeightedItem(list);
            if (picked.name === "Explicit") explicitCount++;
        }
        
        // Explicit should win ~67% of the time (80/120)
        expect(explicitCount).toBeGreaterThan(50);
    });
});

describe('UIUtils - formatTabLabel', () => {
    it('formats "items" to "Item"', () => {
        expect(UIUtils.formatTabLabel('items')).toBe('Item');
    });

    it('formats "weapons" to "Weapon"', () => {
        expect(UIUtils.formatTabLabel('weapons')).toBe('Weapon');
    });

    it('formats "encounters" to "Encounter"', () => {
        expect(UIUtils.formatTabLabel('encounters')).toBe('Encounter');
    });

    it('handles empty string', () => {
        expect(UIUtils.formatTabLabel('')).toBe('');
    });

    it('handles null/undefined', () => {
        expect(UIUtils.formatTabLabel(null)).toBe('');
        expect(UIUtils.formatTabLabel(undefined)).toBe('');
    });

    it('handles single character', () => {
        expect(UIUtils.formatTabLabel('a')).toBe('A');
    });
});

describe('UIUtils - constrainWeight', () => {
    it('defaults to 50 when weight is undefined', () => {
        expect(UIUtils.constrainWeight(undefined)).toBe(50);
    });

    it('defaults to 50 when weight is null', () => {
        expect(UIUtils.constrainWeight(null)).toBe(50);
    });

    it('clamps negative weights to 0', () => {
        expect(UIUtils.constrainWeight(-50)).toBe(0);
        expect(UIUtils.constrainWeight(-1)).toBe(0);
    });

    it('keeps weight 0 unchanged', () => {
        expect(UIUtils.constrainWeight(0)).toBe(0);
    });

    it('keeps valid weights unchanged', () => {
        expect(UIUtils.constrainWeight(1)).toBe(1);
        expect(UIUtils.constrainWeight(50)).toBe(50);
        expect(UIUtils.constrainWeight(100)).toBe(100);
    });

    it('clamps weights above 100 to 100', () => {
        expect(UIUtils.constrainWeight(101)).toBe(100);
        expect(UIUtils.constrainWeight(500)).toBe(100);
    });
});

describe('UIUtils - createItem', () => {
    it('creates item with just name', () => {
        const item = UIUtils.createItem('Test Item');
        expect(item).toEqual({
            name: 'Test Item',
            tags: '',
            reference: '',
            weight: 50,
            ref: ''
        });
    });

    it('creates item with all properties', () => {
        const item = UIUtils.createItem('Sword', 'weapon,rare', 'p.42', 75);
        expect(item).toEqual({
            name: 'Sword',
            tags: 'weapon,rare',
            reference: 'p.42',
            weight: 75,
            ref: ''
        });
    });

    it('constrains weight in created item', () => {
        const item = UIUtils.createItem('Heavy', '', '', 250);
        expect(item.weight).toBe(100);
    });

    it('handles empty name', () => {
        const item = UIUtils.createItem('');
        expect(item.name).toBe('');
    });

    it('clamps negative weight to 0', () => {
        const item = UIUtils.createItem('Test', '', '', -10);
        expect(item.weight).toBe(0);
    });
});

describe('UIUtils - normalizeItem', () => {
    it('normalizes complete item', () => {
        const input = { name: 'Item', tags: 'tag', reference: 'ref', weight: 50, ref: 'legacy' };
        const output = UIUtils.normalizeItem(input);
        expect(output).toEqual({
            name: 'Item',
            tags: 'tag',
            reference: 'ref',
            weight: 50,
            ref: 'legacy'
        });
    });

    it('fills missing properties with defaults', () => {
        const input = { name: 'Item' };
        const output = UIUtils.normalizeItem(input);
        expect(output).toEqual({
            name: 'Item',
            tags: '',
            reference: '',
            weight: 50,
            ref: ''
        });
    });

    it('constrains weight during normalization', () => {
        const input = { name: 'Item', weight: 500 };
        const output = UIUtils.normalizeItem(input);
        expect(output.weight).toBe(100);
    });

    it('handles null/undefined input', () => {
        expect(UIUtils.normalizeItem(null)).toBeNull();
        expect(UIUtils.normalizeItem(undefined)).toBeNull();
    });

    it('handles non-object input', () => {
        expect(UIUtils.normalizeItem('string')).toBeNull();
        expect(UIUtils.normalizeItem(123)).toBeNull();
    });

    it('preserves all properties', () => {
        const input = { name: 'Test', tags: 'a,b', reference: 'p.1', weight: 1, ref: 'old' };
        const output = UIUtils.normalizeItem(input);
        expect(output).toEqual(input);
    });
});

describe('UIUtils - filterItems', () => {
    const testItems = [
        { name: 'Sword', tags: 'weapon, rare' },
        { name: 'Shield', tags: 'armor' },
        { name: 'Axe', tags: 'weapon' },
        { name: 'Helmet', tags: 'armor, rare' }
    ];

    it('returns all items when no tags selected', () => {
        const result = UIUtils.filterItems(testItems, new Set());
        expect(result).toEqual(testItems);
    });

    it('filters with OR logic (default)', () => {
        const result = UIUtils.filterItems(testItems, new Set(['weapon', 'armor']), 'OR');
        expect(result.length).toBe(4); // All items have either weapon or armor
    });

    it('filters with AND logic', () => {
        const result = UIUtils.filterItems(testItems, new Set(['weapon', 'rare']), 'AND');
        expect(result.length).toBe(1); // Only Sword has both
        expect(result[0].name).toBe('Sword');
    });

    it('filters single tag with OR logic', () => {
        const result = UIUtils.filterItems(testItems, new Set(['rare']), 'OR');
        expect(result.length).toBe(2);
        expect(result.map(i => i.name)).toEqual(['Sword', 'Helmet']);
    });

    it('handles case-insensitive tag matching', () => {
        const result = UIUtils.filterItems(testItems, new Set(['WEAPON']), 'OR');
        expect(result.length).toBe(2);
        expect(result.map(i => i.name)).toEqual(['Sword', 'Axe']);
    });

    it('handles whitespace in tags', () => {
        const result = UIUtils.filterItems(testItems, new Set(['rare']), 'OR');
        // Should match "rare" despite whitespace in ' rare'
        expect(result.length).toBe(2);
    });

    it('returns empty array for empty items list', () => {
        const result = UIUtils.filterItems([], new Set(['weapon']), 'OR');
        expect(result).toEqual([]);
    });

    it('returns empty array for null items', () => {
        const result = UIUtils.filterItems(null, new Set(['weapon']), 'OR');
        expect(result).toEqual([]);
    });

    it('handles items without tags property', () => {
        const items = [{ name: 'Item' }, { name: 'Tagged', tags: 'tag' }];
        const result = UIUtils.filterItems(items, new Set(['tag']), 'OR');
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Tagged');
    });

    it('accepts string as selectedTags parameter', () => {
        const result = UIUtils.filterItems(testItems, 'weapon', 'OR');
        expect(result.length).toBe(2);
        expect(result.map(i => i.name)).toEqual(['Sword', 'Axe']);
    });

    it('no match returns empty array', () => {
        const result = UIUtils.filterItems(testItems, new Set(['nonexistent']), 'OR');
        expect(result).toEqual([]);
    });
});