import { gameGrid, gameCursor, TEAM_COLORS } from "../gameState.js";
import { pushInputContext, popInputContext } from "../input.js";
import { MAX_INVENTORY, equipNextAvailableWeapon } from "../inventory.js";
import { escapeHtml } from "../utils.js";

// ==========================================
// PARTNERS
// ==========================================

const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Friendly units standing next to (x, y).
export function getTradePartners(unit, x, y) {
  const partners = [];

  for (const [dx, dy] of DIRECTIONS) {
    const other = gameGrid[y + dy]?.[x + dx]?.unit;

    if (other && other !== unit && other.team === unit.team) {
      partners.push({ unit: other, x: x + dx, y: y + dy });
    }
  }

  return partners;
}

export function canTrade(unit, x, y) {
  return getTradePartners(unit, x, y).length > 0;
}

// ==========================================
// STATE
// ==========================================

let menu = null;
let inputContext = null;

let trader = null;
let partner = null;
let partners = [];
let origin = null;
let onClose = null;

let mode = "pick";     // "pick" a partner, or "trade"
let pickIndex = 0;
let col = 0;           // 0 = trader, 1 = partner
let row = 0;           // 0..MAX_INVENTORY-1
let held = null;       // { col, row } of the item picked up

// ==========================================
// MENU ELEMENT
// ==========================================

function getMenu() {
  if (menu) return menu;

  menu = document.createElement("div");
  menu.id = "tradeMenu";
  menu.style.display = "none";

  // Inside the canvas area, not the page.
  (document.getElementById("gameArea") ?? document.body).appendChild(menu);

  menu.addEventListener("click", event => {
    const target = event.target.closest("button");

    if (!target) return;

    if (target.dataset.partner !== undefined) {
      pickIndex = Number(target.dataset.partner);
    } else if (target.dataset.slot !== undefined) {
      col = Number(target.dataset.col);
      row = Number(target.dataset.slot);
    } else {
      return;
    }

    selectOption();
  });

  return menu;
}

// ==========================================
// RENDERING
// ==========================================

function renderColumn(unit, c) {
  const slots = [];

  for (let i = 0; i < MAX_INVENTORY; i++) {
    const item = unit.inventory?.[i];
    const classes = [];

    if (c === col && i === row) classes.push("menu-option-selected");
    if (held && held.col === c && held.row === i) classes.push("trade-held");

    let label = "—";

    if (item) {
      const equipped = item.equipped || unit.equippedWeapon === item;

      label =
        `${item.name} (${item.uses ?? "?"}/${item.maxUses ?? "?"})` +
        (equipped ? " [E]" : "");
    }

    slots.push(`
      <button type="button" data-col="${c}" data-slot="${i}"
              class="${classes.join(" ")}">
        ${escapeHtml(label)}
      </button>`);
  }

  return `
    <div class="trade-column">
      <h4 style="color:${TEAM_COLORS[unit.team] ?? "inherit"}">
        ${escapeHtml(unit.name)}
      </h4>
      ${slots.join("")}
    </div>`;
}

function render() {
  const element = getMenu();

  if (mode === "pick") {
    element.innerHTML = `
      <h3>TRADE WITH</h3>
      ${partners.map((entry, index) => `
        <button type="button" data-partner="${index}"
                class="${index === pickIndex ? "menu-option-selected" : ""}">
          ${escapeHtml(entry.unit.name)} (${entry.x},${entry.y})
        </button>`).join("")}
    `;
    return;
  }

  element.innerHTML = `
    <h3>TRADE</h3>
    <div class="trade-columns">
      ${renderColumn(trader, 0)}
      ${renderColumn(partner, 1)}
    </div>
    <p class="trade-hint">
      ${held ? "Choose a slot to move the item to." : "Select an item to move."}
    </p>
  `;
}

// ==========================================
// TRANSFERS
// ==========================================

function release(unit, item) {
  item.equipped = false;
  if (unit.equippedWeapon === item) unit.equippedWeapon = null;
}

// Moves the item to an empty slot, or swaps it with the item there.
function transfer(from, fromIndex, to, toIndex) {
  const item = from.inventory?.[fromIndex];

  if (!item) return;

  to.inventory ??= [];

  const other = to.inventory[toIndex];

  release(from, item);

  if (other) {
    release(to, other);
    from.inventory[fromIndex] = other;
    to.inventory[toIndex] = item;
  } else {
    from.inventory.splice(fromIndex, 1);
    to.inventory.push(item);
  }

  equipNextAvailableWeapon(from);
  equipNextAvailableWeapon(to);
}

// ==========================================
// INPUT
// ==========================================

function move(dx, dy) {
  if (mode === "pick") {
    const step = dy || dx;

    if (!step) return;

    pickIndex = (pickIndex + step + partners.length) % partners.length;
    gameCursor.moveToTarget(partners[pickIndex]);
    render();
    return;
  }

  if (dx) col = col === 0 ? 1 : 0;
  if (dy) row = (row + dy + MAX_INVENTORY) % MAX_INVENTORY;

  render();
}

function selectOption() {
  if (mode === "pick") {
    partner = partners[pickIndex].unit;
    mode = "trade";
    col = 0;
    row = 0;
    held = null;
    render();
    return;
  }

  const units = [trader, partner];
  const unit = units[col];

  // Nothing picked up yet: pick up the item under the highlight.
  if (!held) {
    if (!unit.inventory?.[row]) return;

    held = { col, row };
    render();
    return;
  }

  // Same unit: select again to drop it, or switch to another item.
  if (held.col === col) {
    if (held.row === row) {
      held = null;
    } else if (unit.inventory?.[row]) {
      held = { col, row };
    }

    render();
    return;
  }

  // Other unit: an empty slot gives the item, a full one swaps.
  transfer(units[held.col], held.row, unit, row);
  held = null;
  render();
}

function goBack() {
  if (mode === "trade" && held) {
    held = null;
    render();
    return;
  }

  if (mode === "trade" && partners.length > 1) {
    mode = "pick";
    partner = null;
    render();
    return;
  }

  closeTrade();
}

const handlers = {
  up: () => move(0, -1),
  down: () => move(0, 1),
  left: () => move(-1, 0),
  right: () => move(1, 0),
  select: () => selectOption(),
  back: () => goBack()
};

// ==========================================
// OPEN / CLOSE
// ==========================================

// Returns false if there is nobody next to (x, y) to trade with.
export function openTrade(unit, x, y, done = null) {
  partners = getTradePartners(unit, x, y);

  if (partners.length === 0) return false;

  trader = unit;
  origin = { x, y };
  onClose = done;
  held = null;
  pickIndex = 0;
  col = 0;
  row = 0;

  if (partners.length === 1) {
    partner = partners[0].unit;
    mode = "trade";
  } else {
    partner = null;
    mode = "pick";
    gameCursor.moveToTarget(partners[0]);
  }

  render();
  getMenu().style.display = "block";

  if (inputContext) popInputContext(inputContext);
  inputContext = pushInputContext(handlers);

  return true;
}

export function closeTrade() {
  if (inputContext) {
    popInputContext(inputContext);
    inputContext = null;
  }

  if (menu) menu.style.display = "none";

  const callback = onClose;
  const home = origin;

  trader = null;
  partner = null;
  partners = [];
  origin = null;
  onClose = null;
  held = null;

  if (home) gameCursor.moveToTarget(home);

  callback?.();
}
