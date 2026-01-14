// src/logic.js
export const DiceEngine = {
    parseDice: (text) => {
        const diceRegex = /(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/gi;
        return text.replace(diceRegex, (match, count, sides, op, mod) => {
            let total = 0;
            for (let i = 0; i < parseInt(count); i++) {
                total += Math.floor(Math.random() * parseInt(sides)) + 1;
            }
            if (op && mod) {
                total = op === '+' ? total + parseInt(mod) : total - parseInt(mod);
            }
            return `${total} (${match})`;
        });
    },

    pickWeightedItem: (list) => {
        if (!list || list.length === 0) return null;
        const totalWeight = list.reduce((sum, item) => sum + (item.weight || 0), 0);
        let random = Math.random() * totalWeight;
        for (const item of list) {
            if (random < item.weight) return item;
            random -= item.weight;
        }
        return list[0];
    }
};