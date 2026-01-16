import { describe, it, expect } from 'vitest';
import { DiceEngine } from '../../src/logic.js';

// Re-implement sanitization functions for testing
function sanitizeString(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.trim().substring(0, maxLength);
}

function sanitizeWeight(value) {
    const WEIGHT_DEFAULT = 50;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        return WEIGHT_DEFAULT;
    }
    return Math.max(0, Math.min(100, parsed));
}

function preventCSVInjection(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (/^[=+\-@]/.test(trimmed)) {
        return "'" + trimmed;
    }
    return value;
}

// Mock filtering function
function filterBySearch(items, searchTerm) {
    if (!searchTerm) return items;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter(item => {
        const name = (item.name || '').toLowerCase();
        const tags = (item.tags || '').toLowerCase();
        const reference = (item.reference || '').toLowerCase();
        return name.includes(lowerSearchTerm) || tags.includes(lowerSearchTerm) || reference.includes(lowerSearchTerm);
    });
}

describe('sanitizeString', () => {
    it('should trim whitespace', () => {
        expect(sanitizeString('  hello  ', 100)).toBe('hello');
        expect(sanitizeString('\nworld\t', 100)).toBe('world');
    });

    it('should truncate to max length', () => {
        expect(sanitizeString('hello world', 5)).toBe('hello');
        expect(sanitizeString('test', 2)).toBe('te');
    });

    it('should handle empty strings', () => {
        expect(sanitizeString('', 100)).toBe('');
        expect(sanitizeString('   ', 100)).toBe('');
    });

    it('should handle non-string inputs', () => {
        expect(sanitizeString(null, 100)).toBe('');
        expect(sanitizeString(undefined, 100)).toBe('');
        expect(sanitizeString(123, 100)).toBe('');
    });

    it('should preserve internal spaces', () => {
        expect(sanitizeString('hello world test', 100)).toBe('hello world test');
    });

    it('should handle exact length match', () => {
        expect(sanitizeString('hello', 5)).toBe('hello');
    });
});

describe('sanitizeWeight', () => {
    it('should parse valid integers', () => {
        expect(sanitizeWeight('50')).toBe(50);
        expect(sanitizeWeight('0')).toBe(0);
        expect(sanitizeWeight('100')).toBe(100);
    });

    it('should clamp values to 0-100 range', () => {
        expect(sanitizeWeight('-10')).toBe(0);
        expect(sanitizeWeight('150')).toBe(100);
        expect(sanitizeWeight('-1')).toBe(0);
        expect(sanitizeWeight('999')).toBe(100);
    });

    it('should return default for invalid input', () => {
        expect(sanitizeWeight('abc')).toBe(50);
        expect(sanitizeWeight('12.5')).toBe(12); // parseInt truncates
        expect(sanitizeWeight('')).toBe(50);
    });

    it('should handle whitespace around numbers', () => {
        expect(sanitizeWeight('  50  ')).toBe(50);
        expect(sanitizeWeight('\t25\n')).toBe(25);
    });

    it('should handle null/undefined', () => {
        expect(sanitizeWeight(null)).toBe(50);
        expect(sanitizeWeight(undefined)).toBe(50);
    });
});

describe('preventCSVInjection', () => {
    it('should prefix formula characters with single quote', () => {
        expect(preventCSVInjection('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
        expect(preventCSVInjection('+1000')).toBe("'+1000");
        expect(preventCSVInjection('-500')).toBe("'-500");
        expect(preventCSVInjection('@attacker')).toBe("'@attacker");
    });

    it('should not modify normal text', () => {
        expect(preventCSVInjection('normal text')).toBe('normal text');
        expect(preventCSVInjection('item 123')).toBe('item 123');
        // Formula text should be prefixed with single quote
        expect(preventCSVInjection('=formula text')).toBe("'=formula text");
    });

    it('should handle whitespace before formula characters', () => {
        expect(preventCSVInjection('  =formula')).toBe("'=formula");
        expect(preventCSVInjection('\t+value')).toBe("'+value");
    });

    it('should not modify non-string input', () => {
        expect(preventCSVInjection(null)).toBe(null);
        expect(preventCSVInjection(undefined)).toBe(undefined);
        expect(preventCSVInjection(123)).toBe(123);
    });
});

describe('filterBySearch', () => {
    const testItems = [
        { name: 'Sword', tags: 'weapon, sharp', reference: 'DBR 10' },
        { name: 'Shield', tags: 'weapon, armor', reference: 'DBR 20' },
        { name: 'Potion', tags: 'consumable, healing', reference: 'DBR 30' },
        { name: 'Treasure', tags: 'gold, gems', reference: 'DBR 40' }
    ];

    it('should return all items when search term is empty', () => {
        expect(filterBySearch(testItems, '')).toEqual(testItems);
        expect(filterBySearch(testItems, null)).toEqual(testItems);
    });

    it('should filter by item name (case-insensitive)', () => {
        const result = filterBySearch(testItems, 'sword');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Sword');
    });

    it('should filter by tags (case-insensitive)', () => {
        const result = filterBySearch(testItems, 'weapon');
        expect(result).toHaveLength(2);
        expect(result.some(i => i.name === 'Sword')).toBe(true);
        expect(result.some(i => i.name === 'Shield')).toBe(true);
    });

    it('should filter by reference (case-insensitive)', () => {
        const result = filterBySearch(testItems, 'dbr 10');
        expect(result).toHaveLength(1);
        expect(result[0].reference).toBe('DBR 10');
    });

    it('should match partial text', () => {
        const result = filterBySearch(testItems, 'pot');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Potion');
    });

    it('should return empty array when no matches', () => {
        const result = filterBySearch(testItems, 'nonexistent');
        expect(result).toEqual([]);
    });

    it('should handle empty items array', () => {
        expect(filterBySearch([], 'test')).toEqual([]);
    });

    it('should filter items with missing optional fields', () => {
        const items = [
            { name: 'Item1', tags: '', reference: '' },
            { name: 'test2', tags: 'tag', reference: 'ref' }
        ];
        const result = filterBySearch(items, 'test');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('test2');
    });

    it('should match multiple field sources', () => {
        const items = [
            { name: 'Scroll', tags: 'magic, paper', reference: 'TOME 5' }
        ];
        const result = filterBySearch(items, 'magic');
        expect(result).toHaveLength(1);
    });

    it('should be case-insensitive for all fields', () => {
        const result = filterBySearch(testItems, 'SHIELD');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Shield');
    });
});

describe('parsePoolTag', () => {
    // Mock tabs and data for pool tag testing
    const mockTabs = [
        { id: 'loot', name: 'Loot' },
        { id: 'encounters', name: 'Encounters' },
        { id: 'goblin-db', name: 'Goblin DB' }
    ];

    function parsePoolTag(tagsStr) {
        // Re-implement for testing
        if (!tagsStr) return null;
        const tags = tagsStr.split(',').map(t => t.trim());
        for (const tag of tags) {
            if (tag.startsWith('pool=')) {
                const poolSpec = tag.substring(5); // Remove 'pool='
                const parts = poolSpec.split('::');
                if (parts.length < 2) continue; // Must have at least one tab and a filter
                
                const candidateTabNames = parts.slice(0, -1).map(p => p.trim().toLowerCase());
                const filterName = parts[parts.length - 1].trim();
                const filterTag = `pool=${filterName}`.toLowerCase();
                
                // Find matching target tabs
                const targetTabs = mockTabs.filter(tab => 
                    candidateTabNames.includes(tab.name.toLowerCase())
                );
                
                return { targetTabs, filterTag };
            }
        }
        return null;
    }

    it('should parse pool tag with single target tab', () => {
        const result = parsePoolTag('pool=Loot::loot-common');
        expect(result).not.toBeNull();
        expect(result.filterTag).toBe('pool=loot-common');
        expect(result.targetTabs).toHaveLength(1);
        expect(result.targetTabs[0].name).toBe('Loot');
    });

    it('should parse pool tag with multiple target tabs', () => {
        const result = parsePoolTag('pool=Loot::Encounters::loot-rare');
        expect(result).not.toBeNull();
        expect(result.filterTag).toBe('pool=loot-rare');
        expect(result.targetTabs).toHaveLength(2);
        expect(result.targetTabs[0].name).toBe('Loot');
        expect(result.targetTabs[1].name).toBe('Encounters');
    });

    it('should be case-insensitive for tab names', () => {
        const result = parsePoolTag('pool=loot::goblin db::treasure-hoard');
        expect(result).not.toBeNull();
        expect(result.filterTag).toBe('pool=treasure-hoard');
        expect(result.targetTabs).toHaveLength(2);
        expect(result.targetTabs[0].name).toBe('Loot');
        expect(result.targetTabs[1].name).toBe('Goblin DB');
    });

    it('should return null if no pool tag', () => {
        const result = parsePoolTag('unique, common');
        expect(result).toBeNull();
    });

    it('should return null for malformed pool tag (missing tabs)', () => {
        const result = parsePoolTag('pool=loot-only');
        expect(result).toBeNull();
    });

    it('should handle pool tag mixed with other tags', () => {
        const result = parsePoolTag('unique, pool=Loot::goblin-db, limit=3');
        expect(result).not.toBeNull();
        expect(result.filterTag).toBe('pool=goblin-db');
        expect(result.targetTabs).toHaveLength(1);
        expect(result.targetTabs[0].name).toBe('Loot');
    });

    it('should return empty target tabs if no matching tabs', () => {
        const result = parsePoolTag('pool=NonExistent::filter-name');
        expect(result).not.toBeNull();
        expect(result.targetTabs).toHaveLength(0);
    });
});

describe('parseDice cleanResults with references', () => {
    it('should omit dice notation when cleanResults is true', () => {
        const result = DiceEngine.parseDice("Sword 1d1+5", true);
        expect(result).toMatch(/^Sword \d+$/);
        expect(result).not.toContain("(");
    });

    it('should include dice notation when cleanResults is false', () => {
        const result = DiceEngine.parseDice("Sword 1d1+5", false);
        expect(result).toMatch(/Sword \d+ \(1d1\+5\)/);
    });

    it('should omit dice notation but keep text when cleanResults is true', () => {
        const result = DiceEngine.parseDice("Sword 2d4", true);
        expect(result).toMatch(/^Sword \d+$/);
        expect(result).not.toContain("(");
        expect(result).not.toContain(")");
    });

    it('should include both dice notation and surrounding text when cleanResults is false', () => {
        const result = DiceEngine.parseDice("Sword 2d4 item", false);
        expect(result).toMatch(/Sword \d+ \(2d4\) item/);
    });

    it('should handle item with just dice when cleanResults is true', () => {
        const result = DiceEngine.parseDice("1d1+5", true);
        expect(result).toMatch(/^\d+$/);
        expect(result).not.toContain("(");
    });

    it('should handle no dice expressions with cleanResults', () => {
        const result = DiceEngine.parseDice("Sword", true);
        expect(result).toBe("Sword");
        
        const result2 = DiceEngine.parseDice("Sword", false);
        expect(result2).toBe("Sword");
    });
});

describe('failing test', () => {
    it('should fail', () => {
        expect(1).toEqual(2);
    });

});
