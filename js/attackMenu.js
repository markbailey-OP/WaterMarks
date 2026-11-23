import {
  gameGrid,
  sel,
  gameCursor,
  side,
  getUnitPosition,
  setAttackTargets,
  setSelectedAttackTarget
} from "../gameState.js";

import {
  findAttackTargets,
  getAttackTiles
} from "./targeting.js";

import {
  getPendingMove,
  clearPendingMove,
  getInspectedUnit,
  setInspectedUnit,
  getActiveAttack,
  setActiveAttack,
  clearActiveAttack
} from "./attackState.js";

import { exitBallista } from "../inventory.js";
import { showCombatPreview } from "./combatPreview.js";
import { performAttack } from "./combatResolution.js";
import { releaseMovementMenuInput } from "./movementMenu.js";

import {
  pushInputContext,
  popInputContext
} from "../input.js";

// ==========================================
// WEAPON MENU INPUT
// ==========================================

let weaponMenuInputContext = null;
let weaponMenuIndex = 0;

function closeWeaponMenuInput() {
  if (!weaponMenuInputContext) return;

  popInputContext(weaponMenuInputContext);
  weaponMenuInputContext = null;
}

function updateWeaponMenuHighlight() {
  const options = document.getElementById("attackOptions");
  const buttons = [...options.querySelectorAll("button")];

  buttons.forEach((button, index) => {
    button.classList.toggle(
      "menu-option-selected",
      index === weaponMenuIndex
    );
  });
}

function openWeaponMenuInput() {
  closeWeaponMenuInput();

  weaponMenuInputContext = pushInputContext({
    up: () => {
      const buttons = document.querySelectorAll(
        "#attackOptions button"
      );

      if (!buttons.length) return;

      weaponMenuIndex =
        (weaponMenuIndex - 1 + buttons.length) % buttons.length;

      updateWeaponMenuHighlight();
    },

    left: () => {
      const buttons = document.querySelectorAll(
        "#attackOptions button"
      );

      if (!buttons.length) return;

      weaponMenuIndex =
        (weaponMenuIndex - 1 + buttons.length) % buttons.length;

      updateWeaponMenuHighlight();
    },

    down: () => {
      const buttons = document.querySelectorAll(
        "#attackOptions button"
      );

      if (!buttons.length) return;

      weaponMenuIndex =
        (weaponMenuIndex + 1) % buttons.length;

      updateWeaponMenuHighlight();
    },

    right: () => {
      const buttons = document.querySelectorAll(
        "#attackOptions button"
      );

      if (!buttons.length) return;

      weaponMenuIndex =
        (weaponMenuIndex + 1) % buttons.length;

      updateWeaponMenuHighlight();
    },

    select: () => {
      const buttons = document.querySelectorAll(
        "#attackOptions button"
      );

      buttons[weaponMenuIndex]?.click();
    },

    back: () => {
      showAttackTargets();
    }
  });
}

// ==========================================
// ATTACK RANGE
// ==========================================

function getAttackRangeTiles(unit, originX, originY) {
  return getAttackTiles(unit, [{ x: originX, y: originY }]);
}

// ==========================================
// START ATTACK
// ==========================================

function startAttack(
  unit,
  targets,
  originalX,
  originalY,
  destinationX,
  destinationY,
  movedToAttackPosition
) {
  // Release movement-menu controls so cursor.js
  // can handle attack-target selection.
  releaseMovementMenuInput();

  const attack = {
    unit,
    targets,
    originalX,
    originalY,
    destinationX,
    destinationY,
    movedToAttackPosition,
    attackRange: getAttackRangeTiles(
      unit,
      destinationX,
      destinationY
    ),
    choosingTarget: true
  };

  setActiveAttack(attack);

  // Temporarily move the unit if attacking after moving.
  if (movedToAttackPosition) {
    gameGrid[originalY][originalX].unit = undefined;
    gameGrid[destinationY][destinationX].unit = unit;
  }

  unit.selected = false;

  delete unit.moves;
  delete unit.dist;
  delete unit.attackRange;
  delete unit.possibleRange;

  sel.bool = false;
  sel.xCoord = undefined;
  sel.yCoord = undefined;

  gameCursor.route = [];

  setAttackTargets(targets);

  // Default to the first target.
  const firstTarget = targets[0];

  setSelectedAttackTarget(firstTarget);
  gameCursor.moveToTarget(firstTarget);

  // Hide the menus during target selection.
  document.getElementById("unitMenu").style.display = "none";
  document.getElementById("moveActions").style.display = "none";
  document.getElementById("attackChoices").style.display = "none";
  document.getElementById("moveMenu").style.display = "none";
}

// ==========================================
// ATTACK AFTER MOVING
// ==========================================

export function beginAttack() {
  const move = getPendingMove();

  if (!move || move.targets.length === 0) return;

  clearPendingMove();

  startAttack(
    move.unit,
    move.targets,
    move.startX,
    move.startY,
    move.endX,
    move.endY,
    true
  );
}

// ==========================================
// STATIONARY ATTACK
// ==========================================

export function beginStationaryAttack() {
  const unit = getInspectedUnit();

  if (!unit) return;

  // Only allow the current side to attack with an available unit.
  if (unit.team !== side || unit.hasMoved) return;

  const position = getUnitPosition(unit);

  if (!position) return;

  const unitX = position.x;
  const unitY = position.y;

  const targets = findAttackTargets(unit, unitX, unitY);

  if (targets.length === 0) return;

  startAttack(
    unit,
    targets,
    unitX,
    unitY,
    unitX,
    unitY,
    false
  );

  setInspectedUnit(null);
}

// ==========================================
// CANCEL ATTACK
// ==========================================

export function cancelAttack() {
  const attack = getActiveAttack();

  if (!attack) return;
  
  closeWeaponMenuInput();

  const unit = attack.unit;

	if (attack.movedToAttackPosition && unit.inBallista) {
	  exitBallista(unit, attack.destinationX, attack.destinationY);
	}
  // Restore the unit if it temporarily moved to attack.
  if (attack.movedToAttackPosition) {
    gameGrid[attack.destinationY][attack.destinationX].unit = undefined;
    gameGrid[attack.originalY][attack.originalX].unit = unit;
  }

  // The cancelled attack does not consume the unit's action.
  unit.hasMoved = false;
  unit.selected = false;

  clearActiveAttack();

  setAttackTargets([]);
  setSelectedAttackTarget(null);

  gameCursor.route = [];

  sel.bool = false;
  sel.xCoord = undefined;
  sel.yCoord = undefined;

  document.getElementById("attackChoices").style.display = "none";
  document.getElementById("moveActions").style.display = "none";
  document.getElementById("moveMenu").style.display = "none";

  const cancelButton =
    document.getElementById("cancelAttackButton");

  if (cancelButton) {
    cancelButton.style.display = "none";
  }
}

// ==========================================
// TARGET SELECTION
// ==========================================

export function chooseAttackTarget(target) {
  const attack = getActiveAttack();

  if (!attack || !attack.targets.includes(target)) return;

  setSelectedAttackTarget(target);

  showAttackWeapons(target);
}

function showAttackTargets() {
  const attack = getActiveAttack();

  if (!attack || attack.targets.length === 0) return;
  
  closeWeaponMenuInput();
  attack.choosingTarget = true;

  // Hide the menus while choosing a target.
  document.getElementById("attackChoices").style.display = "none";
  document.getElementById("moveMenu").style.display = "none";

  const cancelButton =
    document.getElementById("cancelAttackButton");

  if (cancelButton) {
    cancelButton.style.display = "none";
  }

  // Restore the selected target, or default to the first.
  const target = attack.targets.includes(
    getSelectedTarget()
  )
    ? getSelectedTarget()
    : attack.targets[0];

  setSelectedAttackTarget(target);
  gameCursor.moveToTarget(target);
}

// Helper to read the current selected target.
function getSelectedTarget() {
  const attack = getActiveAttack();

  if (!attack) return null;

  return attack.targets.find(
    target =>
      target.x === gameCursor.x &&
      target.y === gameCursor.y
  ) ?? null;
}

// ==========================================
// WEAPON SELECTION
// ==========================================

// "Iron Sword (38/45)". Unlimited weapons (monster claws, "N/A") show ∞.
function usesLabel(weapon) {
  return Number.isFinite(weapon.uses)
    ? `${weapon.uses}/${weapon.maxUses ?? weapon.uses}`
    : "∞";
}

function showAttackWeapons(target) {
  const attack = getActiveAttack();

  if (!attack) return;

  attack.choosingTarget = false;

  const options = document.getElementById("attackOptions");
  options.innerHTML = "";

  attack.target = target;
  attack.preview = null;

  document.getElementById("moveMenu").style.display = "block";
  document.getElementById("attackChoices").style.display = "block";

  const previewTitle = document.getElementById("moveMenuTitle");
  previewTitle.style.display = "";
  previewTitle.textContent = "Choose Weapon";

  document.getElementById("attackPrompt").textContent =
    `Target: ${target.name}`;

  const cancelButton =
    document.getElementById("cancelAttackButton");

  if (cancelButton) {
    cancelButton.style.display = "none";
  }

  for (const weapon of target.weapons) {
    const button = document.createElement("button");

    const equipped =
      weapon.equipped ||
      attack.unit.equippedWeapon === weapon;

    button.textContent =
  `${weapon.name} (${usesLabel(weapon)})` +
  (equipped ? " [E]" : "");

    button.addEventListener("click", () => {
      closeWeaponMenuInput();

      if (target.type === "unit") {
        showCombatPreview(
          weapon,
          performAttack,
          showAttackWeapons
        );
      } else {
        performAttack(weapon);
      }
    });

    options.appendChild(button);
  }

  weaponMenuIndex = 0;
  updateWeaponMenuHighlight();
  openWeaponMenuInput();
}