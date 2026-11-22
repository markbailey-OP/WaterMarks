export const gameGrid = [];

export const TEAM_COUNT = 3;
export const TEAM_NAMES = { 1: "Blue", 2: "Red", 3: "Green" };
export const TEAM_COLORS = { 1: "#1E90FF", 2: "#FF1111", 3: "#22BB22" };

export const sel = {
  bool: false,
  xCoord: undefined,
  yCoord: undefined
};

// Attack target highlighting
export let attackTargets = [];
export let selectedAttackTarget = null;

export function setAttackTargets(targets) {
  attackTargets = targets;
}

export function setSelectedAttackTarget(target) {
  selectedAttackTarget = target;
}

export let turn = 1;
export let side = 1;
export let time = 0;
export let gameCursor = null;

export const teamGold = { 1: 1000, 2: 1000, 3: 1000 };

export function getGold(team = side) {
  return teamGold[team] ?? 0;
}

export function setGold(team, amount) {
  teamGold[team] = Math.max(0, Math.floor(amount));
  updateGoldDisplay();
}

export function addGold(team, amount) {
  setGold(team, (teamGold[team] ?? 0) + Math.floor(amount));
}

export function updateGoldDisplay() {
  const el = document.getElementById("goldCounter");
  if (el) {
    el.textContent = `Gold: ${getGold(side)}`;
  }
}

export function setGameCursor(cursor) {
  gameCursor = cursor;
}

// The cursor blink advances every 50 ms regardless of frame rate.
export function advanceTime() {
  time = Math.floor(performance.now() / 50) % 50;
}

// Blue -> Red -> Green -> Blue. A new turn starts when Blue is up again.
export function endCurrentSide() {
  side = (side % TEAM_COUNT) + 1;
  if (side === 1) turn++;
}

export function resetUnitsForNewSide() {
  for (const row of gameGrid) {
    for (const tile of row) {
      if (tile.unit !== undefined) {
        tile.unit.hasMoved = false;
      }
    }
  }
}

// Finds a unit's current tile, or null if it is not on the map.
export function getUnitPosition(unit) {
  for (let y = 0; y < gameGrid.length; y++) {
    for (let x = 0; x < gameGrid[y].length; x++) {
      if (gameGrid[y][x]?.unit === unit) {
        return { x, y };
      }
    }
  }

  return null;
}

export function setTurnState(newTurn, newSide) {
  turn = newTurn;
  side = newSide;
}

export function updateTurnDisplay() {
  const turnElement = document.getElementById("turnCounter");
  const sideElement = document.getElementById("sideCounter");

  if (turnElement) turnElement.textContent = `Turn: ${turn}`;
  if (sideElement) sideElement.textContent = `Side: ${TEAM_NAMES[side]}`;

  updateGoldDisplay();
}