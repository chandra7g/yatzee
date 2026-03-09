// scoring.js — Scoring engine with full Joker rule support

import {
  countByFace,
  sumDice,
  isThreeOfAKind,
  isFourOfAKind,
  isFullHouse,
  isSmallStraight,
  isLargeStraight,
  isYahtzee,
} from './combinations.js';

// ===== Category constants =====

export const CATEGORIES = {
  ones:          'ones',
  twos:          'twos',
  threes:        'threes',
  fours:         'fours',
  fives:         'fives',
  sixes:         'sixes',
  threeOfAKind:  'threeOfAKind',
  fourOfAKind:   'fourOfAKind',
  fullHouse:     'fullHouse',
  smallStraight: 'smallStraight',
  largeStraight: 'largeStraight',
  yahtzee:       'yahtzee',
  chance:        'chance',
};

export const UPPER_CATEGORIES = [
  CATEGORIES.ones,
  CATEGORIES.twos,
  CATEGORIES.threes,
  CATEGORIES.fours,
  CATEGORIES.fives,
  CATEGORIES.sixes,
];

export const LOWER_CATEGORIES = [
  CATEGORIES.threeOfAKind,
  CATEGORIES.fourOfAKind,
  CATEGORIES.fullHouse,
  CATEGORIES.smallStraight,
  CATEGORIES.largeStraight,
  CATEGORIES.yahtzee,
  CATEGORIES.chance,
];

export const ALL_CATEGORIES = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES];

/** Map upper-section category to the face value it counts */
const UPPER_FACE_MAP = {
  ones: 1,
  twos: 2,
  threes: 3,
  fours: 4,
  fives: 5,
  sixes: 6,
};

/** Map a face value (1–6) to its upper-section category key */
const FACE_TO_UPPER = {
  1: 'ones',
  2: 'twos',
  3: 'threes',
  4: 'fours',
  5: 'fives',
  6: 'sixes',
};

// ===== Normal scoring (no Joker logic) =====

/**
 * Compute the raw score for a category under normal rules.
 * @param {number[]} values — 5 die values
 * @param {string} category — category key
 * @returns {number}
 */
export function scoreCategory(values, category) {
  // Upper section
  if (UPPER_FACE_MAP[category] !== undefined) {
    const face = UPPER_FACE_MAP[category];
    return values.filter(v => v === face).length * face;
  }

  switch (category) {
    case CATEGORIES.threeOfAKind:
      return isThreeOfAKind(values) ? sumDice(values) : 0;
    case CATEGORIES.fourOfAKind:
      return isFourOfAKind(values) ? sumDice(values) : 0;
    case CATEGORIES.fullHouse:
      return isFullHouse(values) ? 25 : 0;
    case CATEGORIES.smallStraight:
      return isSmallStraight(values) ? 30 : 0;
    case CATEGORIES.largeStraight:
      return isLargeStraight(values) ? 40 : 0;
    case CATEGORIES.yahtzee:
      return isYahtzee(values) ? 50 : 0;
    case CATEGORIES.chance:
      return sumDice(values);
    default:
      return 0;
  }
}

// ===== Joker-aware available categories =====

/**
 * Get all categories the player is allowed to choose, with their scores.
 * Implements the complete forced Joker rule.
 *
 * @param {number[]} values — 5 die values
 * @param {Object} scorecard — { ones: number|null, ..., yahtzee: number|null }
 * @returns {{ available: Map<string, number>, yahtzeeBonus: boolean }}
 *   available: Map of category → score the player may choose from
 *   yahtzeeBonus: true if a +100 Yahtzee bonus should be awarded this turn
 */
export function getAvailableCategories(values, scorecard) {
  const yahtzeeRolled = isYahtzee(values);
  let yahtzeeBonus = false;

  // --- Non-Yahtzee roll: normal rules ---
  if (!yahtzeeRolled) {
    const available = new Map();
    for (const cat of ALL_CATEGORIES) {
      if (scorecard[cat] === null) {
        available.set(cat, scoreCategory(values, cat));
      }
    }
    return { available, yahtzeeBonus: false };
  }

  // --- Yahtzee rolled ---

  // Case 1: Yahtzee box is empty → can score 50 there (plus normal options)
  if (scorecard[CATEGORIES.yahtzee] === null) {
    const available = new Map();
    for (const cat of ALL_CATEGORIES) {
      if (scorecard[cat] === null) {
        available.set(cat, scoreCategory(values, cat));
      }
    }
    return { available, yahtzeeBonus: false };
  }

  // Case 2: Yahtzee box already filled with 50 → award +100 bonus
  if (scorecard[CATEGORIES.yahtzee] === 50) {
    yahtzeeBonus = true;
  }
  // Case 3: Yahtzee box filled with 0 → no bonus, but forced Joker placement still applies

  // Forced Joker placement rules (Cases 2 & 3):

  const faceValue = values[0]; // all dice are same
  const matchingUpperCat = FACE_TO_UPPER[faceValue];

  // Step 1: If matching upper box is open → forced to use it
  if (scorecard[matchingUpperCat] === null) {
    const available = new Map();
    available.set(matchingUpperCat, scoreCategory(values, matchingUpperCat));
    return { available, yahtzeeBonus };
  }

  // Step 2: Matching upper box filled → Joker in any open lower-section category
  const openLower = LOWER_CATEGORIES.filter(
    cat => cat !== CATEGORIES.yahtzee && scorecard[cat] === null
  );

  if (openLower.length > 0) {
    const available = new Map();
    for (const cat of openLower) {
      // Joker scoring: fixed values for pattern categories, sum for others
      switch (cat) {
        case CATEGORIES.fullHouse:
          available.set(cat, 25);
          break;
        case CATEGORIES.smallStraight:
          available.set(cat, 30);
          break;
        case CATEGORIES.largeStraight:
          available.set(cat, 40);
          break;
        case CATEGORIES.threeOfAKind:
        case CATEGORIES.fourOfAKind:
        case CATEGORIES.chance:
          available.set(cat, sumDice(values));
          break;
        default:
          break;
      }
    }
    return { available, yahtzeeBonus };
  }

  // Step 3: All lower boxes filled → forced 0 in any remaining upper box
  const available = new Map();
  for (const cat of UPPER_CATEGORIES) {
    if (scorecard[cat] === null) {
      available.set(cat, 0);
    }
  }
  return { available, yahtzeeBonus };
}

// ===== Upper bonus & totals =====

/**
 * Compute the upper-section subtotal (sum of Ones–Sixes that are filled).
 * @param {Object} scorecard
 * @returns {number}
 */
export function computeUpperSubtotal(scorecard) {
  let total = 0;
  for (const cat of UPPER_CATEGORIES) {
    if (scorecard[cat] !== null) {
      total += scorecard[cat];
    }
  }
  return total;
}

/**
 * Compute the upper-section bonus (35 if subtotal >= 63, else 0).
 * @param {Object} scorecard
 * @returns {number}
 */
export function computeUpperBonus(scorecard) {
  return computeUpperSubtotal(scorecard) >= 63 ? 35 : 0;
}

/**
 * Compute the grand total for a player.
 * @param {Object} scorecard
 * @param {number} yahtzeeBonusCount — number of Yahtzee bonuses earned
 * @returns {number}
 */
export function computeTotal(scorecard, yahtzeeBonusCount) {
  let total = 0;
  for (const cat of ALL_CATEGORIES) {
    if (scorecard[cat] !== null) {
      total += scorecard[cat];
    }
  }
  total += computeUpperBonus(scorecard);
  total += yahtzeeBonusCount * 100;
  return total;
}
