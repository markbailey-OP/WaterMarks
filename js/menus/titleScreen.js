import { pushInputContext, popInputContext } from "../input.js";
import { THEMES, getTheme, setTheme } from "../settings.js";
import { escapeHtml } from "../utils.js";
import { getMapList } from "../map.js";

// ==========================================
// STATE
// ==========================================

let handlers = null;       // { onNewGame(), onLoadGame() }
let inputContext = null;
let screen = "main";       // "main" or "settings"
let selectedIndex = 0;
let busy = false;
let clickAttached = false;

const rootElement = () => document.getElementById("titleScreen");
const menuElement = () => document.getElementById("titleMenu");

// ==========================================
// NAVIGATION
// ==========================================

function getButtons() {
  const menu = menuElement();

  return menu ? [...menu.querySelectorAll("button")] : [];
}

function updateHighlight() {
  const buttons = getButtons();

  if (buttons.length === 0) return;

  selectedIndex = Math.max(0, Math.min(selectedIndex, buttons.length - 1));

  buttons.forEach((button, index) => {
    button.classList.toggle("menu-option-selected", index === selectedIndex);
  });
}

function moveSelection(step) {
  const buttons = getButtons();

  if (buttons.length === 0) return;

  selectedIndex = (selectedIndex + step + buttons.length) % buttons.length;
  updateHighlight();
}

function setMessage(text) {
  const element = document.getElementById("titleMessage");

  if (element) element.textContent = text;
}

const menuInput = {
  up: () => moveSelection(-1),
  left: () => moveSelection(-1),
  down: () => moveSelection(1),
  right: () => moveSelection(1),
  select: () => getButtons()[selectedIndex]?.click(),
  back: () => {
    if (screen !== "main") showScreen("main");
  }
};

// ==========================================
// RENDERING
// ==========================================

function render() {
  const menu = menuElement();

  if (!menu) return;

  if (screen === "settings") {
    menu.innerHTML =
      `<h2 class="title-heading">THEMES</h2>` +
      THEMES.map(theme => `
        <button type="button" data-action="theme"
                data-theme="${escapeHtml(theme.id)}">
          ${escapeHtml(theme.label)}${theme.id === getTheme() ? " ✓" : ""}
        </button>`).join("") +
      `<button type="button" data-action="back">BACK</button>`;
   } else if (screen === "maps") {
    menu.innerHTML =
      `<h2 class="title-heading">CHOOSE A MAP</h2>` +
      getMapList().map(map => `
        <button type="button" data-action="map"
                data-map="${escapeHtml(map.id)}">
          ${escapeHtml(map.name)}
        </button>`).join("") +
      `<button type="button" data-action="back">BACK</button>`;
  } else {
    menu.innerHTML = `
      <button type="button" data-action="new">NEW GAME</button>
      <button type="button" data-action="load">LOAD GAME</button>
      <button type="button" data-action="settings">SETTINGS</button>
    `;
  }

  updateHighlight();
}

function showScreen(next) {
  screen = next;
  setMessage("");

  // The settings list opens on the theme currently in use.
  selectedIndex = next === "settings"
    ? Math.max(0, THEMES.findIndex(theme => theme.id === getTheme()))
    : 0;

  render();
}

// ==========================================
// ACTIONS
// ==========================================

async function startMap(id) {
  if (busy) return;

  busy = true;
  setMessage("");

  try {
    await handlers.onNewGame(id);
  } catch (error) {
    console.error("New game failed:", error);
    setMessage(error?.message || "Could not start that map.");
  } finally {
    busy = false;
  }
}

async function loadSave() {
  if (busy) return;

  busy = true;
  setMessage("");

  try {
    // Resolves quietly if the player cancels the file picker.
    await handlers.onLoadGame();
  } catch (error) {
    console.error("Load failed:", error);
    setMessage(error?.message || "Could not load that save.");
  } finally {
    busy = false;
  }
}

function handleAction(action, button) {
  switch (action) {
      case "new":
      showScreen("maps");
      break;

    case "map":
      startMap(button.dataset.map);
      break;

    case "load":
      loadSave();
      break;

    case "settings":
      showScreen("settings");
      break;

    case "theme":
      setTheme(button.dataset.theme);
      render();
      break;

    case "back":
      showScreen("main");
      break;
  }
}

// ==========================================
// SHOW / HIDE
// ==========================================

export function showTitleScreen(callbacks) {
  handlers = callbacks;
  busy = false;

  const menu = menuElement();

  if (menu && !clickAttached) {
    clickAttached = true;

    menu.addEventListener("click", event => {
      const button = event.target.closest("button[data-action]");

      if (!button) return;

      const index = getButtons().indexOf(button);

      if (index !== -1) {
        selectedIndex = index;
        updateHighlight();
      }

      handleAction(button.dataset.action, button);
    });
  }

  rootElement().style.display = "flex";

  if (inputContext) popInputContext(inputContext);
  inputContext = pushInputContext(menuInput);

  showScreen("main");
}

export function hideTitleScreen() {
  if (inputContext) {
    popInputContext(inputContext);
    inputContext = null;
  }

  const root = rootElement();

  if (root) root.style.display = "none";
}
