import {
  gameGrid,
  sel,
  side,
  attackTargets,
  setSelectedAttackTarget,
  getUnitPosition
} from "./gameState.js";
import {
  findPath,
  getMovementCost,
  getReachableTiles
} from "./pathfinding.js";
import {
  getAttackTiles,
  getStaffTiles
} from "./menus/targeting.js";
import {
  chooseAttackTarget,
  cancelAttack
} from "./menus/attackMenu.js";
import {
  staffTargets,
  setSelectedStaffTarget,
  cycleStaffTarget,
  isChoosingStaffTarget
} from "./menus/staffState.js";
import {
  confirmTarget,
  cancelTargeting
} from "./menus/staffMenu.js";
import { TILE_SIZE } from "./map.js";
import { openUnitMenu } from "./menus/unitMenu.js";
import { openContextMenu } from "./menus/contextMenu.js";
import { requestMove } from "./menus/movementMenu.js";
import { getActiveAttack } from "./menus/attackState.js";
import { isImmobile } from "./status.js";

export class Cursor {
  constructor(x, y) {
    // Keep the starting position inside the map.
    const maxY = Math.max(0, gameGrid.length - 1);
    const safeY = Math.max(0, Math.min(y, maxY));

    const maxX = Math.max(0, (gameGrid[safeY]?.length ?? 1) - 1);
    const safeX = Math.max(0, Math.min(x, maxX));

    this.x = safeX;
    this.y = safeY;

    this.pixlX = this.x * TILE_SIZE;
    this.pixlY = this.y * TILE_SIZE;

    this.color = "#008800";
    this.route = [];

    // Cached preview path, recomputed only when the cursor moves.
    this.pathCache = null;
  }

  // ==========================================
  // ATTACK TARGET SELECTION
  // ==========================================

  isChoosingAttackTarget() {
    const attack = getActiveAttack();

    return attack?.choosingTarget === true;
  }

  moveToTarget(target) {
    if (!target) return;

    this.x = target.x;
    this.y = target.y;

    this.pixlX = this.x * TILE_SIZE;
    this.pixlY = this.y * TILE_SIZE;

    this.route = [];
  }

  cycleAttackTarget(direction) {
    if (attackTargets.length === 0) return;

    const currentIndex =
      attackTargets.findIndex(
        target =>
          target.x === this.x &&
          target.y === this.y
      );

    const forward =
      direction === "right" || direction === "down";

    const backward =
      direction === "left" || direction === "up";

    if (!forward && !backward) return;

    const step = forward ? 1 : -1;

    const startingIndex =
      currentIndex === -1 ? 0 : currentIndex;

    const nextIndex =
      (startingIndex + step + attackTargets.length) %
      attackTargets.length;

    const target = attackTargets[nextIndex];

    setSelectedAttackTarget(target);
    this.moveToTarget(target);
  }

  // ==========================================
  // STAFF TARGET SELECTION
  // ==========================================

  isChoosingStaffTarget() {
    return isChoosingStaffTarget();
  }

  cycleStaffTarget(direction) {
    if (staffTargets.length === 0) return;

    const forward =
      direction === "right" || direction === "down";

    const backward =
      direction === "left" || direction === "up";

    if (!forward && !backward) return;

    const step = forward ? 1 : -1;
    const target = cycleStaffTarget(step);

    if (target) {
      this.moveToTarget(target);
    }
  }

  // ==========================================
  // DRAW CURSOR
  // ==========================================

  update(time, ctx) {
    this.color = time < 40 ? "#ff0000" : "#008800";

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;

    ctx.strokeRect(
      this.pixlX,
      this.pixlY,
      TILE_SIZE,
      TILE_SIZE
    );

    // No dashed move path while choosing an attack or staff target.
    if (
      sel.bool &&
      staffTargets.length === 0 &&
      !this.isChoosingAttackTarget() &&
      !this.isChoosingStaffTarget()
    ) {
      this.createPath(ctx);
    }
  }

  // ==========================================
  // MOVEMENT
  // ==========================================

  move(direction) {
    // Directional buttons cycle through targets during attacks or staves.
    if (this.isChoosingAttackTarget()) {
      this.cycleAttackTarget(direction);
      return;
    }

    if (this.isChoosingStaffTarget()) {
      this.cycleStaffTarget(direction);
      return;
    }

    // Keep normal menu restrictions.
    if (
      document.getElementById("moveMenu")?.style.display === "block" ||
      document.getElementById("unitMenu")?.style.display === "block"
    ) {
      return;
    }

    const oldX = this.x;
    const oldY = this.y;

    let newX = this.x;
    let newY = this.y;

    if (direction === "up") newY--;
    if (direction === "down") newY++;
    if (direction === "left") newX--;
    if (direction === "right") newX++;

    // Check the destination row and column.
    if (
      newY < 0 ||
      newY >= gameGrid.length ||
      newX < 0 ||
      newX >= (gameGrid[newY]?.length ?? 0)
    ) {
      return;
    }

    this.x = newX;
    this.y = newY;

    this.pixlX = this.x * TILE_SIZE;
    this.pixlY = this.y * TILE_SIZE;

    if (sel.bool && (this.x !== oldX || this.y !== oldY)) {
      const index = this.route.findIndex(
        p => p.x === this.x && p.y === this.y
      );

      if (index !== -1) {
        this.route = this.route.slice(0, index);
      } else {
        this.route.push({ x: oldX, y: oldY });
      }
    }
  }
  
    // LT / RT: jump to the next / previous unit on the current side that
  // can still act. Units are ordered by row, then column.
  jumpToUnit(step) {
    if (
      sel.bool ||
      this.isChoosingAttackTarget() ||
      this.isChoosingStaffTarget() ||
      document.getElementById("moveMenu")?.style.display === "block" ||
      document.getElementById("unitMenu")?.style.display === "block"
    ) {
      return;
    }

    const spots = [];

    for (let y = 0; y < gameGrid.length; y++) {
      for (let x = 0; x < gameGrid[y].length; x++) {
        const unit = gameGrid[y][x]?.unit;

                if (unit && unit.team === side && !unit.hasMoved && !isImmobile(unit)) {
          spots.push({ x, y, order: y * 1000 + x });
        }
      }
    }

    if (spots.length === 0) return;

    const here = this.y * 1000 + this.x;

    const target = step > 0
      ? spots.find(s => s.order > here) ?? spots[0]
      : [...spots].reverse().find(s => s.order < here) ??
        spots[spots.length - 1];

    this.moveToTarget(target);
  }

  // ==========================================
  // SELECT
  // ==========================================

  select() {

    // Confirm the target at the cursor's current location.
    if (this.isChoosingAttackTarget()) {
      const target = attackTargets.find(
        target =>
          target.x === this.x &&
          target.y === this.y
      );

      if (!target) return;

      setSelectedAttackTarget(target);
      chooseAttackTarget(target);

      return;
    }

    if (this.isChoosingStaffTarget()) {
      const target = staffTargets.find(
        target =>
          target.x === this.x &&
          target.y === this.y
      );

      if (!target) return;

      setSelectedStaffTarget(target);
      confirmTarget();

      return;
    }

    const unit = gameGrid[this.y]?.[this.x]?.unit;

    if (!sel.bool) {
      // Empty tiles open the context menu.
      if (unit === undefined) {
        openContextMenu();
        return;
      }

      // Friendly units that have not moved retain
      // their normal movement behavior.
            if (unit.team === this.getCurrentSide() 
              && !unit.hasMoved 
              && !isImmobile(unit)) {
        unit.selected = true;

        sel.bool = true;
        sel.xCoord = this.x;
        sel.yCoord = this.y;

        this.getMoves(unit);
        return;
      }

      // Enemies and friendly units that have already moved.
      openContextMenu(unit);
      return;
    }

    const startX = sel.xCoord;
    const startY = sel.yCoord;

    const selectedUnit = gameGrid[startY]?.[startX]?.unit;

    if (selectedUnit === undefined) {
      this.back();
      return;
    }

    if (this.x === startX && this.y === startY) {
      openUnitMenu(selectedUnit);
      return;
    }

    if (unit !== undefined) return;

    const validMove = selectedUnit.moves?.some(
      p => p.x === this.x && p.y === this.y
    );

    if (!validMove) return;

    requestMove(
      selectedUnit,
      startX,
      startY,
      this.x,
      this.y
    );
  }

  // ==========================================
  // CURRENT SIDE
  // ==========================================

  getCurrentSide() {
    return side;
  }

  // ==========================================
  // MOVEMENT RANGE
  // ==========================================

  getMoves(unit) {
  // One flood fill finds every tile the unit can reach.
  unit.moves = getReachableTiles(sel.xCoord, sel.yCoord, unit);

  // Units with 0 move (e.g. crewing a ballista) still treat their tile
  // as a valid "stand" position so it highlights blue and attack range
  // is computed from here.
  if (
    (unit.move ?? 0) <= 0 ||
    unit.inBallista
  ) {
    const here = { x: sel.xCoord, y: sel.yCoord, cost: 0 };
    if (!unit.moves.some(t => t.x === here.x && t.y === here.y)) {
      unit.moves = [here, ...unit.moves];
    }
  }

  this.pathCache = null;

  unit.attackRange = getAttackRange(unit);
  unit.possibleRange = getPossibleRange(unit);

  // Staff range uses the same possible movement positions
  // as attack range, including the unit's current position.
  const origins = [...unit.moves];

  const position = getUnitPosition(unit);

  if (position) origins.push(position);

  unit.staffRange = getStaffTiles(unit, origins);
}

  // ==========================================
  // BACK
  // ==========================================

  back() {
    // Back cancels an attack during target selection.
    if (this.isChoosingAttackTarget()) {
      cancelAttack();
      return;
    }

    if (this.isChoosingStaffTarget()) {
      cancelTargeting();
      return;
    }

    if (!sel.bool) return;

    const unit = gameGrid[sel.yCoord]?.[sel.xCoord]?.unit;

    if (unit) unit.selected = false;

    delete unit?.moves;
    delete unit?.dist;
    delete unit?.attackRange;
    delete unit?.possibleRange;
    delete unit?.staffRange;

    sel.bool = false;
    sel.xCoord = undefined;
    sel.yCoord = undefined;

    this.route = [];
    this.pathCache = null;
  }

  // ==========================================
  // PATH DRAWING
  // ==========================================

  // The part of the route the unit can actually afford to walk.
  // Cached, because the path only changes when the cursor moves.
  getPathPoints(unit) {
    const cacheKey =
      `${sel.xCoord},${sel.yCoord},${this.x},${this.y}`;

    if (this.pathCache?.key === cacheKey) {
      return this.pathCache.points;
    }

    const path = findPath(
      sel.xCoord,
      sel.yCoord,
      this.x,
      this.y,
      unit
    );

    const points = [];

    if (path) {
      let totalCost = 0;

      for (const point of path.points) {
        const tile = gameGrid[point.y]?.[point.x];

        if (!tile) break;

        const cost = getMovementCost(tile, unit.terrFactor);

        if (cost <= 0 || !Number.isFinite(cost)) break;
        if (totalCost + cost > unit.move) break;

        totalCost += cost;
        points.push(point);
      }
    }

    this.pathCache = { key: cacheKey, points };

    return points;
  }

  createPath(ctx) {
    const unit = gameGrid[sel.yCoord]?.[sel.xCoord]?.unit;

    if (!unit) return;

    const points = this.getPathPoints(unit);

    if (points.length === 0) return;

    ctx.beginPath();

    ctx.moveTo(
      sel.xCoord * TILE_SIZE + TILE_SIZE / 2,
      sel.yCoord * TILE_SIZE + TILE_SIZE / 2
    );

    for (const point of points) {
      ctx.lineTo(
        point.x * TILE_SIZE + TILE_SIZE / 2,
        point.y * TILE_SIZE + TILE_SIZE / 2
      );
    }

    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ==========================================
// ATTACK RANGE
// ==========================================

export function getAttackRange(unit) {
  const origins = [...(unit.moves ?? [])];

  const position = getUnitPosition(unit);

  if (position) origins.push(position);

  return getAttackTiles(unit, origins);
}

export function getPossibleRange(unit) {
  const tiles = new Map();

  for (const tile of unit.moves ?? []) {
    tiles.set(`${tile.x},${tile.y}`, tile);
  }

  for (const tile of getAttackRange(unit)) {
    tiles.set(`${tile.x},${tile.y}`, tile);
  }

  return [...tiles.values()];
}
