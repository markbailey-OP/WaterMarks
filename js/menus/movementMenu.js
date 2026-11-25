import { gameGrid, sel, gameCursor } from "../gameState.js";
import {
  getPendingMove,
  setPendingMove,
  clearPendingMove
} from "./attackState.js";
import { findPath } from "../pathfinding.js";
import { startMoveAnimation } from "../sprites.js";
import { exitBallista } from "../inventory.js";

// ==========================================
// PENDING MOVES
// ==========================================
// A move is "pending" from the moment a unit steps onto its destination
// until the player ends its action (confirmMove) or undoes it (cancelMove).
// The unit stands on the destination tile the whole time. All menus for a
// unit that has moved are the unit menu (unitMenu.js); this file has none.

export function requestMove(unit, startX, startY, endX, endY) {
  setPendingMove({
    unit,
    startX,
    startY,
    endX,
    endY,
    wasMoved: unit.hasMoved
  });

  startMoveAnimation(
    unit,
    { x: startX, y: startY },
    findPath(startX, startY, endX, endY, unit)
  );

  // Move the unit immediately; the animation only draws the walk.
  gameGrid[startY][startX].unit = undefined;
  gameGrid[endY][endX].unit = unit;

  unit.selected = false;

  delete unit.moves;
  delete unit.dist;
  delete unit.attackRange;
  delete unit.possibleRange;

  sel.bool = false;
  sel.xCoord = undefined;
  sel.yCoord = undefined;

  gameCursor.route = [];
}

// Ends the unit's action where it stands. Callers close their own menu.
export function confirmMove() {
  const move = getPendingMove();

  if (!move) return;

  move.unit.hasMoved = true;

  clearPendingMove();
}

// Undoes the move: the unit goes back to where it started.
// Callers close their own menu.
export function cancelMove() {
  const move = getPendingMove();

  if (!move) return;

  // Leave a ballista entered at the destination before moving back.
  if (move.unit.inBallista) exitBallista(move.unit, move.endX, move.endY);

  gameGrid[move.endY][move.endX].unit = undefined;
  gameGrid[move.startY][move.startX].unit = move.unit;

  move.unit.hasMoved = move.wasMoved;
  move.unit.selected = false;

  clearPendingMove();

  gameCursor.moveToTarget({ x: move.startX, y: move.startY });
  gameCursor.route = [];
}
