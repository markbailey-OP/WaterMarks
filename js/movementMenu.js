import {
  gameGrid,
  sel,
  gameCursor
} from "../gameState.js";

import {
  findAttackTargets,
  canUseHealingStaff
} from "./targeting.js";

import {
  getPendingMove,
  setPendingMove,
  clearPendingMove
} from "./attackState.js";

import {
  pushInputContext,
  popInputContext
} from "../input.js";

import { 
  getCapturableTile, 
  captureTile, 
  promoteUnit,
  getDestroyableCave,
  destroyCave
} from "../strongholds.js";

import { 
  promotionLayoutHtml, 
  syncPromotionPreview 
} from "./promotionPreview.js";

import { isShopTile } from "./shopMenu.js";
import { getPromotionOptions } from "../promotion.js";
import { escapeHtml } from "../utils.js";
import { canTrade, openTrade } from "./tradeMenu.js";
import { canSteal } from "../abilities.js";
import { openSteal } from "./stealMenu.js";
import { canSummon } from "../summon.js";
import { openSummon } from "./summonMenu.js";
import { findPath } from "../pathfinding.js";
import { startMoveAnimation } from "../sprites.js";
import {
  tileHasUsableBallista,
  enterBallista,
  exitBallista
} from "../inventory.js";


// ==========================================
// MENU INPUT STATE
// ==========================================

let movementMenuInputContext = null;
let selectedMenuIndex = 0;

// ==========================================
// CONTROLLER NAVIGATION
// ==========================================

function getVisibleMenuButtons() {
  const menu = document.getElementById("moveMenu");

  if (!menu) return [];

  return [...menu.querySelectorAll("button")].filter(button =>
    button.getClientRects().length > 0 &&
    !button.disabled
  );
}

function updateMenuHighlight() {
  const buttons = getVisibleMenuButtons();

  if (buttons.length === 0) return;

  selectedMenuIndex = Math.max(
    0,
    Math.min(selectedMenuIndex, buttons.length - 1)
  );

  buttons.forEach((button, index) => {
    button.classList.toggle(
      "menu-option-selected",
      index === selectedMenuIndex
    );
  });

  syncPromotionPreview(
    document.getElementById("moveMenu"),
    getPendingMove()?.unit,
    buttons[selectedMenuIndex]
  );
}

function moveMenuSelection(direction) {
  const buttons = getVisibleMenuButtons();

  if (buttons.length === 0) return;

  if (direction === "up" || direction === "left") {
    selectedMenuIndex--;
  } else {
    selectedMenuIndex++;
  }

  selectedMenuIndex =
    (selectedMenuIndex + buttons.length) % buttons.length;

  updateMenuHighlight();
}

function selectMenuOption() {
  const buttons = getVisibleMenuButtons();

  const selectedButton = buttons[selectedMenuIndex];

  if (selectedButton) {
    selectedButton.click();
  }
}

function handleMovementMenuBack() {
  const attackChoices =
    document.getElementById("attackChoices");

  if (attackChoices?.style.display === "block") {
    const cancelButton = [...attackChoices.querySelectorAll("button")]
      .find(button =>
        button.getClientRects().length > 0 &&
        button.textContent.trim().toUpperCase().includes("CANCEL")
      );

    if (cancelButton) {
      cancelButton.click();
      return;
    }
  }

  cancelMove();
}

function setupMovementMenuInput() {
  releaseMovementMenuInput();

  movementMenuInputContext = pushInputContext({
    up: () => moveMenuSelection("up"),
    down: () => moveMenuSelection("down"),
    left: () => moveMenuSelection("left"),
    right: () => moveMenuSelection("right"),
    select: selectMenuOption,
    back: handleMovementMenuBack
  });

  selectedMenuIndex = 0;
  updateMenuHighlight();
}

export function releaseMovementMenuInput() {
  if (!movementMenuInputContext) return;

  popInputContext(movementMenuInputContext);
  movementMenuInputContext = null;
}

// ==========================================
// MOVEMENT MENU
// ==========================================

// Recomputes targets and which action buttons apply at the destination.
export function refreshMoveMenu() {
  const move = getPendingMove();

  if (!move) return;

  const { unit, endX, endY } = move;

  move.targets = findAttackTargets(unit, endX, endY);

  const show = (id, on, shown = "") => {
    document.getElementById(id).style.display = on ? shown : "none";
  };

  show("attackOption", move.targets.length > 0, "inline-block");
  show("stealOption", canSteal(unit, endX, endY));
  show("staffOption", canUseHealingStaff(unit, endX, endY));
  show("captureOption", Boolean(getCapturableTile(unit, endX, endY)));
  show("destroyOption", Boolean(getDestroyableCave(unit, endX, endY)));
  show("shopOption", isShopTile(endX, endY));
  show("promoteOption", getPromotionOptions(unit).length > 0);
  show("tradeOption", canTrade(unit, endX, endY));
  show("summonOption", canSummon(unit, endX, endY));
  show(
    "ballistaOption",
    !unit.inBallista && tileHasUsableBallista(endX, endY, unit),
    "inline-block"
  );
  show("exitBallistaOption", Boolean(unit.inBallista), "inline-block");
}

export function requestMove(unit, startX, startY, endX, endY) {
  setPendingMove({
    unit,
    startX,
    startY,
    endX,
    endY,
    targets: [],
    wasMoved: unit.hasMoved
  });
  
  startMoveAnimation(unit, { x: startX, y: startY }, findPath(startX, startY, endX, endY, unit));

  // Move the unit immediately for the movement animation.
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

  document.getElementById("moveMenuTitle").textContent =
    "What will this unit do?";

  document.getElementById("moveActions").style.display = "block";
  document.getElementById("attackChoices").style.display = "none";

  refreshMoveMenu();

  document.getElementById("moveMenu").style.display = "block";

  setupMovementMenuInput();
}

export function beginMovedTrade() {
  const move = getPendingMove();

  if (!move) return;

  const moveMenu = document.getElementById("moveMenu");

  moveMenu.style.display = "none";

  openTrade(move.unit, move.endX, move.endY, () => {
    moveMenu.style.display = "block";
    refreshMoveMenu();
    updateMenuHighlight();
  });
}

export function beginMovedSteal() {
  const move = getPendingMove();

  if (!move) return;

  const moveMenu = document.getElementById("moveMenu");

  moveMenu.style.display = "none";

  openSteal(move.unit, move.endX, move.endY, stole => {
    if (stole) {
      confirmMove();   // stealing ends the unit's action
      return;
    }

    moveMenu.style.display = "block";
    refreshMoveMenu();
    updateMenuHighlight();
  });
}

export function beginMovedSummon() {
  const move = getPendingMove();

  if (!move) return;

  const moveMenu = document.getElementById("moveMenu");

  moveMenu.style.display = "none";

  openSummon(move.unit, move.endX, move.endY, summoned => {
    if (summoned) {
      confirmMove();   // summoning ends the summoner's action
      return;
    }

    moveMenu.style.display = "block";
    refreshMoveMenu();
    updateMenuHighlight();
  });
}

export function destroyAtDestination() {
  const move = getPendingMove();

  if (!move) return;
  if (!destroyCave(move.unit)) return;

  confirmMove();   // destroying ends the unit's action
}

export function confirmMove() {
  const move = getPendingMove();

  if (!move) return;

  // Finish the move and end this unit's action.
  move.unit.hasMoved = true;

  clearPendingMove();

  releaseMovementMenuInput();

  document.getElementById("moveMenu").style.display = "none";
}

export function cancelMove() {
  const move = getPendingMove();

  if (!move) return;
  
  if (move.unit.inBallista) exitBallista(move.unit, move.endX, move.endY);

  // Return the unit to its original square.
  gameGrid[move.endY][move.endX].unit = undefined;
  gameGrid[move.startY][move.startX].unit = move.unit;

  move.unit.hasMoved = move.wasMoved;
  move.unit.selected = false;

  clearPendingMove();

  gameCursor.moveToTarget({ x: move.startX, y: move.startY });
  gameCursor.route = [];

  releaseMovementMenuInput();

  document.getElementById("moveMenu").style.display = "none";
  document.getElementById("moveActions").style.display = "none";
}

export function captureAtDestination() {
  const move = getPendingMove();

  if (!move) return;
  if (!captureTile(move.unit)) return;

  confirmMove();
}

function showMoveActions() {
  document.getElementById("moveMenuTitle").textContent =
    "What will this unit do?";
  document.getElementById("attackPrompt").textContent = "";
  document.getElementById("attackOptions").innerHTML = "";
  document.getElementById("attackChoices").style.display = "none";
  document.getElementById("moveActions").style.display = "block";

  selectedMenuIndex = 0;
  updateMenuHighlight();
}

export function beginMovedPromote() {
  const move = getPendingMove();

  if (!move) return;

  const classes = getPromotionOptions(move.unit);

  if (classes.length === 0) return;

  const options = document.getElementById("attackOptions");

    options.innerHTML = promotionLayoutHtml(
    classes.map(name => `
      <button type="button" data-class="${escapeHtml(name)}">
        ${escapeHtml(name)}
      </button>
    `).join("") +
    `<button type="button" data-cancel="true">CANCEL</button>`
  );

  options.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.cancel) {
        showMoveActions();
        return;
      }

      if (promoteUnit(move.unit, button.dataset.class)) {
        options.innerHTML = "";
        document.getElementById("attackChoices").style.display = "none";
        confirmMove();   // promoting ends the unit's action
      }
    });
  });

  document.getElementById("moveMenuTitle").textContent = "Promote to?";
  document.getElementById("attackPrompt").textContent = "";
  document.getElementById("moveActions").style.display = "none";
  document.getElementById("attackChoices").style.display = "block";

  selectedMenuIndex = 0;
  updateMenuHighlight();
}

// Enter the ballista on the destination tile. Ends the unit's action.
export function beginMovedBallista() {
  const move = getPendingMove();
  if (!move) return;

  const { unit, endX, endY } = move;
  if (!enterBallista(unit, endX, endY)) return;

  // Recompute attack targets with the ballista as the equipped weapon.
  move.targets = findAttackTargets(unit, endX, endY);
  refreshMoveMenu();

  // If they can attack, leave the menu open so they can fire; otherwise wait.
  if (move.targets.length > 0) {
    showMoveActions();
  } else {
    confirmMove();
  }
}

// Leave the ballista on the destination tile (does not end the action by itself).
export function beginMovedExitBallista() {
  const move = getPendingMove();
  if (!move) return;

  const { unit, endX, endY } = move;
  if (!exitBallista(unit, endX, endY)) return;

  move.targets = findAttackTargets(unit, endX, endY);
  refreshMoveMenu();
  showMoveActions();
}
