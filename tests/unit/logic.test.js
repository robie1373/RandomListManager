// tests/logic.test.js
import { describe, it, expect } from 'vitest';
import { DiceEngine } from '../../src/logic.js';

describe('DiceEngine Math', () => {
    it('calculates 1d1+10 as 11', () => {
        const result = DiceEngine.parseDice("Loot 1d1+10");
        expect(result).toBe("Loot 11 (1d1+10)");
    });

    it('calculates 2d1-1 as 1', () => {
        const result = DiceEngine.parseDice("2d1-1");
        expect(result).toBe("1 (2d1-1)");
    });
});

describe('Weight Logic', () => {
    it('always picks the only item in a list', () => {
        const list = [{ name: "Epic Sword", weight: 100 }];
        const picked = DiceEngine.pickWeightedItem(list);
        expect(picked.name).toBe("Epic Sword");
    });
});