import { gameGrid, getUnitPosition } from "../gameState.js";
import { sleep } from "../utils.js";
import {
  setBattleAnimation,
  setBattleStatus,
  setTerrainStatus
} from "../gameArea.js";
import { TILE_SIZE } from "../map.js";
import { animMs } from "../settings.js";

// ==========================================
// BATTLE TIMING
// ==========================================

// Base durations in ms. BATTLE_TIMING reads them through the speed setting,
// so every existing BATTLE_TIMING.x call picks up the current speed.
const BASE_TIMING = {
  beforeFirstStrike: 500,
  forward: 180,
  backward: 180,
  resultPause: 500,
  hpLoss: 300
};

export const BATTLE_TIMING = {};

for (const [name, ms] of Object.entries(BASE_TIMING)) {
  Object.defineProperty(BATTLE_TIMING, name, {
    enumerable: true,
    get: () => animMs(ms)
  });
}

// ==========================================
// ANIMATION HELPERS
// ==========================================

function waitForFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
}

// 0..1 progress of an animation. A zero duration (Instant) is already done.
function progressSince(start, duration) {
  return duration <= 0
    ? 1
    : Math.min(1, (performance.now() - start) / duration);
}

export function removeUnitFromMap(unit) {
  for (const row of gameGrid) {
    for (const tile of row) {
      if (tile.unit === unit) {
        tile.unit = undefined;
      }
    }
  }
}

// ==========================================
// ATTACK ROLL
// ==========================================

export function rollAttack(result, sureHit = false) {
  const hit = sureHit || Math.random() * 100 < result.hit;

  if (!hit) {
    return {
      hit: false,
      critical: false,
      damage: 0,
      text: "MISS"
    };
  }

  const critical = Math.random() * 100 < result.crit;

  const calculatedDamage =
    result.damage * (critical ? 3 : 1);

  return {
    hit: true,
    critical,
    damage: calculatedDamage,
    text: critical
      ? `${Math.min(calculatedDamage, 999)} CRIT!`
      : String(Math.min(calculatedDamage, 999))
  };
}

// ==========================================
// STRIKE ANIMATION
// ==========================================

// Shared lunge used for both unit and terrain targets.
// `defender` is null for terrain.
async function animateLunge(
  attacker,
  targetPosition,
  defender,
  outcomeText,
  onImpact = null
) {
  const attackerPosition = getUnitPosition(attacker);

  if (!attackerPosition || !targetPosition) return;

  const dx = targetPosition.x - attackerPosition.x;
  const dy = targetPosition.y - attackerPosition.y;

  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return;

  const maxOffset = TILE_SIZE / 2;

  const offsetX = (dx / distance) * maxOffset;
  const offsetY = (dy / distance) * maxOffset;

  function updateAnimation(progress, text = null) {
    setBattleAnimation({
      attacker,
      defender,
      targetPosition,
      offsetX: offsetX * progress,
      offsetY: offsetY * progress,
      outcomeText: text
    });
  }

  async function animateMovement(from, to, duration, text = null) {
    const startTime = performance.now();

    while (true) {
            const progress = progressSince(startTime, duration);

      const easedProgress =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const current = from + (to - from) * easedProgress;

      updateAnimation(current, text);

      if (progress >= 1) break;

      await waitForFrame();
    }
  }

  // Attacker moves toward the target.
  await animateMovement(0, 1, BATTLE_TIMING.forward);

  // Impact: show damage number and start HP animation together.
  updateAnimation(1, outcomeText);

  const impactAnimation = onImpact ? onImpact() : null;

  // Attacker retreats while HP decreases.
  await animateMovement(1, 0, BATTLE_TIMING.backward, outcomeText);

  await sleep(BATTLE_TIMING.resultPause);

  // Ensure the HP animation has finished before clearing.
  if (impactAnimation) {
    await impactAnimation;
  }

  setBattleAnimation(null);
}

export function animateStrike(
  attacker,
  defender,
  outcomeText,
  onImpact = null
) {
  return animateLunge(
    attacker,
    getUnitPosition(defender),
    defender,
    outcomeText,
    onImpact
  );
}

export function animateTerrainStrike(
  attacker,
  position,
  outcomeText,
  onImpact = null
) {
  return animateLunge(attacker, position, null, outcomeText, onImpact);
}

// ==========================================
// BATTLE STATUS DISPLAY
// ==========================================

// Lower team number goes on the left of the HP panel.
export function orderTeams(a, b) {
  return a.team <= b.team ? [a, b] : [b, a];
}

export function createBattleStatus(attacker, defender) {
  if (attacker === defender) {
    updateBattleStatus(attacker, null);
    return;
  }

  const [one, two] = orderTeams(attacker, defender);
  updateBattleStatus(one, two);
}

export function updateBattleStatus(teamOne, teamTwo = null) {
  const snapshot = u => ({
    name: u.name,
    team: u.team,
    hp: u.hp,
    maxHp: u.maxHp
  });

  setBattleStatus({
    teamOne: snapshot(teamOne),
    teamTwo: teamTwo ? snapshot(teamTwo) : null,
    attacker: teamOne
  });
}

export function clearBattleStatus() {
  setBattleStatus(null);
}

// ==========================================
// HP LOSS ANIMATION
// ==========================================

export async function animateHpChange(
  unit,
  delta,
  teamOne,
  teamTwo
) {
  const startingHp = unit.hp;
  const endingHp = Math.min(unit.maxHp, Math.max(0, startingHp + delta));

  const duration = BATTLE_TIMING.hpLoss;
  const start = performance.now();

  while (true) {
        const progress = progressSince(start, duration);

    unit.hp = Math.round(
      startingHp + (endingHp - startingHp) * progress
    );

    updateBattleStatus(teamOne, teamTwo);

    if (progress >= 1) break;

    await waitForFrame();
  }

  unit.hp = endingHp;
  updateBattleStatus(teamOne, teamTwo);

  if (unit.hp <= 0) {
    removeUnitFromMap(unit);
  }
}

// ==========================================
// TERRAIN HP STATUS
// ==========================================

export function showTerrainStatus(attacker, tile, hp = tile.hp) {
  setTerrainStatus({
    attacker,
    name: tile.name,
    hp,
    maxHp: tile.maxHp ?? 30
  });
}

export function clearTerrainStatus() {
  setTerrainStatus(null);
}

// Animates the grey terrain HP bar, then commits the new HP.
export async function animateTerrainHpChange(attacker, tile, delta) {
  const maxHp = tile.maxHp ?? 30;
  const startingHp = tile.hp;
  const endingHp = Math.min(maxHp, Math.max(0, startingHp + delta));

  const start = performance.now();

  while (true) {
        const progress = progressSince(start, BATTLE_TIMING.hpLoss);

    showTerrainStatus(
      attacker,
      tile,
      Math.round(startingHp + (endingHp - startingHp) * progress)
    );

    if (progress >= 1) break;

    await waitForFrame();
  }

  tile.hp = endingHp;
  showTerrainStatus(attacker, tile, endingHp);
}