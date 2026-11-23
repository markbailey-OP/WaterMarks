import {
  gameGrid,
  gameCursor,
  sel,
  side,
  getUnitPosition
} from "../gameState.js";
import { isImmobile, currentStatus, getStatusList } from "../status.js";
import {
  equipItem,
  consumeWeaponUse,
  tileHasUsableBallista,
  enterBallista,
  exitBallista,
  isBallista
} from "../inventory.js";
import { escapeHtml, statMarkup, levelLabel } from "../utils.js";
import { findAttackTargets, canUseHealingStaff } from "./targeting.js";
import { beginStationaryAttack } from "./attackMenu.js";
import { confirmMove } from "./movementMenu.js";
import { canTrade, openTrade } from "./tradeMenu.js";
import { canSummon } from "../summon.js";
import { openSummon } from "./summonMenu.js";
import {
  getCapturableTile,
  captureTile,
  promoteUnit,
  unlockUnit,
  isLord,
  getDestroyableCave,
  destroyCave
} from "../strongholds.js";
import { 
  openShop, 
  isShopTile, 
  beginBracePlacement, 
  canPlaceUnit 
} from "./shopMenu.js";
import {
  getPendingMove,
  getInspectedUnit,
  setInspectedUnit,
  getInspectedItemIndex,
  setInspectedItemIndex,
  getActiveUnitView,
  setActiveUnitView
} from "./attackState.js";
import {
  isHealingItem,
  canUseHealingItem,
  useHealingItem,
  isBraceItem,
  isCureItem, 
  isResItem, 
  canUseItemEffect, 
  useItemEffect,
  BRACE_UNITS
} from "./itemResolution.js";
import { 
  pushInputContext, 
  popInputContext, 
  NO_INPUT 
} from "../input.js";

import { 
  promotionLayoutHtml, 
  syncPromotionPreview 
} from "./promotionPreview.js";

import { openStaffMenu } from "./staffMenu.js";
import { getPromotionOptions } from "../promotion.js";
import { isWeapon } from "../combat.js";
import { canSteal } from "../abilities.js";
import { openSteal } from "./stealMenu.js";
import { removeUnitFromMap } from "./combatAnimation.js";


// ==========================================
// MENU STATE
// ==========================================

let unitMenuInputContext = null;
let selectedMenuIndex = 0;
let menuClickListenerAdded = false;
let inspectionReturn = null;
let statusTimer = null;

function stopStatusLine() {
  clearInterval(statusTimer);
  statusTimer = null;
}

function paintStatusLine(unit) {
  const element = document.getElementById("unitStatusLine");

  if (!element) {
    stopStatusLine();
    return;
  }

  const status = currentStatus(unit);

  element.textContent = status ? status.label : "None";
  element.className = status ? `status-${status.type}` : "";
}

// With several statuses, the line repaints so they take turns.
function startStatusLine(unit) {
  stopStatusLine();
  paintStatusLine(unit);

  if (getStatusList(unit).length > 1) {
    statusTimer = setInterval(() => paintStatusLine(unit), 250);
  }
}

// ==========================================
// UNIT ACTION AVAILABILITY
// ==========================================

function hasPendingMove(unit) {
  return getPendingMove()?.unit === unit;
}

function canActWithUnit(unit) {
  return (
    unit.team === side &&
    !unit.hasMoved &&
    !isImmobile(unit) &&
    !hasPendingMove(unit)
  );
}

function canUseItems(unit) {
  return unit.team === side && !unit.hasMoved && !isImmobile(unit);
}

function canEquipItems(unit) {
  return unit.team === side && !unit.hasMoved && !isImmobile(unit);
}

// Same ending as a staff: confirm a pending move, or just mark the unit done.
function finishItemAction(unit) {
  if (getPendingMove()?.unit === unit) {
    confirmMove();
  } else {
    unit.hasMoved = true;
    if (sel.bool) gameCursor.back();
  }

  closeUnitMenu();
}

async function useItem(unit, item) {
  const lock = pushInputContext(NO_INPUT);

  document.getElementById("unitMenu").style.display = "none";

  try {
    await useItemEffect(unit, item);
  } catch (error) {
    console.error("Item failed:", error);
  } finally {
    popInputContext(lock);
    finishItemAction(unit);
  }
}

function useBrace(unit, item) {
  const className = BRACE_UNITS[item.name];
  const menu = document.getElementById("unitMenu");

  menu.style.display = "none";

  beginBracePlacement(unit, className, placed => {
    if (!placed) {
      menu.style.display = "block";
      updateMenuHighlight();
      return;
    }

    unlockUnit(unit.team, className);
    consumeWeaponUse(unit, item);
    finishItemAction(unit);
  });
}

function itemActionHtml(unit, item, index, equipped, canEquip) {
	  if (isBraceItem(item)) {
    if (!canUseItems(unit)) return "<p><em>Viewing only</em></p>";

    if (!canPlaceUnit(unit.team, BRACE_UNITS[item.name])) {
      return "<p><em>Nothing to unlock</em></p>";
    }

    return `
      <button type="button" data-action="use-item" data-index="${index}">
        USE
      </button>`;
  }
  
  if (isHealingItem(item)) {
    if (!canUseItems(unit)) return "<p><em>Viewing only</em></p>";
    if (!canUseHealingItem(unit, item)) return "<p><em>HP is already full</em></p>";

    return `
      <button type="button" data-action="use-item" data-index="${index}">
        USE
      </button>`;
  }
  
    if (isCureItem(item) || isResItem(item)) {
    if (!canUseItems(unit)) return "<p><em>Viewing only</em></p>";

    if (!canUseItemEffect(unit, item)) {
      return isCureItem(item)
        ? "<p><em>Not poisoned</em></p>"
        : "<p><em>Already boosted</em></p>";
    }

    return `
      <button type="button" data-action="use-item" data-index="${index}">
        USE
      </button>`;
  }

  if (!isWeapon(item)) return "";
  if (equipped) return "<p><strong>Equipped</strong></p>";
  if (!canEquip) return "<p><em>Viewing only</em></p>";

  return `
    <button type="button" data-action="equip-item" data-index="${index}">
      EQUIP
    </button>`;
}

function canUseStaff(unit) {
  const position = getUnitPosition(unit);

  return position
    ? canUseHealingStaff(unit, position.x, position.y)
    : false;
}

// ==========================================
// CONTROLLER MENU NAVIGATION
// ==========================================

function getVisibleMenuButtons() {
  const menu = document.getElementById("unitMenu");

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
    if (index === selectedMenuIndex) {
      button.style.outline = "3px solid yellow";
      button.style.outlineOffset = "2px";
      button.style.backgroundColor = "#444";
      button.style.color = "white";
    } else {
      button.style.outline = "";
      button.style.outlineOffset = "";
      button.style.backgroundColor = "";
      button.style.color = "";
    }
  });
    syncPromotionPreview(
    document.getElementById("unitMenu"),
    getInspectedUnit(),
    buttons[selectedMenuIndex]
  );
}

function moveMenuSelection(direction) {
  const buttons = getVisibleMenuButtons();

  if (buttons.length === 0) return;

  if (direction === "up" || direction === "left") {
    selectedMenuIndex--;
  } else if (direction === "down" || direction === "right") {
    selectedMenuIndex++;
  }

  // Wrap around through the available options.
  selectedMenuIndex =
    (selectedMenuIndex + buttons.length) % buttons.length;

  updateMenuHighlight();
}

function selectMenuOption() {
  const buttons = getVisibleMenuButtons();

  buttons[selectedMenuIndex]?.click();
}

function setupUnitMenuInput() {
  if (unitMenuInputContext) {
    popInputContext(unitMenuInputContext);
  }

  unitMenuInputContext = pushInputContext({
    up: () => moveMenuSelection("up"),
    down: () => moveMenuSelection("down"),
    left: () => moveMenuSelection("left"),
    right: () => moveMenuSelection("right"),
    select: selectMenuOption,
    back: handleUnitMenuBack
  });

  const menu = document.getElementById("unitMenu");

  if (!menuClickListenerAdded) {
    menu.addEventListener("click", event => {
      const button = event.target.closest("button");

      // Staff-menu buttons are handled by staffMenu.js.
      if (!button || button.closest("#staffMenu")) return;

      const buttons = getVisibleMenuButtons();
      const index = buttons.indexOf(button);

      if (index !== -1) {
        selectedMenuIndex = index;
        updateMenuHighlight();
      }

      handleMenuAction(button);
    });

    menuClickListenerAdded = true;
  }

  selectedMenuIndex = 0;
  updateMenuHighlight();
}

// ==========================================
// MENU ACTION HANDLING
// ==========================================

function handleMenuAction(button) {
  const action = button.dataset.action;

  if (!action) return;

  switch (action) {
    case "attack":
      releaseUnitMenuInput();
      beginStationaryAttack();
      break;

    case "ballista": {
  const unit = getInspectedUnit();
  const position = getUnitPosition(unit);
  if (!unit || !position || !canActWithUnit(unit)) return;
  if (!enterBallista(unit, position.x, position.y)) return;
  if (sel.bool) gameCursor.getMoves(unit);   // move is now 0: refresh tiles
  // Stay in the unit menu so they can attack with the ballista or wait.
  renderUnitOptions();
  updateMenuHighlight();
  break;
}

case "exit-ballista": {
  const unit = getInspectedUnit();
  const position = getUnitPosition(unit);
  if (!unit || !position || !canActWithUnit(unit)) return;
  if (!exitBallista(unit, position.x, position.y)) return;
  if (sel.bool) gameCursor.getMoves(unit);   // move is restored: refresh tiles
  renderUnitOptions();
  updateMenuHighlight();
  break;
}

    case "staff": {
      const unit = getInspectedUnit();

      if (!unit || !canActWithUnit(unit)) return;

      openStaffMenu(unit, showUnitOptions);
      break;
    }
    
            case "use-item": {
      const unit = getInspectedUnit();
      const item = unit?.inventory?.[Number(button.dataset.index)];

      if (!unit || !canUseItems(unit)) return;

      if (isBraceItem(item)) {
        if (canPlaceUnit(unit.team, BRACE_UNITS[item.name])) useBrace(unit, item);
      } else if (canUseHealingItem(unit, item)) {
        useItem(unit, item);
      } else if (canUseItemEffect(unit, item)) {
        useItem(unit, item);
      }
      break;
    }
    
        case "capture": {
      const unit = getInspectedUnit();

      if (!unit || !canActWithUnit(unit)) return;

      if (captureTile(unit)) waitWithUnit();
      break;
    }
    
	case "destroy": {
	  const unit = getInspectedUnit();
	
	  if (!unit || !canActWithUnit(unit)) return;
	
	  if (destroyCave(unit)) waitWithUnit();
	  break;
	}
    
    case "promote":
  showPromotionChoices();
  break;

case "promote-to": {
  const unit = getInspectedUnit();

  if (!unit || !canActWithUnit(unit)) return;

  if (promoteUnit(unit, button.dataset.class)) waitWithUnit();
  break;
}
    
        case "shop": {
      const unit = getInspectedUnit();
      if (!unit || !canActWithUnit(unit)) return;
      const menu = document.getElementById("unitMenu");
      menu.style.display = "none";
      openShop(unit, didTransact => {
        if (didTransact) {
          waitWithUnit();
          return;
        }
        menu.style.display = "block";
        showUnitOptions();
      });
      break;
    }
        
            case "trade": {
      const unit = getInspectedUnit();
      const position = unit && getUnitPosition(unit);

      if (!unit || !position || !canActWithUnit(unit)) return;

      openTrade(unit, position.x, position.y, () => showUnitOptions());
      break;
    }
    
        case "steal": {
      const unit = getInspectedUnit();
      const position = unit && getUnitPosition(unit);

      if (!unit || !position || !canActWithUnit(unit)) return;

      const menu = document.getElementById("unitMenu");

      menu.style.display = "none";

      openSteal(unit, position.x, position.y, stole => {
        if (stole) {
          waitWithUnit();   // stealing ends the unit's action
          return;
        }

        menu.style.display = "block";
        showUnitOptions();
      });
      break;
    }   
    
        case "summon": {
      const unit = getInspectedUnit();
      const position = unit && getUnitPosition(unit);

      if (!unit || !position || !canActWithUnit(unit)) return;

      const menu = document.getElementById("unitMenu");

      menu.style.display = "none";

      openSummon(unit, position.x, position.y, summoned => {
        if (summoned) {
          waitWithUnit();   // summoning ends the summoner's action
          return;
        }

        menu.style.display = "block";
        showUnitOptions();
      });
      break;
    }

    case "items":
      showItems();
      break;

    case "stats":
      checkStats();
      break;
      
    case "retreat":
      showRetreatConfirm();
      break;

    case "retreat-yes": {
      const unit = getInspectedUnit();

      if (!unit || !canActWithUnit(unit) || isLord(unit)) return;

      retreatUnit(unit);
      break;
    }

    case "wait":
      waitWithUnit();
      break;

    case "toggle-view":
      toggleUnitView();
      break;

    case "root":
      showUnitOptions();
      break;

    case "inspect-item": {
      const index = Number(button.dataset.index);

      setInspectedItemIndex(
        getInspectedItemIndex() === index ? null : index
      );

      selectedMenuIndex = 0;
      renderUnitItems();
      break;
    }

    case "equip-item": {
      const index = Number(button.dataset.index);
      const unit = getInspectedUnit();

      if (!unit || !canEquipItems(unit)) return;

      if (equipItem(unit, index)) {
  setInspectedItemIndex(0);
  renderUnitItems();
}

      break;
    }
  }
}

// ==========================================
// SCREEN NAVIGATION
// ==========================================

function getItemsScreen() {
  const menu = document.getElementById("unitMenu");

  let itemsScreen = document.getElementById("unitItems");

  if (!itemsScreen) {
    itemsScreen = document.createElement("div");
    itemsScreen.id = "unitItems";
    itemsScreen.style.display = "none";

    menu.appendChild(itemsScreen);
  }

  return itemsScreen;
}

function getItemDetailsScreen() {
  const itemsScreen = getItemsScreen();

  let detailsScreen =
    itemsScreen.querySelector("#unitItemDetails");

  if (!detailsScreen) {
    detailsScreen = document.createElement("div");
    detailsScreen.id = "unitItemDetails";
    detailsScreen.style.display = "none";

    itemsScreen.appendChild(detailsScreen);
  }

  return detailsScreen;
}

function showUnitOptions() {
  document.getElementById("unitOptions").style.display = "block";
  document.getElementById("unitDetails").style.display = "none";
  getItemsScreen().style.display = "none";

  selectedMenuIndex = 0;
  renderUnitOptions();
  updateMenuHighlight();
}

function showRetreatConfirm() {
  const unit = getInspectedUnit();

  if (!unit || !canActWithUnit(unit)) return;

  document.getElementById("unitOptions").innerHTML = `
    <h3>RETREAT</h3>

    <p>Are you sure you want ${escapeHtml(unit.name)} to retreat?</p>

    <button type="button" data-action="retreat-yes">YES</button>
    <button type="button" data-action="root">NO</button>
  `;

  // Default to NO so a stray select press can't remove the unit.
  selectedMenuIndex = 1;
  updateMenuHighlight();
}

// Removes the unit from the map. Nobody earns EXP or gold.
function retreatUnit(unit) {
  // Clears the selection, move range and attack range overlays.
  if (sel.bool) gameCursor.back();

  removeUnitFromMap(unit);
  closeUnitMenu();
}

function showPromotionChoices() {
  const unit = getInspectedUnit();

  if (!unit) return;

    document.getElementById("unitOptions").innerHTML = `
    <h3>PROMOTE TO</h3>

    ${promotionLayoutHtml(`
      ${getPromotionOptions(unit).map(name => `
        <button type="button" data-action="promote-to"
                data-class="${escapeHtml(name)}">
          ${escapeHtml(name)}
        </button>
      `).join("")}

      <button type="button" data-action="root">
        BACK
      </button>
    `)}
  `;

  selectedMenuIndex = 0;
  updateMenuHighlight();
}

function showItems() {
  document.getElementById("unitOptions").style.display = "none";
  document.getElementById("unitDetails").style.display = "none";

  getItemsScreen().style.display = "block";
  getItemDetailsScreen().style.display = "none";

  setInspectedItemIndex(null);

  selectedMenuIndex = 0;
  renderUnitItems();
  updateMenuHighlight();
}

function handleUnitMenuBack() {
  const itemsVisible =
    getItemsScreen().style.display === "block";

  const detailsVisible =
    document.getElementById("unitDetails").style.display === "block";
    
      if (document.querySelector(
    '#unitOptions [data-action="promote-to"], #unitOptions [data-action="retreat-yes"]'
  )) {
    showUnitOptions();
    return;
  }

  // If an item is selected, first return to the inventory list.
  if (itemsVisible && getInspectedItemIndex() !== null) {
    setInspectedItemIndex(null);
    renderUnitItems();
    return;
  }

  // If this inspection came from the context menu,
  // return to that same context menu.
  if (inspectionReturn) {
    const returnToContext = inspectionReturn;
    inspectionReturn = null;

    closeUnitMenu();
    returnToContext();
    return;
  }

  // Normal unit menu navigation.
  if (itemsVisible || detailsVisible) {
    showUnitOptions();
    return;
  }

  closeUnitMenu();
}



// ==========================================
// UNIT INSPECTION MENU
// ==========================================

// ITEMS / STATS straight from the post-move menu. BACK returns to it.
function openMovedInspection(open) {
  const move = getPendingMove();

  if (!move) return;

  const moveMenu = document.getElementById("moveMenu");

  moveMenu.style.display = "none";

  open(move.unit, () => {
    moveMenu.style.display = "block";
  });
}

export function inspectMovedStats() {
  openMovedInspection(openUnitStats);
}

export function inspectMovedItems() {
  openMovedInspection(openUnitItems);
}

export function inspectMovedUnit() {
  const pendingMove = getPendingMove();

  if (!pendingMove) return;

  openUnitMenu(pendingMove.unit);
}

export function openUnitMenu(unit) {
  setInspectedUnit(unit);
  setInspectedItemIndex(null);
  setActiveUnitView("stats");

  document.getElementById("unitMenu").style.display = "block";

  showUnitOptions();
  setupUnitMenuInput();
}

export function closeUnitMenu() {
  setInspectedUnit(null);
  setInspectedItemIndex(null);
  inspectionReturn = null;
  stopStatusLine();

  releaseUnitMenuInput();

  document.getElementById("unitMenu").style.display = "none";
  document.getElementById("unitOptions").style.display = "block";
  document.getElementById("unitDetails").style.display = "none";

  getItemsScreen().style.display = "none";

  const staffMenu = document.getElementById("staffMenu");
  if (staffMenu) staffMenu.style.display = "none";
}

// ==========================================
// UNIT OPTIONS
// ==========================================

export function releaseUnitMenuInput() {
  if (!unitMenuInputContext) return;

  popInputContext(unitMenuInputContext);
  unitMenuInputContext = null;
}

function renderUnitOptions() {
  const unit = getInspectedUnit();

  if (!unit) return;

  const optionsElement = document.getElementById("unitOptions");

  const canAct = canActWithUnit(unit);
  const position = getUnitPosition(unit);

  const targets = canAct
    ? findAttackTargets(unit, position?.x ?? gameCursor.x, position?.y ?? gameCursor.y)
    : [];

  const canAttack = targets.length > 0;
  const canStaff = canAct && canUseStaff(unit);
  const canCapture =
    canAct && position && getCapturableTile(unit, position.x, position.y);
  const canDestroy =
    canAct && position && getDestroyableCave(unit, position.x, position.y);
  const canShop = canAct && position && isShopTile(position.x, position.y);
  const canPromote = canAct && getPromotionOptions(unit).length > 0;
  const canTradeNow =
    canAct && position && canTrade(unit, position.x, position.y);
  const canStealNow =
    canAct && position && canSteal(unit, position.x, position.y);
  const canSummonNow =
    canAct && position && canSummon(unit, position.x, position.y);
  const canBallista =
    canAct &&
    position &&
    !unit.inBallista &&
    tileHasUsableBallista(position.x, position.y, unit);
  const canExitBallista = canAct && Boolean(unit.inBallista);
  const canRetreat = canAct && !isLord(unit);

  optionsElement.innerHTML = `
    <h3>${escapeHtml(unit.className ?? unit.name)}</h3>

    ${canAttack ? `<button type="button" data-action="attack">ATTACK</button>` : ""}
    ${canStealNow ? `<button type="button" data-action="steal">STEAL</button>` : ""}
    ${canSummonNow ? `<button type="button" data-action="summon">SUMMON</button>` : ""}
    ${canStaff ? `<button type="button" data-action="staff">STAFF</button>` : ""}
    ${canCapture ? `<button type="button" data-action="capture">CAPTURE</button>` : ""}
    ${canDestroy ? `<button type="button" data-action="destroy">DESTROY</button>` : ""}
    ${canPromote ? `<button type="button" data-action="promote">PROMOTE</button>` : ""}
    ${canShop ? `<button type="button" data-action="shop">SHOP</button>` : ""}
    ${canTradeNow ? `<button type="button" data-action="trade">TRADE</button>` : ""}
    ${canBallista ? `<button type="button" data-action="ballista">BALLISTA</button>` : ""}
    ${canExitBallista ? `<button type="button" data-action="exit-ballista">EXIT</button>` : ""}

    <button type="button" data-action="items">ITEMS</button>
    <button type="button" data-action="stats">STATS</button>
    ${canRetreat ? `<button type="button" data-action="retreat">RETREAT</button>` : ""}
    ${canAct ? `<button type="button" data-action="wait">WAIT</button>` : ""}
  `;
}

// ==========================================
// WAIT
// ==========================================

function waitWithUnit() {
  const unit = getInspectedUnit();

  if (!unit || !canActWithUnit(unit)) return;

  const pendingMove = getPendingMove();

  if (pendingMove?.unit === unit) {
    // The move menu already cleared the selection.
    confirmMove();
  } else {
    unit.hasMoved = true;

    // The unit was selected on the map and never moved, so clear
    // its selection, movement range, and attack range overlays.
    if (sel.bool) {
      gameCursor.back();
    }
  }

  closeUnitMenu();
}

// ==========================================
// STATS AND WEAPON RANK VIEW
// ==========================================

export function checkStats() {
  if (!getInspectedUnit()) return;

  document.getElementById("unitOptions").style.display = "none";
  document.getElementById("unitDetails").style.display = "block";

  getItemsScreen().style.display = "none";

  setActiveUnitView("stats");

  updateUnitView();

  selectedMenuIndex = 0;
  updateMenuHighlight();
}

export function toggleUnitView() {
  if (!getInspectedUnit()) return;

  setActiveUnitView(
    getActiveUnitView() === "stats" ? "weapons" : "stats"
  );

  updateUnitView();

  selectedMenuIndex = 0;
  updateMenuHighlight();
}

function updateUnitView() {
  const statsElement = document.getElementById("unitStats");
  const weaponsElement = document.getElementById("unitWeapons");
  const buttonsElement = document.getElementById("unitDetailButtons");

  const isStatsView = getActiveUnitView() === "stats";

  statsElement.style.display = isStatsView ? "block" : "none";
  weaponsElement.style.display = isStatsView ? "none" : "block";

  buttonsElement.innerHTML = `
    <button type="button" data-action="toggle-view">
      ${isStatsView ? "WEAPON RANKS" : "STATS"}
    </button>
  `;

  if (isStatsView) {
    renderUnitStats();
  } else {
    renderUnitWeapons();
  }
}

// ==========================================
// STAT DISPLAY
// ==========================================

function renderUnitStats(unit = getInspectedUnit(), options = {}) {
  if (!unit) return;

  const statsElement = document.getElementById("unitStats");
  const level = options.level ?? unit.lvl;

  const levelClass = level >= 20
    ? "stat-capped"
    : options.levelColor === "old"
      ? "level-old"
      : options.levelColor === "new"
        ? "level-new"
        : "";

  const values = options.values ?? {};

  const maxHp = values.maxHp ?? unit.maxHp;

  const isMagicUser =
    unit.mag !== undefined && unit.mag !== null;

  const mainStatName = isMagicUser ? "Mag" : "Str";
  const mainStatKey = isMagicUser ? "mag" : "str";
  const mainStatValue = values[mainStatKey] ?? unit[mainStatKey];

  statsElement.innerHTML = `
    <div class="unit-stats-header">
      <h3>${escapeHtml(unit.className ?? unit.name)}</h3>

      <div class="unit-level">
        <strong>Lvl:</strong>
        <span class="${levelClass}">
          ${escapeHtml(levelLabel(unit, level))}
        </span>
      </div>
    </div>

    <div class="unit-stat-grid">

      <div class="stat-hp">
        <strong>HP:</strong>
        ${escapeHtml(unit.hp)}/${statMarkup(unit, "maxHp", maxHp, options)}
      </div>

      <div class="stat-exp">
        <strong>Exp:</strong>
        ${escapeHtml(unit.exp)}/100
      </div>

      <div>
        <strong>${mainStatName}:</strong>
        ${statMarkup(unit, mainStatKey, mainStatValue, options)}
      </div>

      <div>
        <strong>Skill:</strong>
        ${statMarkup(unit, "skl", values.skl ?? unit.skl, options)}
      </div>

      <div>
        <strong>Speed:</strong>
        ${statMarkup(unit, "spd", values.spd ?? unit.spd, options)}
      </div>

      <div>
        <strong>Luck:</strong>
        ${statMarkup(unit, "lck", values.lck ?? unit.lck, options)}
      </div>

      <div>
        <strong>Defense:</strong>
        ${statMarkup(unit, "def", values.def ?? unit.def, options)}
      </div>

      <div>
        <strong>Resistance:</strong>
        ${statMarkup(unit, "res", values.res ?? unit.res, options)}
        ${unit.tempRes ? `<span class="level-new">+${escapeHtml(unit.tempRes)}</span>` : ""}
      </div>

      <div>
        <strong>Movement:</strong>
        ${statMarkup(unit, "move", values.move ?? unit.move, options)}
      </div>

      <div>
        <strong>Con:</strong>
        ${statMarkup(unit, "con", values.con ?? unit.con, options)}
      </div>
      
     <div class="stat-status">
        <strong>Status:</strong>
        <span id="unitStatusLine"></span>
      </div>

    </div>
  `;
  startStatusLine(unit);
}

// ==========================================
// WEAPON RANK DISPLAY
// ==========================================

function renderUnitWeapons() {
  const unit = getInspectedUnit();

  if (!unit) return;

  const weaponsElement = document.getElementById("unitWeapons");

  const weaponTypes = [
    ["Sword", "sword"],
    ["Lance", "lance"],
    ["Axe", "axe"],
    ["Bow", "bow"],
    ["Anima", "anima"],
    ["Light", "light"],
    ["Dark", "dark"],
    ["Staff", "staff"]
  ];

  const ranksHtml = weaponTypes.map(([name, key]) => {
    const rank = unit.weaponRanks?.[key];
    const exp = unit.weaponExp?.[key] ?? 0;

    // Locked weapon types show "---"; usable ones show "C (84)".
    const label = rank ? `${rank} (${exp})` : "---";

    return `
      <div style="display:flex; justify-content:space-between;">
        <strong>${name}:</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    `;
  }).join("");

  weaponsElement.innerHTML = `
    <h3>Weapon Ranks</h3>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
      ${ranksHtml}
    </div>
  `;
}

// ==========================================
// ITEMS SCREEN
// ==========================================


function renderUnitItems() {
  const unit = getInspectedUnit();

  if (!unit) return;

  const itemsElement = getItemsScreen();

// A crewed ballista is shown as an extra last entry. It isn't in
// unit.inventory, so it never uses one of the 5 slots.
const crewed =
  unit.inBallista && isBallista(unit.equippedWeapon)
    ? unit.equippedWeapon
    : null;

const inventory = crewed
  ? [...(unit.inventory ?? []), crewed]
  : (unit.inventory ?? []);
  
  const inspectedItemIndex = getInspectedItemIndex();
  const canEquip = canEquipItems(unit);
  const inventoryHtml = inventory.length === 0
    ? "<p>Inventory is empty.</p>"
    : inventory.map((item, index) => {
        const equipped =
          item.equipped || unit.equippedWeapon === item;

        const itemName = `
  <span class="inventory-item-name ${equipped ? "equipped" : ""} ${item.plunder ? "plunder" : ""}">
    ${escapeHtml(item.name)}
  </span>
`;

        return `
          <button
            type="button"
            data-action="inspect-item"
            data-index="${index}"
            class="inventory-item">

            <span class="inventory-item-name">
              ${itemName}
            </span>

            <span class="inventory-item-uses">
              (${escapeHtml(item.uses ?? "?")}/${escapeHtml(item.maxUses ?? "?")})
            </span>

          </button>
        `;
      }).join("");

  itemsElement.innerHTML = `
    <h3 class="inventory-title">Items</h3>

    <div class="inventory-list">
      ${inventoryHtml}
    </div>

    <div id="unitItemDetails" style="display:none;"></div>
  `;

  const detailsElement = getItemDetailsScreen();

  if (
    inspectedItemIndex !== null &&
    inventory[inspectedItemIndex]
  ) {
    const item = inventory[inspectedItemIndex];

    const equipped =
      item.equipped || unit.equippedWeapon === item;

    const details = [
      ["Type", item.type],
      ["Rank", item.rank],
      ["Might", item.might],
      ["Hit", item.hit],
      ["Critical", item.crit],
      ["Range", item.range],
      ["Weight", item.wt],
      ["Uses", item.uses],
      ["Effect", item.effect]
    ];

    detailsElement.innerHTML = `
      <h3 class="${item.plunder ? "plunder" : ""}">${escapeHtml(item.name)}</h3>

      <div class="item-detail-grid">
        ${details.filter(([, value]) =>
          value !== undefined && value !== null
        ).map(([label, value]) => `
          <div>
            <strong>${label}:</strong>
            ${escapeHtml(value)}
          </div>
        `).join("")}
      </div>

            ${itemActionHtml(unit, item, inspectedItemIndex, equipped, canEquip)}
    `;

    detailsElement.style.display = "block";
  }

  updateMenuHighlight();
}


export function openUnitStats(unit, onBack = null) {
  if (!unit) return;

  inspectionReturn = onBack;

  openUnitMenu(unit);
  checkStats();
}

export function openUnitItems(unit, onBack = null) {
  if (!unit) return;

  inspectionReturn = onBack;

  openUnitMenu(unit);
  showItems();
}