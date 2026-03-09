// gameState.js — Game state manager: players, scorecards, turns, rolls

import { createDice, rollDice, resetHolds } from './dice.js';
import {
  ALL_CATEGORIES,
  getAvailableCategories,
  computeTotal,
  computeUpperSubtotal,
  computeUpperBonus,
} from './scoring.js';

const MAX_ROLLS = 3;
const TOTAL_TURNS = 13;

/**
 * Create a fresh scorecard with all categories set to null (unfilled).
 * @returns {Object}
 */
function createScorecard() {
  const card = {};
  for (const cat of ALL_CATEGORIES) {
    card[cat] = null;
  }
  return card;
}

/**
 * Count how many categories are filled in a scorecard.
 * @param {Object} scorecard
 * @returns {number}
 */
function filledCount(scorecard) {
  return ALL_CATEGORIES.filter(cat => scorecard[cat] !== null).length;
}

export class GameState {
  /**
   * @param {string[]} playerNames — 1–6 player names
   */
  constructor(playerNames) {
    this.players = playerNames.map(name => ({
      name,
      scorecard: createScorecard(),
      yahtzeeBonusCount: 0,
    }));
    this.currentPlayerIndex = 0;
    this.rollsRemaining = MAX_ROLLS;
    this.dice = createDice();
    this.hasRolledThisTurn = false;
  }

  /** Get current player object */
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  /** Get the turn number for the current player (1–13) */
  getCurrentTurnNumber() {
    const player = this.getCurrentPlayer();
    return filledCount(player.scorecard) + 1;
  }

  /** How many total turns remain across all players */
  getTotalRemainingTurns() {
    return this.players.reduce(
      (sum, p) => sum + (TOTAL_TURNS - filledCount(p.scorecard)),
      0
    );
  }

  /**
   * Roll the dice (unheld dice get new values).
   * @returns {{ success: boolean, message?: string }}
   */
  roll() {
    if (this.rollsRemaining <= 0) {
      return { success: false, message: 'No rolls remaining this turn.' };
    }
    rollDice(this.dice);
    this.rollsRemaining--;
    this.hasRolledThisTurn = true;
    return { success: true };
  }

  /**
   * Get the available categories and their scores for the current roll.
   * @returns {{ available: Map<string, number>, yahtzeeBonus: boolean }}
   */
  getAvailable() {
    const player = this.getCurrentPlayer();
    const values = this.dice.map(d => d.value);
    return getAvailableCategories(values, player.scorecard);
  }

  /**
   * Assign the current roll's score to a category for the current player.
   * @param {string} category
   * @returns {{ success: boolean, score?: number, yahtzeeBonus?: boolean, message?: string }}
   */
  assignScore(category) {
    if (!this.hasRolledThisTurn) {
      return { success: false, message: 'Must roll at least once before scoring.' };
    }

    const { available, yahtzeeBonus } = this.getAvailable();

    if (!available.has(category)) {
      return { success: false, message: 'That category is not available.' };
    }

    const player = this.getCurrentPlayer();
    const score = available.get(category);

    // Record the score
    player.scorecard[category] = score;

    // Record Yahtzee bonus
    if (yahtzeeBonus) {
      player.yahtzeeBonusCount++;
    }

    // Advance to next player / turn
    this._advanceTurn();

    return { success: true, score, yahtzeeBonus };
  }

  /** Advance to the next player's turn, resetting roll state. */
  _advanceTurn() {
    this.rollsRemaining = MAX_ROLLS;
    this.hasRolledThisTurn = false;
    resetHolds(this.dice);

    // Reset dice values to 0 (blank) for the next player
    for (const die of this.dice) {
      die.value = 0;
    }

    // Move to next player who still has turns remaining
    const numPlayers = this.players.length;
    for (let i = 1; i <= numPlayers; i++) {
      const nextIndex = (this.currentPlayerIndex + i) % numPlayers;
      const nextPlayer = this.players[nextIndex];
      if (filledCount(nextPlayer.scorecard) < TOTAL_TURNS) {
        this.currentPlayerIndex = nextIndex;
        return;
      }
    }
    // All players done — game over
  }

  /** Is the game over? (All players have filled all 13 categories) */
  isGameOver() {
    return this.players.every(p => filledCount(p.scorecard) === TOTAL_TURNS);
  }

  /**
   * Get standings sorted by total score descending.
   * @returns {{ name: string, total: number, upperSubtotal: number, upperBonus: number, yahtzeeBonusCount: number }[]}
   */
  getStandings() {
    return this.players
      .map(p => ({
        name: p.name,
        total: computeTotal(p.scorecard, p.yahtzeeBonusCount),
        upperSubtotal: computeUpperSubtotal(p.scorecard),
        upperBonus: computeUpperBonus(p.scorecard),
        yahtzeeBonusCount: p.yahtzeeBonusCount,
      }))
      .sort((a, b) => b.total - a.total);
  }
}
