import * as Units from "./units.js";
import { gameGrid, getUnitPosition } from "./gameState.js";
import { raiseToLevel } from "./exp.js";
import { getMovementCost } from "./pathfinding.js";
import { hasAbility } from "./abilities.js";

// ==========================================
// SUMMON
// ==========================================

const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Plain string ids survive saving; object references would not.
function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// The summoner's living phantom, or null.
export function getPhantom(summoner) {
  if (!summoner?.uid) return null;

  for (const row of gameGrid) {
    for (const tile of row) {
      if (tile?.unit?.summonedBy === summoner.uid) return tile.unit;
    }
  }

  return null;
}

// Empty adjacent tiles a phantom (a flier) could stand on.
export function getSummonTiles(x, y) {
  const tiles = [];

  for (const [dx, dy] of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    const tile = gameGrid[ny]?.[nx];

    if (!tile || tile.unit !== undefined || !tile.traversable) continue;

    const cost = getMovementCost(tile, "flier");

    if (!(cost > 0) || !Number.isFinite(cost)) continue;

    tiles.push({ x: nx, y: ny });
  }

  return tiles;
}

// The unit stands at (x, y), which may be its post-move tile.
export function canSummon(unit, x, y) {
  return (
    hasAbility(unit, "summon") &&
    !getPhantom(unit) &&
    getSummonTiles(x, y).length > 0
  );
}

// Places a phantom at (x, y), which must be a valid adjacent tile.
// Returns the phantom, or null if the summon isn't allowed.
export function summonPhantom(summoner, x, y) {
  const position = getUnitPosition(summoner);

  if (!position) return null;
  if (!hasAbility(summoner, "summon") || getPhantom(summoner)) return null;

  const valid = getSummonTiles(position.x, position.y)
    .some(tile => tile.x === x && tile.y === y);

  if (!valid) return null;

  const phantom = new Units.Phantom(summoner.team);

  raiseToLevel(phantom, summoner.lvl);

  summoner.uid ??= newId();

  phantom.summonedBy = summoner.uid;
  phantom.noExp = true;
  phantom.home = summoner.home ? { ...summoner.home } : null;

  gameGrid[y][x].unit = phantom;

  return phantom;
}