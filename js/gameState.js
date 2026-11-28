export const gameGrid = [];

// ==========================================
// TEAMS
// ==========================================

export const TEAM_COUNT = 4;
export const TEAM_NAMES = { 1: "Blue", 2: "Red", 3: "Green", 4: "Purple" };
export const TEAM_COLORS = {
  1: "#1E90FF",
  2: "#FF1111",
  3: "#22BB22",
  4: "#BB44DD"
};

// ==========================================
// MAP RULES
// ==========================================
// Each map can override these (see TEAM_ROSTERS and WIN_RULES in a map file).
// They are saved with the game, so a loaded game keeps its map's rules.
//
//   rosters: what each team reinforces with by default, and what its shop
//            sells: "human" (trainee classes) or "monster" (monster classes).
//   win.fortPercent:   % of all forts AND caves a team must hold to win.
//                      null turns this win condition off.
//   win.throneCapture: capturing a contender's throne wins.
//   win.contenders:    the teams that can win (and whose thrones count).

export const DEFAULT_RULES = {
  rosters: { 1: "human", 2: "human", 3: "monster", 4: "monster" },
  win: { fortPercent: 75, throneCapture: true, contenders: [1, 2] }
};

const copyRules = source => ({
  rosters: { ...source.rosters },
  win: { ...source.win, contenders: [...source.win.contenders] }
});

export const rules = copyRules(DEFAULT_RULES);

const isTeam = team =>
  Number.isInteger(team) && team >= 1 && team <= TEAM_COUNT;

// Replaces the rules with the defaults plus whatever `overrides` sets.
// Anything missing or invalid keeps its default, so partial maps are fine.
export function setRules(overrides = {}) {
  const next = copyRules(DEFAULT_RULES);
  const { rosters, win } = overrides ?? {};

  for (const team of Object.keys(next.rosters)) {
    const type = rosters?.[team];

    if (type === "human" || type === "monster") next.rosters[team] = type;
  }

  if (win) {
    if ("fortPercent" in win) {
      const percent = Number(win.fortPercent);

      next.win.fortPercent = percent > 0 && percent <= 100 ? percent : null;
    }

    if (typeof win.throneCapture === "boolean") {
      next.win.throneCapture = win.throneCapture;
    }

    if (Array.isArray(win.contenders)) {
      next.win.contenders = win.contenders.filter(isTeam);
    }
  }

  rules.rosters = next.rosters;
  rules.win = next.win;
}

// "human" or "monster".
export const getRosterType = team => rules.rosters[team] ?? "human";

// ==========================================
// SELECTION AND TARGETING
// ==========================================

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

// ==========================================
// TURN STATE
// ==========================================

export let turn = 1;
export let side = 1;
export let time = 0;
export let gameCursor = null;

export const teamGold = { 1: 1000, 2: 1000, 3: 1000, 4: 1000 };

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

// A team is in the game while it has a unit or owns a fort, cave or throne.
// Teams with neither are skipped, so a map can use any number of the four.
export function isTeamAlive(team) {
  return gameGrid.some(row =>
    row.some(tile => tile?.unit?.team === team || tile?.owner === team)
  );
}

function aliveTeams() {
  const teams = [];

  for (let team = 1; team <= TEAM_COUNT; team++) {
    if (isTeamAlive(team)) teams.push(team);
  }

  return teams;
}

// The team that moves first on a new map.
export function getFirstTeam() {
  return aliveTeams()[0] ?? 1;
}

// Moves to the next team that is still in the game, in team order. A new
// turn starts whenever the order wraps around.
export function endCurrentSide() {
  const teams = aliveTeams();

  const next = teams.length > 0
    ? (teams.find(team => team > side) ?? teams[0])
    : (side % TEAM_COUNT) + 1;

  if (next <= side) turn++;

  side = next;
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
