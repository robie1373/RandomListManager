import { describe, it, expect } from 'vitest';

// Re-implement capitalizeWords for testing
function capitalizeWords(str) {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Re-implement stripReferenceNumber for testing
function stripReferenceNumber(ref) {
    if (!ref) return '';
    // Strip space followed by number(s) at the end (e.g., "DBR 123" -> "DBR")
    // But keep references without spaces (e.g., "DBR2" stays "DBR2")
    return ref.trim().replace(/\s+\d+$/, '');
}

describe('capitalizeWords', () => {
    it('should capitalize first letter of each word', () => {
        expect(capitalizeWords('hello world')).toBe('Hello World');
        expect(capitalizeWords('test item name')).toBe('Test Item Name');
    });

    it('should handle single word', () => {
        expect(capitalizeWords('hello')).toBe('Hello');
    });

    it('should handle already capitalized text', () => {
        expect(capitalizeWords('Hello World')).toBe('Hello World');
    });

    it('should handle mixed case', () => {
        expect(capitalizeWords('hELLo wOrLD')).toBe('Hello World');
    });

    it('should handle empty string', () => {
        expect(capitalizeWords('')).toBe('');
    });

    it('should handle multiple spaces', () => {
        expect(capitalizeWords('hello  world')).toBe('Hello  World');
    });

    it('should handle text with punctuation', () => {
        expect(capitalizeWords('hello, world!')).toBe('Hello, World!');
    });

    it('should handle numbers', () => {
        expect(capitalizeWords('item 123')).toBe('Item 123');
    });

    it('should return empty string for non-string input', () => {
        expect(capitalizeWords(null)).toBe('');
        expect(capitalizeWords(undefined)).toBe('');
    });
});

describe('stripReferenceNumber', () => {
    it('should strip space followed by number at end', () => {
        expect(stripReferenceNumber('DBR 123')).toBe('DBR');
        expect(stripReferenceNumber('Core 456')).toBe('Core');
        expect(stripReferenceNumber('Book 1')).toBe('Book');
    });

    it('should keep references without spaces before numbers', () => {
        expect(stripReferenceNumber('DBR2')).toBe('DBR2');
        expect(stripReferenceNumber('p.42')).toBe('p.42');
        expect(stripReferenceNumber('v1.5')).toBe('v1.5');
    });

    it('should handle multiple spaces before number', () => {
        expect(stripReferenceNumber('DBR  123')).toBe('DBR');
        expect(stripReferenceNumber('Book   456')).toBe('Book');
    });

    it('should handle multi-digit numbers', () => {
        expect(stripReferenceNumber('DBR 12345')).toBe('DBR');
        expect(stripReferenceNumber('Page 999')).toBe('Page');
    });

    it('should not strip numbers in the middle', () => {
        expect(stripReferenceNumber('DBR 123 Extra')).toBe('DBR 123 Extra');
        expect(stripReferenceNumber('Book 2 Chapter')).toBe('Book 2 Chapter');
    });

    it('should handle empty or null input', () => {
        expect(stripReferenceNumber('')).toBe('');
        expect(stripReferenceNumber(null)).toBe('');
        expect(stripReferenceNumber(undefined)).toBe('');
    });

    it('should keep references without numbers', () => {
        expect(stripReferenceNumber('DBR')).toBe('DBR');
        expect(stripReferenceNumber('Core Rules')).toBe('Core Rules');
    });

    it('should handle trailing whitespace', () => {
        expect(stripReferenceNumber('DBR 123 ')).toBe('DBR');
        expect(stripReferenceNumber('Book 42  ')).toBe('Book');
    });
});
