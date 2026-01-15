import { describe, it, expect } from 'vitest';

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
