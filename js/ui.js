// ui.js — All DOM rendering and event binding

import { UPPER_CATEGORIES, computeUpperSubtotal, computeUpperBonus, computeTotal } from './scoring.js';

// ===== Cached DOM elements =====

const $setupModal      = document.getElementById('setup-modal');
const $gameoverModal   = document.getElementById('gameover-modal');
const $gameArea        = document.getElementById('game-area');
const $playerCount     = document.getElementById('player-count');
const $playerNamesContainer = document.getElementById('player-names-container');
const $startGameBtn    = document.getElementById('start-game-btn');
const $playAgainBtn    = document.getElementById('play-again-btn');
const $finalScores     = document.getElementById('final-scores');

const $currentPlayerName = document.getElementById('current-player-name');
const $turnInfo          = document.getElementById('turn-info');
const $standingsBar      = document.getElementById('standings-bar');

const $diceContainer = document.getElementById('dice-container');
const $rollBtn       = document.getElementById('roll-btn');
const $rollsLeft     = document.getElementById('rolls-left');

const $upperSubtotal  = document.getElementById('upper-subtotal');
const $upperBonus     = document.getElementById('upper-bonus');
const $bonusProgress  = document.getElementById('bonus-progress');
const $yahtzeeBonusEl = document.getElementById('yahtzee-bonus');
const $grandTotal     = document.getElementById('grand-total');

const $scorecardTable = document.getElementById('scorecard-table');

// ===== Die face dot patterns =====
// 3x3 grid positions (indices 0–8):
//  0 1 2
//  3 4 5
//  6 7 8
const DOT_PATTERNS = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// ===== Category display names =====
const CATEGORY_NAMES = {
  ones:          'Ones',
  twos:          'Twos',
  threes:        'Threes',
  fours:         'Fours',
  fives:         'Fives',
  sixes:         'Sixes',
  threeOfAKind:  'Three of a Kind',
  fourOfAKind:   'Four of a Kind',
  fullHouse:     'Full House',
  smallStraight: 'Small Straight',
  largeStraight: 'Large Straight',
  yahtzee:       'Yahtzee',
  chance:        'Chance',
};

// ===== Setup =====

/**
 * Initialize the setup modal.
 * @param {(playerNames: string[]) => void} onStart
 */
export function showSetup(onStart) {
  $setupModal.classList.remove('hidden');
  $gameoverModal.classList.add('hidden');
  $gameArea.classList.add('hidden');

  // Generate player name fields when count changes
  const updateNames = () => {
    const count = Math.min(6, Math.max(1, parseInt($playerCount.value, 10) || 1));
    $playerNamesContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Player ${i + 1} name`;
      input.value = `Player ${i + 1}`;
      input.dataset.index = i;
      $playerNamesContainer.appendChild(input);
    }
  };

  // Use oninput (assignment) to avoid stacking listeners on replay
  $playerCount.oninput = updateNames;
  updateNames();

  $startGameBtn.onclick = () => {
    const inputs = $playerNamesContainer.querySelectorAll('input');
    const names = [...inputs].map(
      (inp, i) => inp.value.trim() || `Player ${i + 1}`
    );
    $setupModal.classList.add('hidden');
    $gameArea.classList.remove('hidden');
    onStart(names);
  };
}

// ===== Dice rendering =====

/**
 * Render the 5 dice with dot patterns and held state.
 * @param {{ value: number, held: boolean }[]} dice
 * @param {boolean} animate — whether to play roll animation
 */
export function renderDice(dice, animate = false) {
  const wrappers = $diceContainer.querySelectorAll('.die-wrapper');

  wrappers.forEach((wrapper, i) => {
    const die = dice[i];
    const dieEl = wrapper.querySelector('.die');
    const faceEl = wrapper.querySelector('.die-face');

    // Held state
    wrapper.classList.toggle('held', die.held);

    // Blank state (value 0 = not yet rolled)
    if (die.value === 0) {
      dieEl.classList.add('blank');
      faceEl.innerHTML = '';
      return;
    }

    dieEl.classList.remove('blank');

    // Animation
    if (animate && !die.held) {
      dieEl.classList.remove('rolling');
      // Force reflow to restart animation
      void dieEl.offsetWidth;
      dieEl.classList.add('rolling');
      dieEl.addEventListener('animationend', () => {
        dieEl.classList.remove('rolling');
      }, { once: true });
    }

    // Render dots
    const pattern = DOT_PATTERNS[die.value] || [];
    faceEl.innerHTML = '';
    for (let pos = 0; pos < 9; pos++) {
      const cell = document.createElement('span');
      if (pattern.includes(pos)) {
        cell.classList.add('dot');
      }
      faceEl.appendChild(cell);
    }
  });
}

/**
 * Bind click handler for dice (toggle hold).
 * @param {(index: number) => void} onDieClick
 */
export function bindDiceClick(onDieClick) {
  const wrappers = $diceContainer.querySelectorAll('.die-wrapper');
  wrappers.forEach((wrapper, i) => {
    wrapper.onclick = () => {
      if (!wrapper.classList.contains('no-click')) {
        onDieClick(i);
      }
    };
  });
}

/**
 * Enable/disable clicking on dice.
 * @param {boolean} enabled
 */
export function setDiceClickable(enabled) {
  const wrappers = $diceContainer.querySelectorAll('.die-wrapper');
  wrappers.forEach(w => w.classList.toggle('no-click', !enabled));
}

// ===== Roll button =====

/**
 * Bind the roll button click.
 * @param {() => void} onRoll
 */
export function bindRollButton(onRoll) {
  $rollBtn.onclick = onRoll;
}

/**
 * Update rolls remaining display and button state.
 * @param {number} rollsRemaining
 * @param {boolean} hasRolled — has the player rolled at least once this turn
 */
export function updateRollButton(rollsRemaining, hasRolled) {
  if (!hasRolled) {
    $rollBtn.disabled = false;
    $rollBtn.textContent = 'Roll Dice';
    $rollsLeft.textContent = `${rollsRemaining} rolls left`;
  } else if (rollsRemaining > 0) {
    $rollBtn.disabled = false;
    $rollBtn.textContent = 'Roll Again';
    $rollsLeft.textContent = `${rollsRemaining} roll${rollsRemaining !== 1 ? 's' : ''} left`;
  } else {
    $rollBtn.disabled = true;
    $rollBtn.textContent = 'No Rolls Left';
    $rollsLeft.textContent = 'Pick a category';
  }
}

// ===== Player info bar =====

/**
 * Update the player info bar.
 * @param {string} playerName
 * @param {number} turnNumber
 * @param {{ name: string, total: number }[]} standings
 * @param {number} currentPlayerIndex
 */
export function renderPlayerInfo(playerName, turnNumber, standings, currentPlayerIndex) {
  $currentPlayerName.textContent = playerName;
  $turnInfo.textContent = `Turn ${turnNumber} of 13`;

  $standingsBar.innerHTML = '';
  standings.forEach((s, i) => {
    const chip = document.createElement('span');
    chip.className = 'standing-chip';
    // Highlight current player
    // Find original index by name matching (standings sorted by score)
    chip.textContent = `${s.name}: ${s.total}`;
    $standingsBar.appendChild(chip);
  });
}

// ===== Scorecard rendering =====

/**
 * Render the scorecard table for the current player.
 * @param {Object} scorecard — { ones: number|null, ... }
 * @param {Map<string, number>|null} available — available categories with scores (null if not yet rolled)
 * @param {number} yahtzeeBonusCount
 * @param {(category: string) => void} onCategoryClick
 */
export function renderScorecard(scorecard, available, yahtzeeBonusCount, onCategoryClick) {
  const rows = $scorecardTable.querySelectorAll('tr[data-category]');

  rows.forEach(row => {
    const cat = row.dataset.category;
    const potentialCell = row.querySelector('.potential');
    const scoreCell = row.querySelector('.score');

    // Remove old state classes and handlers
    row.classList.remove('filled', 'unavailable');
    row.onclick = null;

    if (scorecard[cat] !== null) {
      // Already filled
      row.classList.add('filled');
      scoreCell.textContent = scorecard[cat];
      potentialCell.textContent = '';
    } else if (available && available.has(cat)) {
      // Available to score
      const potential = available.get(cat);
      potentialCell.textContent = potential;
      scoreCell.textContent = '—';
      row.onclick = () => onCategoryClick(cat);
    } else if (available) {
      // Not available (due to Joker rules forcing a different category)
      row.classList.add('unavailable');
      potentialCell.textContent = '';
      scoreCell.textContent = '—';
    } else {
      // No roll yet
      potentialCell.textContent = '';
      scoreCell.textContent = '—';
    }
  });

  // Update upper subtotal, bonus, and grand total
  const upperSub = computeUpperSubtotal(scorecard);
  const bonus = computeUpperBonus(scorecard);

  $upperSubtotal.textContent = upperSub;
  $upperBonus.textContent = bonus;
  $bonusProgress.textContent = `(${upperSub}/63)`;

  if (upperSub >= 63) {
    $bonusProgress.style.color = '#4ecca3';
  } else {
    $bonusProgress.style.color = '#aaa';
  }

  $yahtzeeBonusEl.textContent = yahtzeeBonusCount * 100;
  $grandTotal.textContent = computeTotal(scorecard, yahtzeeBonusCount);
}

// ===== Game Over =====

/**
 * Show the game-over modal with final standings.
 * @param {{ name: string, total: number, upperSubtotal: number, upperBonus: number, yahtzeeBonusCount: number }[]} standings
 * @param {() => void} onPlayAgain
 */
export function showGameOver(standings, onPlayAgain) {
  $gameoverModal.classList.remove('hidden');

  $finalScores.innerHTML = '';
  standings.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'final-player' + (i === 0 ? ' winner' : '');
    div.innerHTML = `
      <span><span class="rank">#${i + 1}</span> ${s.name}</span>
      <span>${s.total} pts</span>
    `;
    $finalScores.appendChild(div);
  });

  $playAgainBtn.onclick = () => {
    $gameoverModal.classList.add('hidden');
    onPlayAgain();
  };
}

/**
 * Hide game area and show setup modal again.
 */
export function resetToSetup() {
  $gameArea.classList.add('hidden');
  $setupModal.classList.remove('hidden');
}
