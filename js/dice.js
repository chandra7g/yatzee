// dice.js — Dice creation, rolling, and hold management

/**
 * Create a fresh set of 5 dice.
 * Each die has a value (0 = not yet rolled) and a held flag.
 * @returns {{ value: number, held: boolean }[]}
 */
export function createDice() {
  return Array.from({ length: 5 }, () => ({ value: 0, held: false }));
}

/**
 * Roll all unheld dice (assign random 1–6).
 * Held dice keep their current value.
 * @param {{ value: number, held: boolean }[]} dice
 * @returns {{ value: number, held: boolean }[]} same array, mutated
 */
export function rollDice(dice) {
  for (const die of dice) {
    if (!die.held) {
      die.value = Math.floor(Math.random() * 6) + 1;
    }
  }
  return dice;
}

/**
 * Toggle the held state of a die at the given index.
 * @param {{ value: number, held: boolean }[]} dice
 * @param {number} index 0–4
 */
export function toggleHold(dice, index) {
  if (index >= 0 && index < dice.length) {
    dice[index].held = !dice[index].held;
  }
}

/**
 * Reset all dice to unheld.
 * @param {{ value: number, held: boolean }[]} dice
 */
export function resetHolds(dice) {
  for (const die of dice) {
    die.held = false;
  }
}

/**
 * Get plain number array of dice values (for scoring functions).
 * @param {{ value: number, held: boolean }[]} dice
 * @returns {number[]}
 */
export function getValues(dice) {
  return dice.map(d => d.value);
}
