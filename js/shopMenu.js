import * as Items from "../items/index.js";
import { CLASS_DATA } from "../units.js";

import {
  gameGrid,
  gameCursor,
  getGold,
  setGold,
  addGold,
  getUnitPosition
} from "../gameState.js";

import { pushInputContext, popInputContext } from "../input.js";
import {
  addItem,
  equipNextAvailableWeapon,
  MAX_INVENTORY
} from "../inventory.js";

import { isPromoted } from "../exp.js";
import {
  addPurchasedClassToFort,
  getAvailableUnits,
  getUnitWeight,
  isUnitUnlocked
} from "../strongholds.js";
import { getPendingMove } from "./attackState.js";
import { escapeHtml } from "../utils.js";
import { confirmMove } from "./movementMenu.js";

// ==========================================
// CONSTANTS
// ==========================================

// Unit price = population weight x this value.
// (Soldier-type = 800, non-trainee magic users = 1000.)
const UNIT_PRICE_PER_WEIGHT = 1000;

const ITEM_CATEGORIES = [
  ["Sword", "Swords"],
  ["Lance", "Lances"],
  ["Axe", "Axes"],
  ["Bow", "Bows"],
  ["Anima", "Anima"],
  ["Light", "Light"],
  ["Dark", "Dark"],
  ["Staff", "Staves"],
  ["Consumable", "Consumables"]
];

// Classes that can never be bought.
const NEVER_BUYABLE = new Set([
  "Lord", "GreatLord", "Dancer", "Fleet", "Phantom", "Manakete",
  // Monsters
  "Revenant", "Entombed", "Bonewalker", "Wight", "Bael", "ElderBael",
  "Cyclops", "MautheDoog", "Gwyllgi", "Tarvos", "Maelduin", "Mogall",
  "ArchMogall", "GorgonEgg", "Gorgon", "Gargoyle", "Deathgoyle",
  "DracoZombie", "DemonKing"
]);

// Middle-tier classes. Like promoted classes, they only become
// available once the team has promoted a unit into them (or used a brace).
const PROMOTION_ONLY = new Set([
  "Cavalier", "Knight", "Fighter", "Pirate", "Mage", "Monk", "Shaman", "Priest",
  "WyvernRider", "PegasusKnight", "Brigand", "Mercenary", "Myrmidon", "Soldier"
]);

function canBuyUnit(team, className) {
  if (NEVER_BUYABLE.has(className)) return false;

  if (PROMOTION_ONLY.has(className) || isPromoted({ className })) {
    return isUnitUnlocked(team, className);
  }

  return true;
}

// ==========================================
// TILE HELPERS (used by the other menus)
// ==========================================

export function isShopTile(x, y) {
  return gameGrid[y]?.[x]?.name === "Shop";
}

// ==========================================
// CATALOGS
// ==========================================

let itemCatalog = null;

// Every purchasable item, built once from the item classes.
// Gems and items with no numeric worth (unobtainable) are excluded.
function getItemCatalog() {
  if (itemCatalog) return itemCatalog;

  itemCatalog = [];

  for (const Cls of Object.values(Items)) {
    if (typeof Cls !== "function") continue;

    let sample;

    try {
      sample = new Cls();
    } catch {
      continue;
    }

    if (!(sample instanceof Items.Item)) continue;
    if (!sample.name || sample.name === "NULL") continue;
    if (/\bGem$/i.test(sample.name)) continue;
    // Ballistae are map objects — bought/upgraded only via the BALLISTAE shop section.
    if (/ballista/i.test(sample.name)) continue;
    if (!Number.isFinite(sample.worth) || sample.worth <= 0) continue;

    itemCatalog.push({
      Cls,
      name: sample.name,
      type: sample.type,
      rank: sample.rank,
      price: sample.worth
    });
  }

  itemCatalog.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));

  return itemCatalog;
}

function getCategoryItems(type) {
  return getItemCatalog().filter(entry => entry.type === type);
}

export function getUnitPrice(className) {
  return Math.round(getUnitWeight(className) * UNIT_PRICE_PER_WEIGHT);
}

export function getPurchasableUnits(team) {
  return Object.keys(CLASS_DATA)
    .filter(name => canBuyUnit(team, name))
    .map(name => ({ name, price: getUnitPrice(name) }))
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
}

// Selling gives half the worth, scaled by remaining uses.
// Gems sell for their full worth. Returns 0 if unsellable.
function getSellPrice(item) {
  if (!Number.isFinite(item?.worth) || item.worth <= 0) return 0;

  if (/\bGem$/i.test(item.name)) return item.worth;

  const ratio =
    Number.isFinite(item.uses) &&
    Number.isFinite(item.maxUses) &&
    item.maxUses > 0
      ? item.uses / item.maxUses
      : 1;

  return Math.floor(item.worth * ratio / 2);
}

// Owned forts that do not yet offer this unit, in index order.
function getEligibleForts(team, className) {
  const forts = [];

  for (let y = 0; y < gameGrid.length; y++) {
    for (let x = 0; x < gameGrid[y].length; x++) {
      const tile = gameGrid[y][x];

      if (tile?.name !== "Fort" || tile.owner !== team) continue;
      if (getAvailableUnits(team, tile).includes(className)) continue;

      forts.push({ x, y, index: tile.index ?? 0 });
    }
  }

  return forts.sort((a, b) => a.index - b.index);
}

// Ballista tiles occupied by a unit of this team (any class).
// Target type must be different from the current ballista and cannot
// downgrade to the basic Ballista once upgraded.
function getEligibleBallistas(team, targetName) {
  const list = [];

  for (let y = 0; y < gameGrid.length; y++) {
    for (let x = 0; x < gameGrid[y].length; x++) {
      const tile = gameGrid[y][x];
      const occupant = tile?.unit;
      const current = tile?.ballista;

      if (!current || !occupant || occupant.team !== team) continue;
      if (current.name === targetName) continue;
      // Once upgraded away from basic, never return to basic Ballista.
      if (targetName === "Ballista" && current.name !== "Ballista") continue;
      // Basic can upgrade to iron/killer; iron/killer can switch between each other.
      if (
        current.name !== "Ballista" &&
        targetName !== "Iron Ballista" &&
        targetName !== "Killer Ballista"
      ) {
        continue;
      }

      list.push({ x, y });
    }
  }

  return list;
}

// Cost to restore all missing uses: worth * missing / maxUses.
// Example: Ballista (worth 1000, max 5) at 0 uses → 1000; at 1 use → 800.
function getBallistaReloadCost(ballista) {
  if (!ballista) return 0;
  const maxUses = Number.isFinite(ballista.maxUses) && ballista.maxUses > 0
    ? ballista.maxUses
    : (Number.isFinite(ballista.uses) ? ballista.uses : 5);
  const uses = Number.isFinite(ballista.uses) ? Math.max(0, ballista.uses) : 0;
  const missing = Math.max(0, maxUses - uses);
  if (missing <= 0) return 0;
  const worth = Number.isFinite(ballista.worth) && ballista.worth > 0
    ? ballista.worth
    : 1000;
  return Math.floor(worth * missing / maxUses);
}

// Ballistae on tiles occupied by this team that are missing at least one use.
function getEligibleBallistasForReload(team) {
  const list = [];

  for (let y = 0; y < gameGrid.length; y++) {
    for (let x = 0; x < gameGrid[y].length; x++) {
      const tile = gameGrid[y][x];
      const occupant = tile?.unit;
      const current = tile?.ballista;

      if (!current || !occupant || occupant.team !== team) continue;
      const cost = getBallistaReloadCost(current);
      if (cost <= 0) continue;

      list.push({ x, y, cost });
    }
  }

  return list;
}

// ==========================================
// STATE
// ==========================================

let menuElement = null;
let inputContext = null;

let shopUser = null;
let userPosition = null;
let onCloseCallback = null;

let screen = "root";
let category = null;
let message = "";
let selectedIndex = 0;

// Unit purchase waiting for a fort: { className, price, forts, index }
let pending = null;
// True once anything was bought or sold this visit.
let transacted = false;
// Set while a brace is placing a free unit at a fort: { onDone }
let braceMode = null;

// ==========================================
// INPUT
// ==========================================

function setInput(handlers) {
  if (inputContext) {
    popInputContext(inputContext);
    inputContext = null;
  }

  if (handlers) inputContext = pushInputContext(handlers);
}

const menuInput = {
  up: () => moveSelection(-1),
  left: () => moveSelection(-1),
  down: () => moveSelection(1),
  right: () => moveSelection(1),
  select: () => getButtons()[selectedIndex]?.click(),
  back: () => goBack()
};

const fortTargetInput = {
  up: () => cycleFort(-1),
  left: () => cycleFort(-1),
  down: () => cycleFort(1),
  right: () => cycleFort(1),
  select: () => selectFort(),
  back: () => cancelTargeting()
};

// Same navigation as forts; selection confirms a ballista upgrade.
const ballistaTargetInput = {
  up: () => cycleFort(-1),
  left: () => cycleFort(-1),
  down: () => cycleFort(1),
  right: () => cycleFort(1),
  select: () => selectBallistaUpgrade(),
  back: () => cancelTargeting()
};

// ==========================================
// MENU ELEMENT AND NAVIGATION
// ==========================================

function getMenuElement() {
  if (menuElement) return menuElement;

  menuElement = document.createElement("div");
  menuElement.id = "shopMenu";
  menuElement.style.display = "none";

  // Inside the canvas area, not the page.
  (document.getElementById("gameArea") ?? document.body)
    .appendChild(menuElement);

  menuElement.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const index = getButtons().indexOf(button);

    if (index !== -1) {
      selectedIndex = index;
      updateHighlight();
    }

    handleAction(button.dataset.action, button);
  });

  return menuElement;
}

function getButtons() {
  if (!menuElement) return [];

  return [...menuElement.querySelectorAll("button")].filter(
    button => button.getClientRects().length > 0 && !button.disabled
  );
}

// Scrolls only the shop list (never the page) so the button stays visible.
function scrollToSelected(button) {
  const body = menuElement?.querySelector(".shop-body");

  if (!body || !body.contains(button) || body.clientHeight === 0) return;

  if (selectedIndex === 0) {
    body.scrollTop = 0;
    return;
  }

  const top = button.offsetTop;
  const bottom = top + button.offsetHeight;
  const margin = 4;

  if (top < body.scrollTop) {
    body.scrollTop = top - margin;
  } else if (bottom > body.scrollTop + body.clientHeight) {
    body.scrollTop = bottom - body.clientHeight + margin;
  }
}

function updateHighlight() {
  const buttons = getButtons();

  if (buttons.length === 0) return;

  selectedIndex = Math.max(0, Math.min(selectedIndex, buttons.length - 1));

  buttons.forEach((button, index) => {
    button.classList.toggle("menu-option-selected", index === selectedIndex);
  });

  scrollToSelected(buttons[selectedIndex]);
}

function moveSelection(step) {
  const buttons = getButtons();

  if (buttons.length === 0) return;

  selectedIndex = (selectedIndex + step + buttons.length) % buttons.length;
  updateHighlight();
}

function setScreen(next, nextCategory = category) {
  screen = next;
  category = nextCategory;
  message = "";
  selectedIndex = 0;
}

function showMenu() {
  getMenuElement().style.display = "flex";
  updateHighlight();   // the buttons only have layout once it is visible
}

function hideMenu() {
  if (menuElement) menuElement.style.display = "none";
}

// ==========================================
// RENDERING
// ==========================================

function button(action, label, { data = {}, unavailable = false } = {}) {
  const attributes = Object.entries(data)
    .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
    .join(" ");

  return `
    <button type="button" data-action="${action}" ${attributes}
            class="${unavailable ? "shop-unavailable" : ""}">
      ${escapeHtml(label)}
    </button>`;
}

function render(keepSelection = false) {
  const element = getMenuElement();
  const unit = shopUser;

  if (!unit) return;

  const team = unit.team;
  const inventory = unit.inventory ?? [];
  const gold = getGold(team);

  let title = "SHOP";
  let body = "";

  switch (screen) {
    case "root":
      body =
        button("buy", "BUY") +
        button("sell", "SELL") +
        button("leave", "LEAVE");
      break;

    case "buy":
      title = "BUY";
      body =
        button("buy-items", "ITEMS") +
        button("buy-units", "UNITS") +
        button("buy-ballistae", "BALLISTAE") +
        button("back", "BACK");
      break;

    case "categories":
      title = "BUY ITEMS";
      body =
        ITEM_CATEGORIES.map(([type, label]) =>
          button("category", `${label} (${getCategoryItems(type).length})`, {
            data: { key: type }
          })
        ).join("") +
        button("back", "BACK");
      break;

    case "items": {
      const label = ITEM_CATEGORIES.find(([type]) => type === category)?.[1];
      title = label ? label.toUpperCase() : "ITEMS";

      body =
        `<p class="shop-sub">Carrying ${inventory.length}/${MAX_INVENTORY}</p>` +
        getCategoryItems(category).map((entry, index) =>
          button(
            "buy-item",
            `${entry.name}${entry.rank ? ` (${entry.rank})` : ""} - ${entry.price}G`,
            {
              data: { index },
              unavailable:
                gold < entry.price || inventory.length >= MAX_INVENTORY
            }
          )
        ).join("") +
        button("back", "BACK");
      break;
    }

    case "units": {
      title = "BUY UNITS";

      body =
        `<p class="shop-sub">Adds a unit type to one of your forts.</p>` +
        getPurchasableUnits(team).map(entry =>
          button("buy-unit", `${entry.name} - ${entry.price}G`, {
            data: { unit: entry.name },
            unavailable: gold < entry.price
          })
        ).join("") +
        button("back", "BACK");
      break;
    }

    case "ballistae": {
      title = "BALLISTAE";
      body =
        `<p class="shop-sub">Select a ballista occupied by your unit on the map.</p>` +
        button("reload-ballista", "RELOAD", {
          unavailable: getEligibleBallistasForReload(team).length === 0
        }) +
        button("buy-ballista", "IRON BALLISTA - 3000G", {
          data: { ballista: "Iron Ballista", price: 3000 },
          unavailable: gold < 3000
        }) +
        button("buy-ballista", "KILLER BALLISTA - 5000G", {
          data: { ballista: "Killer Ballista", price: 5000 },
          unavailable: gold < 5000
        }) +
        button("back", "BACK");
      break;
    }

    case "sell":
      title = "SELL";

      body =
        (inventory.length === 0 ? "<p>Nothing to sell.</p>" : "") +
        inventory.map((item, index) => {
          const price = getSellPrice(item);

          return button(
            "sell-item",
            price > 0
              ? `${item.name} - ${price}G`
              : `${item.name} (can't sell)`,
            { data: { index }, unavailable: price <= 0 }
          );
        }).join("") +
        button("back", "BACK");
      break;

    case "confirm": {
      const fort = pending?.forts[pending.index];
      const tile = fort ? gameGrid[fort.y][fort.x] : null;

      if (pending?.kind === "ballista") {
        title = "UPGRADE BALLISTA";
        body = `
          <p>Upgrade to ${escapeHtml(pending?.targetName)}?</p>
          <p class="shop-sub">
            Current: ${escapeHtml(tile?.ballista?.name ?? "?")} - ${escapeHtml(pending?.price)}G
          </p>
          ${button("confirm-purchase", "CONFIRM")}
          ${button("cancel-purchase", "CANCEL")}
        `;
      } else if (pending?.kind === "reload") {
        const b = tile?.ballista;
        const uses = b ? `${b.uses ?? 0}/${b.maxUses ?? 5}` : "?";
        title = "RELOAD BALLISTA";
        body = `
          <p>Reload ${escapeHtml(b?.name ?? "ballista")}?</p>
          <p class="shop-sub">
            Uses ${escapeHtml(uses)} → full - ${escapeHtml(pending?.price)}G
          </p>
          ${button("confirm-purchase", "CONFIRM")}
          ${button("cancel-purchase", "CANCEL")}
        `;
      } else {
        title = "PLACE UNIT";
        body = `
          <p>Place ${escapeHtml(pending?.className)} here?</p>
          <p class="shop-sub">
            Fort ${escapeHtml(tile?.index ?? "")} - ${escapeHtml(pending?.price)}G
          </p>
          ${button("confirm-purchase", "CONFIRM")}
          ${button("cancel-purchase", "CANCEL")}
        `;
      }
      break;
    }
  }

  const previousBody = element.querySelector(".shop-body");
  const previousScroll =
    keepSelection && previousBody ? previousBody.scrollTop : 0;

  element.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <p class="shop-gold">Gold: ${escapeHtml(gold)}</p>
    ${message ? `<p class="shop-message">${escapeHtml(message)}</p>` : ""}
    <div class="shop-body">${body}</div>
  `;

  const newBody = element.querySelector(".shop-body");
  if (newBody) newBody.scrollTop = previousScroll;

  if (!keepSelection) selectedIndex = 0;

  updateHighlight();
}

// ==========================================
// ACTIONS
// ==========================================

function handleAction(action, target) {
  switch (action) {
    case "buy":
      setScreen("buy");
      render();
      break;

    case "sell":
      setScreen("sell");
      render();
      break;

    case "leave":
      closeShop();
      break;

    case "buy-items":
      setScreen("categories");
      render();
      break;

    case "buy-units":
      setScreen("units");
      render();
      break;

    case "buy-ballistae":
      setScreen("ballistae");
      render();
      break;

    case "buy-ballista":
      startBallistaUpgrade(
        target.dataset.ballista,
        Number(target.dataset.price)
      );
      break;

    case "reload-ballista":
      startBallistaReload();
      break;

    case "category":
      setScreen("items", target.dataset.key);
      render();
      break;

    case "buy-item":
      purchaseItem(getCategoryItems(category)[Number(target.dataset.index)]);
      break;

    case "buy-unit":
      startFortSelection(target.dataset.unit);
      break;

    case "sell-item":
      sellItem(Number(target.dataset.index));
      break;

    case "confirm-purchase":
      confirmPurchase();
      break;

    case "cancel-purchase":
      cancelConfirm();
      break;

    case "back":
      goBack();
      break;
  }
}

function goBack() {
  switch (screen) {
    case "root":
      closeShop();
      return;

    case "buy":
    case "sell":
      setScreen("root");
      break;

    case "categories":
    case "units":
    case "ballistae":
      setScreen("buy");
      break;

    case "items":
      setScreen("categories");
      break;

    case "confirm":
      cancelConfirm();
      return;
  }

  render();
}

// ==========================================
// BUYING AND SELLING ITEMS
// ==========================================

function purchaseItem(entry) {
  if (!entry || !shopUser) return;

  const unit = shopUser;
  const team = unit.team;

  unit.inventory ??= [];

  if (unit.inventory.length >= MAX_INVENTORY) {
    message = `Inventory full (${MAX_INVENTORY}/${MAX_INVENTORY}).`;
  } else if (getGold(team) < entry.price) {
    message = "Not enough gold.";
  } else {
    setGold(team, getGold(team) - entry.price);
    addItem(unit, new entry.Cls());
    transacted = true;

    // Only equips if the unit has nothing usable equipped.
    equipNextAvailableWeapon(unit);

    message = `Bought ${entry.name}.`;
  }

  render(true);
}

function sellItem(index) {
  const unit = shopUser;
  const item = unit?.inventory?.[index];

  if (!item) return;

  const price = getSellPrice(item);

  if (price <= 0) {
    message = "This item can't be sold.";
    render(true);
    return;
  }

  unit.inventory.splice(index, 1);

  if (unit.equippedWeapon === item) unit.equippedWeapon = null;
  item.equipped = false;

  addGold(unit.team, price);
  equipNextAvailableWeapon(unit);
  transacted = true;

  message = `Sold ${item.name} for ${price}G.`;
  render(true);
}

// ==========================================
// BUYING UNITS (FORT SELECTION)
// ==========================================

function restoreCursor() {
  if (userPosition) gameCursor.moveToTarget(userPosition);
}

function startFortSelection(className) {
  if (!className || !shopUser) return;

  const team = shopUser.team;
  const price = getUnitPrice(className);

  if (getGold(team) < price) {
    message = "Not enough gold.";
    render(true);
    return;
  }

  const forts = getEligibleForts(team, className);

  if (forts.length === 0) {
    message = "Every fort you own already offers this unit.";
    render(true);
    return;
  }

  pending = { kind: "unit", className, price, forts, index: 0 };
  screen = "targeting";

  // The menu disappears; the cursor now toggles between forts.
  hideMenu();
  setInput(fortTargetInput);
  gameCursor.moveToTarget(forts[0]);
}

function startBallistaUpgrade(targetName, price) {
  if (!targetName || !shopUser) return;

  const team = shopUser.team;

  if (getGold(team) < price) {
    message = "Not enough gold.";
    render(true);
    return;
  }

  const forts = getEligibleBallistas(team, targetName);

  if (forts.length === 0) {
    message = "No eligible ballista (need a unit of yours on one).";
    render(true);
    return;
  }

  pending = { kind: "ballista", targetName, price, forts, index: 0 };
  screen = "targeting";
  hideMenu();
  setInput(ballistaTargetInput);
  gameCursor.moveToTarget(forts[0]);
}

function startBallistaReload() {
  if (!shopUser) return;

  const team = shopUser.team;
  const forts = getEligibleBallistasForReload(team);

  if (forts.length === 0) {
    message = "No ballista needs reloading (or none occupied by your units).";
    render(true);
    return;
  }

  pending = { kind: "reload", forts, index: 0 };
  screen = "targeting";
  hideMenu();
  setInput(ballistaTargetInput);
  gameCursor.moveToTarget(forts[0]);
}

function currentFortIndex() {
  const index = pending.forts.findIndex(
    fort => fort.x === gameCursor.x && fort.y === gameCursor.y
  );

  return index === -1 ? pending.index : index;
}

function cycleFort(step) {
  if (!pending) return;

  const count = pending.forts.length;

  pending.index = (currentFortIndex() + step + count) % count;
  gameCursor.moveToTarget(pending.forts[pending.index]);
}

// Select on a fort shows the confirmation. Tapping the map moves the
// cursor, so selection always uses the cursor's current tile.
function selectFort() {
  if (!pending) return;

  const index = pending.forts.findIndex(
    fort => fort.x === gameCursor.x && fort.y === gameCursor.y
  );

  if (index === -1) return;

  pending.index = index;
  screen = "confirm";
  message = "";
  selectedIndex = 0;

  render();
  showMenu();
  setInput(menuInput);
}

function cancelTargeting() {
  if (braceMode) {
    finishBrace(false);
    return;
  }

  const wasBallista =
    pending?.kind === "ballista" || pending?.kind === "reload";
  pending = null;
  restoreCursor();

  setScreen(wasBallista ? "ballistae" : "units");
  render();
  showMenu();
  setInput(menuInput);
}

function selectBallistaUpgrade() {
  if (!pending || (pending.kind !== "ballista" && pending.kind !== "reload")) {
    return;
  }

  const index = pending.forts.findIndex(
    fort => fort.x === gameCursor.x && fort.y === gameCursor.y
  );

  if (index === -1) return;

  pending.index = index;

  // For reload, lock in the live cost for this ballista.
  if (pending.kind === "reload") {
    const fort = pending.forts[index];
    const tile = gameGrid[fort.y]?.[fort.x];
    pending.price = getBallistaReloadCost(tile?.ballista);
    if (pending.price <= 0) {
      message = "That ballista is already fully loaded.";
      pending = null;
      restoreCursor();
      setScreen("ballistae");
      render();
      showMenu();
      setInput(menuInput);
      return;
    }
  }

  screen = "confirm";
  message = "";
  selectedIndex = 0;

  render();
  showMenu();
  setInput(menuInput);
}

// CANCEL on the confirmation goes back to choosing a fort / ballista.
function cancelConfirm() {
  if (!pending) return;

  screen = "targeting";
  hideMenu();
  setInput(
    pending.kind === "ballista" || pending.kind === "reload"
      ? ballistaTargetInput
      : fortTargetInput
  );
}

function confirmPurchase() {
  if (!pending || !shopUser) return;

  const team = shopUser.team;
  const fort = pending.forts[pending.index];
  const tile = gameGrid[fort.y]?.[fort.x];
  const price = pending.price;

  let result;
  let success = false;
  let returnScreen = "units";

  if (pending.kind === "ballista") {
    returnScreen = "ballistae";
    const targetName = pending.targetName;

    if (!tile?.ballista || tile.unit?.team !== team) {
      result = "That ballista is no longer eligible.";
    } else if (getGold(team) < price) {
      result = "Not enough gold.";
    } else {
      setGold(team, getGold(team) - price);
      const uses = tile.ballista.uses;
      const wasEquipped = tile.ballista.equipped;
      const Cls =
        targetName === "Killer Ballista"
          ? Items.KillerBallista
          : targetName === "Iron Ballista"
            ? Items.IronBallista
            : Items.Ballista;
      tile.ballista = new Cls();
      if (Number.isFinite(uses)) tile.ballista.uses = uses;
      tile.ballista.equipped = wasEquipped;
      if (tile.unit?.inBallista) {
        tile.unit.equippedWeapon = tile.ballista;
      }
      transacted = true;
      success = true;
      result = `Upgraded to ${targetName}.`;
    }
  } else if (pending.kind === "reload") {
    returnScreen = "ballistae";
    const liveCost = getBallistaReloadCost(tile?.ballista);

    if (!tile?.ballista || tile.unit?.team !== team) {
      result = "That ballista is no longer eligible.";
    } else if (liveCost <= 0) {
      result = "That ballista is already fully loaded.";
    } else if (getGold(team) < liveCost) {
      result = "Not enough gold.";
    } else {
      setGold(team, getGold(team) - liveCost);
      const maxUses =
        Number.isFinite(tile.ballista.maxUses) && tile.ballista.maxUses > 0
          ? tile.ballista.maxUses
          : 5;
      tile.ballista.uses = maxUses;
      transacted = true;
      success = true;
      result = `Reloaded ${tile.ballista.name} (${maxUses}/${maxUses}).`;
    }
  } else {
    const { className } = pending;

    if (!tile || tile.name !== "Fort" || tile.owner !== team) {
      result = "That fort is no longer yours.";
    } else if (getAvailableUnits(team, tile).includes(className)) {
      result = "That fort already offers this unit.";
    } else if (getGold(team) < price) {
      result = "Not enough gold.";
    } else {
      setGold(team, getGold(team) - price);
      addPurchasedClassToFort(tile, className);
      transacted = true;
      success = true;

      result =
        `${className} can now be reinforced at Fort ${tile.index ?? ""}.`.replace(" .", ".");
    }
  }

  pending = null;

  if (braceMode) {
    finishBrace(success);
    return;
  }

  restoreCursor();

  setScreen(returnScreen);
  message = result;

  render();
  showMenu();
  setInput(menuInput);
}

// ==========================================
// OPEN / CLOSE
// ==========================================

export function openShop(unit, onClose = null) {
  if (!unit) return;

  shopUser = unit;
  userPosition = getUnitPosition(unit);
  onCloseCallback = onClose;
  pending = null;
  transacted = false;

  setScreen("root", null);
  render();
  showMenu();
  setInput(menuInput);
}

export function closeShop() {
  setInput(null);
  hideMenu();
  restoreCursor();

  const callback = onCloseCallback;
  const didTransact = transacted;

  shopUser = null;
  userPosition = null;
  onCloseCallback = null;
  pending = null;
  transacted = false;

  callback?.(didTransact);
}

// SHOP button on the post-move action menu.
export function beginMovedShop() {
  const move = getPendingMove();

  if (!move || !isShopTile(move.endX, move.endY)) return;

  document.getElementById("moveMenu").style.display = "none";

  openShop(move.unit, didTransact => {
    if (didTransact) {
      confirmMove();   // ends the unit's action
      return;
    }

    document.getElementById("moveMenu").style.display = "block";
  });
}

// ==========================================
// BRACES (free fort placement)
// ==========================================

// False only when the unit is already unlocked and every fort has it.
export function canPlaceUnit(team, className) {
  return (
    !isUnitUnlocked(team, className) ||
    getEligibleForts(team, className).length > 0
  );
}

function finishBrace(placed) {
  const done = braceMode?.onDone;

  braceMode = null;
  pending = null;

  setInput(null);
  hideMenu();
  restoreCursor();

  shopUser = null;
  userPosition = null;

  done?.(placed);
}

// Lets the player pick a fort, then adds the unit there for free.
// onDone(true) once placed (or if there was no fort left to add it to),
// onDone(false) if cancelled.
export function beginBracePlacement(unit, className, onDone) {
  const forts = getEligibleForts(unit.team, className);

  if (forts.length === 0) {
    onDone(true);
    return;
  }

  shopUser = unit;
  userPosition = getUnitPosition(unit);
  transacted = false;
  braceMode = { onDone };

  pending = { className, price: 0, forts, index: 0 };
  screen = "targeting";

  hideMenu();
  setInput(fortTargetInput);
  gameCursor.moveToTarget(forts[0]);
}
