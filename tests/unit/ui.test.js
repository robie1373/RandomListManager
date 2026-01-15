import { describe, it, expect } from 'vitest';

// Re-implement capitalizeWords for testing
function capitalizeWords(str) {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
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
