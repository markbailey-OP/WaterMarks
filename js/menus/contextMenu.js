import { pushInputContext, popInputContext } from "../input.js";
import { endTurn } from "./turnMenu.js";
import {
  openUnitStats,
  openUnitItems
} from "./unitMenu.js";
import { 
  gameGrid, 
  gameCursor, 
  side } 
from "../gameState.js";
import { escapeHtml } from "../utils.js";
import {
  canManageFort,
  getAvailableUnits,
  queueReinforcement,
  getFortPop,
  getUnitWeight,
  getQueue,
  dequeueLast,
  clearQueue,
  MAX_QUEUE
} from "../strongholds.js";
import { isCpuSide } from "../cpu.js";
import { saveGameToFile } from "../saveGame.js";
import {
  THEMES,
  setTheme as applyTheme,
  SPEED_SETTINGS,
  getSpeedLevel,
  cycleSpeed
} from "../settings.js";
import { openUnitsList } from "./unitsList.js";
import { getZoomLevel, cycleZoom } from "../camera.js";

// ==========================================
// MENU STATE
// ==========================================

let contextMenuElement = null;
let contextMenuInputContext = null;
let selectedOptionIndex = 0;
let currentScreen = "root";
let contextUnit = null;
let contextFort = null;

// ==========================================
// CREATE MENU
// ==========================================

function createContextMenu() {
  if (contextMenuElement) return contextMenuElement;

  const menu = document.createElement("div");

  menu.id = "contextMenu";
  menu.style.display = "none";

  document.body.appendChild(menu);

  menu.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const buttons = getVisibleButtons();
    selectedOptionIndex = buttons.indexOf(button);

    updateHighlight();
        handleAction(button.dataset.action, button);
  });

  contextMenuElement = menu;

  return menu;
}

// ==========================================
// MENU CONTENT
// ==========================================

function showRootMenu() {
  currentScreen = "root";

  const unitOptions = contextUnit
    ? `
      <button type="button" data-action="check-stats">
        CHECK STATS
      </button>

      <button type="button" data-action="check-items">
        CHECK ITEMS
      </button>
    `
    : "";

  const fortOption = contextFort
    ? `
      <button type="button" data-action="fort">
        ${contextFort.name === "Cave" ? "CAVE" : "FORT"}
      </button>
    `
    : "";

  contextMenuElement.innerHTML = `
    <h3>OPTIONS</h3>

    ${unitOptions}

    ${fortOption}

        <button type="button" data-action="units">
      UNITS
    </button>

    <button type="button" data-action="options">
      OPTIONS
    </button>
    
        ${isCpuSide(side) ? "" : `
      <button type="button" data-action="save-game">
        SAVE GAME
      </button>
    `}

    <button type="button" data-action="end-turn">
      END TURN
    </button>
  `;

  selectedOptionIndex = 0;
  updateHighlight();
}

function showOptionsMenu(keepIndex = false) {
  currentScreen = "options";

  const previousIndex = selectedOptionIndex;

  contextMenuElement.innerHTML = `
    <h3>OPTIONS</h3>

    <button type="button" data-action="themes">
      THEMES
    </button>

    <button type="button" data-action="speed">
      SPEED
    </button>

    <button type="button" data-action="zoom">
      ZOOM: ${escapeHtml(getZoomLevel().label.toUpperCase())}
    </button>
  `;

  selectedOptionIndex = keepIndex ? previousIndex : 0;
  updateHighlight();
}

function showSpeedMenu(keepIndex = false) {
  currentScreen = "speed";

  const previousIndex = selectedOptionIndex;

  contextMenuElement.innerHTML = `
    <h3>SPEED</h3>

    ${SPEED_SETTINGS.map(setting => `
      <button type="button" data-action="speed-cycle"
              data-setting="${escapeHtml(setting.key)}"
              title="${escapeHtml(setting.hint)}">
        ${escapeHtml(setting.label.toUpperCase())}:
        ${escapeHtml(getSpeedLevel(setting.key).label.toUpperCase())}
      </button>`).join("")}
  `;

  selectedOptionIndex = keepIndex ? previousIndex : 0;
  updateHighlight();
}

function showThemeMenu() {
  currentScreen = "themes";

  contextMenuElement.innerHTML = `
    <h3>THEME SELECTION</h3>

    <button type="button" data-action="theme-classic">
      CLASSIC
    </button>

    <button type="button" data-action="theme-forest">
      FOREST
    </button>

    <button type="button" data-action="theme-royal">
      ROYAL
    </button>

    <button type="button" data-action="theme-dark">
      DARK
    </button>
  `;

  selectedOptionIndex = 0;
  updateHighlight();
}

function showFortMenu(keepIndex = false) {
  currentScreen = "fort";

  const previousIndex = selectedOptionIndex;
  const queue = contextFort ? getQueue(contextFort) : [];
  const full = queue.length >= MAX_QUEUE;
  const units = getAvailableUnits(side, contextFort);
  const pop = getFortPop(contextFort);
  const cap = contextFort?.name === "Cave" ? "∞" : (contextFort?.popCap ?? 10);

  contextMenuElement.innerHTML = `
    <h3>${contextFort?.name === "Cave" ? "CAVE" : "FORT " 
          + escapeHtml(contextFort?.index ?? "")}</h3>

    <p style="margin:2px 0; font-size:11px;">
      Pop: ${escapeHtml(pop)}/${escapeHtml(cap)}
    </p>

    <p style="margin:2px 0 6px; font-size:11px;">
      Queue (${queue.length}/${MAX_QUEUE}):
      ${escapeHtml(queue.length ? queue.join(" > ") : "None")}
    </p>

    ${units.map(name => {
      const prior = contextFort?.promotions?.[name]?.fromLevel;
      const level = contextFort?.unitLevels?.[name] ?? 1;
      const label = prior !== undefined ? `(${prior}) ${level}` : level;

      return `
      <button type="button" data-action="fort-queue"
              data-unit="${escapeHtml(name)}" ${full ? "disabled" : ""}>
        ${escapeHtml(name)} (${escapeHtml(getUnitWeight(name))})
        Lv ${escapeHtml(label)}
      </button>`;
    }).join("")}

    ${queue.length ? `
      <button type="button" data-action="fort-remove">REMOVE LAST</button>
      <button type="button" data-action="fort-clear">CLEAR QUEUE</button>
    ` : ""}
  `;

  selectedOptionIndex = keepIndex ? previousIndex : 0;
  updateHighlight();
}

// ==========================================
// BUTTON NAVIGATION
// ==========================================

function getVisibleButtons() {
  if (!contextMenuElement) return [];

  return [...contextMenuElement.querySelectorAll("button")]
    .filter(button =>
      button.getClientRects().length > 0 &&
      !button.disabled
    );
}

function updateHighlight() {
  const buttons = getVisibleButtons();

  if (buttons.length === 0) return;

  selectedOptionIndex = Math.max(
    0,
    Math.min(selectedOptionIndex, buttons.length - 1)
  );

  buttons.forEach((button, index) => {
    button.classList.toggle(
      "menu-option-selected",
      index === selectedOptionIndex
    );
  });
}

function moveSelection(direction) {
  const buttons = getVisibleButtons();

  if (buttons.length === 0) return;

  if (direction === "up" || direction === "left") {
    selectedOptionIndex--;
  } else {
    selectedOptionIndex++;
  }

  selectedOptionIndex =
    (selectedOptionIndex + buttons.length) % buttons.length;

  updateHighlight();
}

function selectOption() {
  const buttons = getVisibleButtons();

  buttons[selectedOptionIndex]?.click();
}

// ==========================================
// ACTIONS
// ==========================================

function handleAction(action, button = null) {
  switch (action) {
    case "fort":
      showFortMenu();
      break;

        case "fort-queue":
      if (contextFort) queueReinforcement(contextFort, button?.dataset.unit);
      showFortMenu(true);
      break;

    case "fort-remove":
      if (contextFort) dequeueLast(contextFort);
      showFortMenu(true);
      break;

    case "fort-clear":
      if (contextFort) clearQueue(contextFort);
      showFortMenu(true);
      break;

    // ...existing cases unchanged
    case "check-stats": {
  const unit = contextUnit;

  closeContextMenu();
  openUnitStats(unit, () => openContextMenu(unit));
  break;
}

case "check-items": {
  const unit = contextUnit;

  closeContextMenu();
  openUnitItems(unit, () => openContextMenu(unit));
  break;
}

    case "units": {
      const unit = contextUnit;
      const team = unit ? unit.team : side;

      closeContextMenu();
      openUnitsList(team, () => openContextMenu(unit));
      break;
    }

    case "options":
  showOptionsMenu();
  break;

case "themes":
  showThemeMenu();
  break;
      
      case "theme-dark":
  setTheme("dark");
  break;

    case "theme-classic":
      setTheme("classic");
      break;

    case "theme-forest":
      setTheme("forest");
      break;

    case "theme-royal":
      setTheme("royal");
      break;
      
    case "zoom":
      cycleZoom();
      showOptionsMenu(true);
      break;

    case "back":
      showRootMenu();
      break;
      
          case "speed":
      showSpeedMenu();
      break;

    case "speed-cycle":
      cycleSpeed(button?.dataset.setting);
      showSpeedMenu(true);
      break;
      
          case "save-game":
      closeContextMenu();
      saveGameToFile();
      break;

    case "end-turn":
      closeContextMenu();
      endTurn();
      break;
  }
}

// ==========================================
// THEMES
// ==========================================

function setTheme(theme) {
  if (!THEMES.some(entry => entry.id === theme)) return;

  applyTheme(theme);
  closeContextMenu();
}

// ==========================================
// INPUT
// ==========================================

function handleBack() {
    if (currentScreen === "fort") {
    showRootMenu();
  } else if (currentScreen === "themes") {
    showOptionsMenu();
  } else if (currentScreen === "options") {
    showRootMenu();
  } else if (currentScreen === "speed") {
    showOptionsMenu();
  } else {
    closeContextMenu();
  }
}

function setupInput() {
  if (contextMenuInputContext) {
    popInputContext(contextMenuInputContext);
  }

  contextMenuInputContext = pushInputContext({
    up: () => moveSelection("up"),
    down: () => moveSelection("down"),
    left: () => moveSelection("left"),
    right: () => moveSelection("right"),
    select: selectOption,
    back: handleBack
  });
}

// ==========================================
// OPEN / CLOSE
// ==========================================

export function openContextMenu(unit = null) {
  const menu = createContextMenu();

  contextUnit = unit;
  menu.style.display = "block";
  
    const tile = gameGrid[gameCursor?.y]?.[gameCursor?.x];
  contextFort = canManageFort(tile, side) ? tile : null;

  showRootMenu();
  setupInput();
}

export function closeContextMenu() {
  if (contextMenuInputContext) {
    popInputContext(contextMenuInputContext);
    contextMenuInputContext = null;
  }

  if (contextMenuElement) {
    contextMenuElement.style.display = "none";
  }
  
  contextUnit = null;
  contextFort = null;
}
