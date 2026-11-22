import { 
  gameCursor, 
  TEAM_COLORS } 
from "../gameState.js";
import { 
  pushInputContext, 
  popInputContext, 
  NO_INPUT } 
from "../input.js";
import { MAX_INVENTORY } from "../inventory.js";
import { getStealTargets, isStealable } from "../abilities.js";
import { escapeHtml, showToast } from "../utils.js";
import { resolveSteal } from "./stealResolution.js";

// ==========================================
// STATE
// ==========================================

let menu = null;
let inputContext = null;

let thief = null;
let origin = null;
let onClose = null;

let targets = [];
let victim = null;
let mode = "items";   // "pick" a target, or choose an "items" to steal
let index = 0;
let busy = false;

// ==========================================
// MENU ELEMENT
// ==========================================

function getMenu() {
  if (menu) return menu;

  menu = document.createElement("div");
  menu.id = "stealMenu";
  menu.style.display = "none";

  // Inside the canvas area, not the page.
  (document.getElementById("gameArea") ?? document.body).appendChild(menu);

  menu.addEventListener("click", event => {
    const button = event.target.closest("button[data-index]");

    if (!button) return;

    index = Number(button.dataset.index);
    selectOption();
  });

  return menu;
}

// ==========================================
// RENDERING
// ==========================================

function itemLabel(item) {
  const equipped = item.equipped || victim.equippedWeapon === item;

  return (
    `${item.name} (${item.uses ?? "?"}/${item.maxUses ?? "?"})` +
    (equipped ? " [E]" : "")
  );
}

// Stealable items with their real inventory slot.
function stealableItems(unit) {
  return (unit?.inventory ?? [])
    .map((item, index) => ({ item, index }))
    .filter(entry => isStealable(entry.item));
}

function render() {
  const element = getMenu();
  const selected = i => (i === index ? "menu-option-selected" : "");

  if (mode === "pick") {
    element.innerHTML = `
      <h3>STEAL FROM</h3>
      ${targets.map((entry, i) => `
        <button type="button" data-index="${i}" class="${selected(i)}">
          ${escapeHtml(entry.unit.name)} (${entry.x},${entry.y})
        </button>`).join("")}
    `;
    return;
  }

    const entries = stealableItems(victim);

  element.innerHTML = `
    <h3 style="color:${TEAM_COLORS[victim.team] ?? "inherit"}">
      ${escapeHtml(victim.name)}
    </h3>
    <p class="steal-sub">
      Carrying ${thief.inventory?.length ?? 0}/${MAX_INVENTORY}.
      Choose an item to steal.
    </p>
    ${entries.map(({ item }, i) => `
      <button type="button" data-index="${i}" class="${selected(i)}">
        ${escapeHtml(itemLabel(item))}
      </button>`).join("")}
  `;
}

// ==========================================
// INPUT
// ==========================================

function count() {
  return mode === "pick" ? targets.length : stealableItems(victim).length;
}

function move(step) {
  const total = count();

  if (total === 0) return;

  index = (index + step + total) % total;

  if (mode === "pick") gameCursor.moveToTarget(targets[index]);

  render();
}

function chooseVictim(entry) {
  victim = entry.unit;
  mode = "items";
  index = 0;

  gameCursor.moveToTarget(entry);
  render();
}

async function selectOption() {
  if (mode === "pick") {
    if (targets[index]) chooseVictim(targets[index]);
    return;
  }

    if (busy) return;

  const entry = stealableItems(victim)[index];

  if (!entry) return;

  const name = victim.name;

  busy = true;
  getMenu().style.display = "none";

  const lock = pushInputContext(NO_INPUT);
  let item = null;

  try {
    item = await resolveSteal(thief, victim, entry.index);
  } finally {
    popInputContext(lock);
    busy = false;
  }

  if (!item) {
    getMenu().style.display = "block";
    showToast("Couldn't steal that.");
    return;
  }

  showToast(`Stole ${item.name} from ${name}.`);
  close(true);
}

function goBack() {
  if (mode === "items" && targets.length > 1) {
    index = Math.max(0, targets.findIndex(entry => entry.unit === victim));
    victim = null;
    mode = "pick";

    render();
    return;
  }

  close(false);
}

const handlers = {
  up: () => move(-1),
  left: () => move(-1),
  down: () => move(1),
  right: () => move(1),
  select: () => selectOption(),
  back: () => goBack()
};

// ==========================================
// OPEN / CLOSE
// ==========================================

// The thief stands at (x, y). done(true) means an item was stolen
// (the unit's action is over); done(false) means nothing happened.
// done is always called, including when the menu can't open.
export function openSteal(unit, x, y, done = null) {
  targets = getStealTargets(unit, x, y);

  if (targets.length === 0) {
    done?.(false);
    return false;
  }

  if ((unit.inventory?.length ?? 0) >= MAX_INVENTORY) {
    showToast("Inventory full.");
    targets = [];
    done?.(false);
    return false;
  }

  thief = unit;
  origin = { x, y };
  onClose = done;

  if (targets.length === 1) {
    chooseVictim(targets[0]);
  } else {
    victim = null;
    mode = "pick";
    index = 0;

    gameCursor.moveToTarget(targets[0]);
    render();
  }

  getMenu().style.display = "block";

  if (inputContext) popInputContext(inputContext);
  inputContext = pushInputContext(handlers);

  return true;
}

function close(stole) {
  if (inputContext) {
    popInputContext(inputContext);
    inputContext = null;
  }

  if (menu) menu.style.display = "none";

  const callback = onClose;
  const home = origin;

  thief = null;
  victim = null;
  targets = [];
  origin = null;
  onClose = null;

  if (home) gameCursor.moveToTarget(home);

  callback?.(stole);
}