import { sel, gameCursor } from "../gameState.js";
import { findAttackTargets, canUseHealingStaff } from "./targeting.js";
import { getPendingMove } from "./attackState.js";
import { confirmMove } from "./movementMenu.js";
import { isShopTile } from "./shopMenu.js";
import { canTrade } from "./tradeMenu.js";
import { canSteal } from "../abilities.js";
import { canSummon } from "../summon.js";
import { getPromotionOptions } from "../promotion.js";
import { tileHasUsableBallista } from "../inventory.js";
import {
  getCapturableTile,
  getDestroyableCave,
  isLord
} from "../strongholds.js";

// ==========================================
// UNIT ACTIONS (the one list the unit menu shows)
// ==========================================
// To add an action: add its label here, add a line to getActionIds, and
// add a case for it in unitMenu.js (handleMenuAction).

export const ACTION_LABELS = {
  attack: "ATTACK",
  steal: "STEAL",
  summon: "SUMMON",
  staff: "STAFF",
  capture: "CAPTURE",
  destroy: "DESTROY",
  promote: "PROMOTE",
  shop: "SHOP",
  trade: "TRADE",
  ballista: "BALLISTA",
  "exit-ballista": "EXIT",
  items: "ITEMS",
  stats: "STATS",
  retreat: "RETREAT",
  wait: "WAIT"
};

// What a unit that can't act (an enemy, or one that already moved) offers.
export const VIEW_ACTIONS = ["items", "stats"];

// The actions available to `unit` standing on (x, y), in menu order.
//   moved:  true when the unit has just moved there and the move can still
//           be undone (no RETREAT then).
//   canAct: false for units that may only be inspected.
export function getActionIds(unit, x, y, { moved = false, canAct = true } = {}) {
  if (!canAct) return [...VIEW_ACTIONS];

  const options = [
    ["attack", findAttackTargets(unit, x, y).length > 0],
    ["steal", canSteal(unit, x, y)],
    ["summon", canSummon(unit, x, y)],
    ["staff", canUseHealingStaff(unit, x, y)],
    ["capture", Boolean(getCapturableTile(unit, x, y))],
    ["destroy", Boolean(getDestroyableCave(unit, x, y))],
    ["promote", getPromotionOptions(unit).length > 0],
    ["shop", isShopTile(x, y)],
    ["trade", canTrade(unit, x, y)],
    ["ballista", !unit.inBallista && tileHasUsableBallista(x, y, unit)],
    ["exit-ballista", Boolean(unit.inBallista)],
    ["items", true],
    ["stats", true],
    ["retreat", !moved && !isLord(unit)],
    ["wait", true]
  ];

  return options.filter(([, available]) => available).map(([id]) => id);
}

// Ends a unit's action. A unit with a pending move has that move confirmed;
// a unit that never moved is just marked done and its overlays cleared.
// Callers close their own menu afterwards.
export function finishUnitAction(unit) {
  if (getPendingMove()?.unit === unit) {
    confirmMove();
    return;
  }

  unit.hasMoved = true;

  if (sel.bool) gameCursor.back();
}
