// main.js — Entry point: wires game state, dice, scoring, and UI together

import { toggleHold, getValues } from './dice.js';
import { GameState } from './gameState.js';
import {
  showSetup,
  renderDice,
  bindDiceClick,
  setDiceClickable,
  bindRollButton,
  updateRollButton,
  renderPlayerInfo,
  renderScorecard,
  showGameOver,
  resetToSetup,
} from './ui.js';
import { unlockAudio, playRoll, playHold, playScore, playBonus, playYahtzee, playGameOver } from './sound.js';

let game = null;

// ===== Core render function =====

function render(animate = false) {
  const player = game.getCurrentPlayer();
  const turnNumber = game.getCurrentTurnNumber();
  const standings = game.getStandings();

  // Player info
  renderPlayerInfo(player.name, turnNumber, standings, game.currentPlayerIndex);

  // Dice
  renderDice(game.dice, animate);

  // Roll button
  updateRollButton(game.rollsRemaining, game.hasRolledThisTurn);

  // Dice clickable only after first roll and before scoring
  setDiceClickable(game.hasRolledThisTurn && game.rollsRemaining > 0);

  // Scorecard with available categories
  let available = null;
  if (game.hasRolledThisTurn) {
    const result = game.getAvailable();
    available = result.available;
  }

  renderScorecard(
    player.scorecard,
    available,
    player.yahtzeeBonusCount,
    handleCategoryClick
  );
}

// ===== Event handlers =====

function handleRoll() {
  unlockAudio();
  const result = game.roll();
  if (!result.success) {
    return;
  }
  playRoll();
  render(true);
}

function handleDieClick(index) {
  // Only allow toggling hold after first roll and with rolls remaining
  if (!game.hasRolledThisTurn || game.rollsRemaining <= 0) {
    return;
  }
  toggleHold(game.dice, index);
  playHold();
  render(false);
}

function handleCategoryClick(category) {
  const result = game.assignScore(category);
  if (!result.success) {
    return;
  }

  // Sound effects
  if (result.yahtzeeBonus) {
    playYahtzee();
  } else {
    playScore();
  }

  // Check for game over
  if (game.isGameOver()) {
    // Render final state briefly then show game over
    render(false);
    setTimeout(() => {
      playGameOver();
      showGameOver(game.getStandings(), handlePlayAgain);
    }, 300);
    return;
  }

  // Render for next player's turn
  render(false);
}

function handlePlayAgain() {
  game = null;
  resetToSetup();
  init();
}

// ===== Initialization =====

function startGame(playerNames) {
  game = new GameState(playerNames);

  // Bind event handlers (only need to bind dice click and roll once)
  bindDiceClick(handleDieClick);
  bindRollButton(handleRoll);

  // Initial render
  render(false);
}

function init() {
  showSetup(startGame);
}

// Start!
init();
