import { gameGrid } from "./gameState.js";
import { hasAbility } from "./abilities.js";
import { 
  Floor, 
  Plain, 
  SnagBridge } 
from "./terrain.js";

// Extra movement cost the CPU pays to plan for destroying an obstacle,
// since breaking it takes unit actions.
export const BREAK_COST = 4;

const AFTER_WALL = new Floor();
const AFTER_SNAG = new Plain();
const AFTER_RIVER = new SnagBridge();

const validCost = cost => cost > 0 && Number.isFinite(cost);

function touchesSnag(x, y) {
  return DIRECTIONS.some(
    dir => gameGrid[y + dir.y]?.[x + dir.x]?.name === "Snag"
  );
}

// Cost to enter (x, y), or null. With `breakable`, weak walls, snags and
// rivers beside a snag count as passable at their post-destruction cost
// plus BREAK_COST.
export function getEnterCost(x, y, unit, breakable = false) {
  const tile = gameGrid[y]?.[x];

  if (!tile) return null;

  const normal = tile.traversable ? getMovementCost(tile, unit.terrFactor) : 0;
  let best = validCost(normal) ? normal : Infinity;

  if (breakable) {
    const after =
      tile.name === "WeakWall" ? AFTER_WALL :
      tile.name === "Snag" ? AFTER_SNAG :
      tile.name === "River" && touchesSnag(x, y) ? AFTER_RIVER :
      null;

    if (after) {
      best = Math.min(
        best,
        getMovementCost(after, unit.terrFactor) + BREAK_COST
      );
    }
  }

  return Number.isFinite(best) ? best : null;
}

// ==========================================
// MOVEMENT COST
// ==========================================

export function getMovementCost(tile, terrFactor) {
  const costs = tile.moveCost;

  // Use the cost for this unit's terrain movement factor.
  if (
    costs &&
    costs[terrFactor] !== undefined
  ) {
    return costs[terrFactor];
  }

  // Otherwise, use the foot cost if available.
  if (costs && costs.foot !== undefined) {
    return costs.foot;
  }

  // Backwards-compatible fallback to the existing terrain property.
  return tile.moveWeight;
}

// ==========================================
// PRIORITY QUEUE
// ==========================================

// Binary min-heap. Ties are broken by insertion order so that
// equal-cost routes are chosen predictably.
class MinHeap {
  constructor() {
    this.items = [];
    this.counter = 0;
  }

  get size() {
    return this.items.length;
  }

  less(a, b) {
    return a.f < b.f || (a.f === b.f && a.seq < b.seq);
  }

  push(node) {
    node.seq = this.counter++;

    const items = this.items;
    items.push(node);

    let i = items.length - 1;

    while (i > 0) {
      const parent = (i - 1) >> 1;

      if (!this.less(items[i], items[parent])) break;

      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  pop() {
    const items = this.items;
    const top = items[0];
    const last = items.pop();

    if (items.length > 0) {
      items[0] = last;

      let i = 0;

      while (true) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;

        if (left < items.length && this.less(items[left], items[smallest])) {
          smallest = left;
        }

        if (right < items.length && this.less(items[right], items[smallest])) {
          smallest = right;
        }

        if (smallest === i) break;

        [items[i], items[smallest]] = [items[smallest], items[i]];
        i = smallest;
      }
    }

    return top;
  }
}

const DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

const key = (x, y) => `${x},${y}`;

// Cost for a unit to enter a tile, or null if it cannot.
// Walls and other impassable terrain, enemy-occupied tiles, and
// tiles with no valid cost for this unit cannot be entered.
// Friendly units can be passed through (and enemies if unit has 'pass').
function getStepCost(tile, unit) {
  if (!tile.traversable) return null;

  // Enemy units block the way, unless the mover has Pass.
  // Stopping on an occupied tile is still refused by the callers.
  if (
    tile.unit !== undefined &&
    tile.unit.team !== unit.team &&
    !hasAbility(unit, "pass")
  ) {
    return null;
  }

  const cost = getMovementCost(tile, unit.terrFactor);

  if (cost <= 0 || !Number.isFinite(cost)) return null;

  return cost;
}

function isInsideMap(x, y) {
  return (
    y >= 0 &&
    y < gameGrid.length &&
    x >= 0 &&
    x < gameGrid[y].length
  );
}

// ==========================================
// REACHABLE TILES (one flood fill)
// ==========================================

// Every empty tile the unit can stop on, with its movement cost.
// This replaces running a separate path search per tile.
export function getReachableTiles(startX, startY, unit) {
  const open = new MinHeap();
  const best = new Map([[key(startX, startY), 0]]);
  const settled = new Set();
  const reachable = [];

  open.push({ x: startX, y: startY, f: 0 });

  while (open.size > 0) {
    const current = open.pop();
    const currentKey = key(current.x, current.y);

    if (settled.has(currentKey)) continue;
    settled.add(currentKey);

    // The unit may stop on any empty tile except where it started.
    const isStart = current.x === startX && current.y === startY;

    if (!isStart && gameGrid[current.y][current.x].unit === undefined) {
      reachable.push({ x: current.x, y: current.y, cost: current.f });
    }

    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (!isInsideMap(nx, ny)) continue;

      const neighborKey = key(nx, ny);

      if (settled.has(neighborKey)) continue;

      const cost = getStepCost(gameGrid[ny][nx], unit);

      if (cost === null) continue;

      const total = current.f + cost;

      if (total > unit.move) continue;

      if (!best.has(neighborKey) || total < best.get(neighborKey)) {
        best.set(neighborKey, total);
        open.push({ x: nx, y: ny, f: total });
      }
    }
  }

  return reachable;
}

// ==========================================
// SINGLE PATH (A*)
// ==========================================

export function findPath(startX, startY, endX, endY, unit) {
  // Early exit if destination is occupied by another unit (cannot stop there)
  if (gameGrid[endY]?.[endX]?.unit !== undefined && !(startX === endX && startY === endY)) {
    return null;
  }

  const open = new MinHeap();

  const cameFrom = new Map();
  const gScore = new Map([[key(startX, startY), 0]]);
  const closed = new Set();

  open.push({
    x: startX,
    y: startY,
    g: 0,
    f: Math.abs(endX - startX) + Math.abs(endY - startY)
  });

  while (open.size > 0) {
    const current = open.pop();
    const currentKey = key(current.x, current.y);

    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    // Destination reached: reconstruct the path.
    if (current.x === endX && current.y === endY) {
      const points = [];
      let k = currentKey;

      while (cameFrom.has(k)) {
        const [x, y] = k.split(",").map(Number);
        points.unshift({ x, y });
        k = cameFrom.get(k);
      }

      return {
        points,
        cost: current.g
      };
    }

    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (!isInsideMap(nx, ny)) continue;

      const tile = gameGrid[ny][nx];

      // A unit cannot end its move on an occupied tile.
      if (tile.unit !== undefined && nx === endX && ny === endY) {
        continue;
      }

      const cost = getStepCost(tile, unit);

      if (cost === null) continue;

      const neighborKey = key(nx, ny);

      if (closed.has(neighborKey)) continue;

      const tentativeG = current.g + cost;

      if (
        !gScore.has(neighborKey) ||
        tentativeG < gScore.get(neighborKey)
      ) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);

        const h =
          Math.abs(endX - nx) +
          Math.abs(endY - ny);

        open.push({
          x: nx,
          y: ny,
          g: tentativeG,
          f: tentativeG + h
        });
      }
    }
  }

  return null;
}

function canEnter(tile, unit) {
  if (!tile.traversable) return false;

  const cost = getMovementCost(tile, unit.terrFactor);

  return cost > 0 && Number.isFinite(cost);
}

// Movement cost from every tile to (targetX, targetY) for this unit's
// terrain type. Units are ignored. Tiles that can't reach it are missing.
export function getDistanceMap(unit, targetX, targetY, breakable = false) {
  const dist = new Map();

  if (
    !isInsideMap(targetX, targetY) ||
    getEnterCost(targetX, targetY, unit, breakable) === null
  ) {
    return dist;
  }

  const open = new MinHeap();
  const settled = new Set();

  dist.set(key(targetX, targetY), 0);
  open.push({ x: targetX, y: targetY, f: 0 });

  while (open.size > 0) {
    const current = open.pop();
    const currentKey = key(current.x, current.y);

    if (settled.has(currentKey)) continue;
    settled.add(currentKey);

    // Stepping from a neighbor onto this tile costs this tile's price.
    const enterCost = getEnterCost(current.x, current.y, unit, breakable);

    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (!isInsideMap(nx, ny)) continue;
      if (getEnterCost(nx, ny, unit, breakable) === null) continue;
      if (!canEnter(gameGrid[ny][nx], unit)) continue;

      const neighborKey = key(nx, ny);

      if (settled.has(neighborKey)) continue;

      const total = current.f + enterCost;

      if (!dist.has(neighborKey) || total < dist.get(neighborKey)) {
        dist.set(neighborKey, total);
        open.push({ x: nx, y: ny, f: total });
      }
    }
  }

  return dist;
}
