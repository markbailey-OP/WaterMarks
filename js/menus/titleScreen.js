import { pushInputContext, popInputContext } from "../input.js";
import { THEMES, getTheme, setTheme } from "../settings.js";
import { escapeHtml } from "../utils.js";
import { getMapList, loadMap, HUMAN_TEAMS } from "../map.js";
import { TEAM_NAMES, TEAM_COUNT } from "../gameState.js";

// ==========================================
// STATE
// ==========================================

let handlers = null;       // { onNewGame(), onLoadGame() }
let inputContext = null;
let screen = "main";       // "main" or "settings"
let selectedIndex = 0;
let busy = false;
let clickAttached = false;
let chosenMap = null;
let allowedTeams = [];
let humanPicks = new Set();

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
  if (screen === "teams") showScreen("maps");
  else if (screen !== "main") showScreen("main");
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
  } else if (screen === "teams") {
  menu.innerHTML =
    `<h2 class="title-heading">CONTROLLERS</h2>` +
    allowedTeams.map(team => `
      <button type="button" data-action="toggle-team"
              data-team="${team}">
        ${escapeHtml(TEAM_NAMES[team])}:
        ${humanPicks.has(team) ? "HUMAN" : "CPU"}
      </button>`).join("") +
    `<p class="title-sub">Other teams are always CPU.</p>
     <button type="button" data-action="start">START</button>
     <button type="button" data-action="back">BACK</button>`;
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

async function pickMap(id) {
  if (busy) return;

  busy = true;
  setMessage("");

  try {
    await loadMap(id);
  } catch (error) {
    console.error("Map load failed:", error);
    setMessage(error?.message || "Could not load that map.");
    busy = false;
    return;
  }

  busy = false;

  allowedTeams = HUMAN_TEAMS.filter(
    team => Number.isInteger(team) && team >= 1 && team <= TEAM_COUNT
  );

  if (allowedTeams.length === 0) {
    setMessage("That map has no human-controlled teams.");
    return;
  }

  chosenMap = id;
  humanPicks = new Set(
    allowedTeams.includes(1) ? [1] : [allowedTeams[0]]
  );

  // Nothing to choose: start straight away.
  if (allowedTeams.length === 1) {
    startGame();
    return;
  }

  showScreen("teams");
}

function toggleTeam(team) {
  if (humanPicks.has(team)) humanPicks.delete(team);
  else humanPicks.add(team);

  setMessage("");
  render();
}

async function startGame() {
  if (busy) return;

  if (humanPicks.size === 0) {
    setMessage("Pick at least one human team.");
    return;
  }

  busy = true;
  setMessage("");

  try {
    await handlers.onNewGame(chosenMap, [...humanPicks]);
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
	  pickMap(button.dataset.map);
	  break;
	
	case "toggle-team":
	  toggleTeam(Number(button.dataset.team));
	  break;
	
	case "start":
	  startGame();
	  break;
	
	case "back":
	  showScreen(screen === "teams" ? "maps" : "main");
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
