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
  getActiveAttack,
  setActiveAttack,
  clearActiveAttack
} from "./attackState.js";

import { exitBallista } from "../inventory.js";
import { showCombatPreview } from "./combatPreview.js";
import { performAttack } from "./combatResolution.js";

import {
  pushInputContext,
  popInputContext
} from "../input.js";

// ==========================================
// THE ATTACK MENU
// ==========================================
// #attackMenu only appears while choosing a weapon (and for the combat
// preview). Everything before that is the unit menu (unitMenu.js).

const attackMenuElement = () => document.getElementById("attackMenu");

function hideAttackMenu() {
  const menu = attackMenuElement();

  if (menu) menu.style.display = "none";
}

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

function moveWeaponSelection(step) {
  const buttons = document.querySelectorAll("#attackOptions button");

  if (!buttons.length) return;

  weaponMenuIndex = (weaponMenuIndex + step + buttons.length) % buttons.length;

  updateWeaponMenuHighlight();
}

function openWeaponMenuInput() {
  closeWeaponMenuInput();

  weaponMenuInputContext = pushInputContext({
    up: () => moveWeaponSelection(-1),
    left: () => moveWeaponSelection(-1),
    down: () => moveWeaponSelection(1),
    right: () => moveWeaponSelection(1),

    select: () => {
      document.querySelectorAll("#attackOptions button")[weaponMenuIndex]
        ?.click();
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
  const attack = {
    unit,
    targets,
    originalX,
    originalY,
    destinationX,
    destinationY,
    movedToAttackPosition,
    attackRange: getAttackRangeTiles(unit, destinationX, destinationY),
    choosingTarget: true
  };

  setActiveAttack(attack);

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

  hideAttackMenu();
}

// ==========================================
// BEGIN ATTACK (the unit menu's ATTACK button)
// ==========================================

// Works the same for a unit that moved first and one that did not. The
// caller closes the unit menu before calling this.
export function beginAttack(unit) {
  if (!unit || unit.team !== side || unit.hasMoved) return;

  const position = getUnitPosition(unit);

  if (!position) return;

  const targets = findAttackTargets(unit, position.x, position.y);

  if (targets.length === 0) return;

  const move = getPendingMove();

  if (move?.unit === unit) {
    // Cancelling the attack later undoes the move too.
    clearPendingMove();

    startAttack(
      unit,
      targets,
      move.startX,
      move.startY,
      position.x,
      position.y,
      true
    );
  } else {
    startAttack(
      unit,
      targets,
      position.x,
      position.y,
      position.x,
      position.y,
      false
    );
  }
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

  // Restore the unit if it moved before attacking.
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

  hideAttackMenu();
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

  hideAttackMenu();

  // Restore the selected target, or default to the first.
  const current = getSelectedTarget();
  const target = attack.targets.includes(current) ? current : attack.targets[0];

  setSelectedAttackTarget(target);
  gameCursor.moveToTarget(target);
}

// The target under the cursor, if it is one of the attack's targets.
function getSelectedTarget() {
  const attack = getActiveAttack();

  if (!attack) return null;

  return attack.targets.find(
    target => target.x === gameCursor.x && target.y === gameCursor.y
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

  attackMenuElement().style.display = "block";

  const title = document.getElementById("attackMenuTitle");
  title.style.display = "";
  title.textContent = "Choose Weapon";

  document.getElementById("attackPrompt").textContent =
    `Target: ${target.name}`;

  for (const weapon of target.weapons) {
    const button = document.createElement("button");

    const equipped =
      weapon.equipped || attack.unit.equippedWeapon === weapon;

    button.textContent =
      `${weapon.name} (${usesLabel(weapon)})` + (equipped ? " [E]" : "");

    button.addEventListener("click", () => {
      closeWeaponMenuInput();

      if (target.type === "unit") {
        showCombatPreview(weapon, performAttack, showAttackWeapons);
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
