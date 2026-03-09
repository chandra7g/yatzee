// combinations.js — Pure detection helpers for Yahtzee combinations

/**
 * Count occurrences of each face value.
 * @param {number[]} values — array of 5 die values (1–6)
 * @returns {Map<number, number>} face → count
 */
export function countByFace(values) {
  const counts = new Map();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return counts;
}

/**
 * Sum of all dice values.
 * @param {number[]} values
 * @returns {number}
 */
export function sumDice(values) {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * At least 3 dice show the same value.
 * @param {number[]} values
 * @returns {boolean}
 */
export function isThreeOfAKind(values) {
  const counts = countByFace(values);
  for (const c of counts.values()) {
    if (c >= 3) return true;
  }
  return false;
}

/**
 * At least 4 dice show the same value.
 * @param {number[]} values
 * @returns {boolean}
 */
export function isFourOfAKind(values) {
  const counts = countByFace(values);
  for (const c of counts.values()) {
    if (c >= 4) return true;
  }
  return false;
}

/**
 * Exactly 3 of one value and 2 of another (true Full House).
 * Note: A Yahtzee (5 of a kind) is NOT a natural full house.
 * @param {number[]} values
 * @returns {boolean}
 */
export function isFullHouse(values) {
  const counts = countByFace(values);
  const vals = [...counts.values()].sort();
  return vals.length === 2 && vals[0] === 2 && vals[1] === 3;
}

/**
 * Any 4 consecutive values among the dice.
 * Uses Set-based approach to handle duplicates correctly.
 * @param {number[]} values
 * @returns {boolean}
 */
export function isSmallStraight(values) {
  const unique = new Set(values);
  const patterns = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
  ];
  return patterns.some(p => p.every(v => unique.has(v)));
}

/**
 * Any 5 consecutive values (1-2-3-4-5 or 2-3-4-5-6).
 * @param {number[]} values
 * @returns {boolean}
 */
export function isLargeStraight(values) {
  const unique = new Set(values);
  if (unique.size < 5) return false;
  const patterns = [
    [1, 2, 3, 4, 5],
    [2, 3, 4, 5, 6],
  ];
  return patterns.some(p => p.every(v => unique.has(v)));
}

/**
 * All 5 dice show the same value.
 * @param {number[]} values
 * @returns {boolean}
 */
export function isYahtzee(values) {
  return values.every(v => v === values[0]);
}
