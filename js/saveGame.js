import * as Units from "./units.js";
import * as Items from "./items/index.js";
import {
  gameGrid,
  gameCursor,
  sel,
  turn,
  side,
  teamGold,
  TEAM_COUNT,
  TEAM_NAMES,
  setTurnState
} from "./gameState.js";
import {
  getUnlockedUnits,
  setUnlockedUnits,
  getPromotionSources,
  setPromotionSources
} from "./strongholds.js";
import { createTerrainByName } from "./map.js";
import { setMapDirty } from "./gameArea.js";
import { isCpuSide } from "./cpu.js";
import { getActiveAttack, getPendingMove } from "./menus/attackState.js";
import { showToast } from "./utils.js";

// ==========================================
// FORMAT
// ==========================================

const SAVE_GAME = "Water Marks";
const SAVE_VERSION = 1;

// Per-unit fields that only exist while a unit is selected or acting.
const TRANSIENT_UNIT_KEYS = new Set([
  "selected", "moves", "dist", "attackRange", "possibleRange", "staffRange",
  "inventory", "equippedWeapon"
]);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Limits so a huge or hand-made file can't hang the page.
const MAX_SAVE_CHARS = 5_000_000;
const MAX_MAP_SIDE = 100;

// Keys that must never be copied from a file onto a game object.
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function safeAssign(target, source) {
  for (const [key, value] of Object.entries(source ?? {})) {
    if (!UNSAFE_KEYS.has(key)) target[key] = value;
  }

  return target;
}

const UNIT_NUMBERS = [
  "team", "lvl", "exp", "hp", "maxHp",
  "skl", "spd", "def", "res", "lck", "con", "move"
];

// ==========================================
// SERIALIZE
// ==========================================

function serializeItem(item) {
  // The staff Torch shares a class name with the consumable Torch.
  const cls =
    item.type === "Staff" && item.constructor.name === "Torch"
      ? "StaffTorch"
      : item.constructor.name;

  return { cls, props: { ...item } };
}

function serializeUnit(unit) {
  const props = {};

  for (const [key, value] of Object.entries(unit)) {
    if (!TRANSIENT_UNIT_KEYS.has(key)) props[key] = value;
  }

  // Don't store the live ballista object reference on the unit.
  delete props.equippedWeapon;
  delete props._ballistaPrevWeapon;

  const inventory = unit.inventory ?? [];
  const equippedIndex = inventory.indexOf(unit.equippedWeapon);

  return {
    cls: unit.className,
    props,
    inventory: inventory.map(serializeItem),
    // -1 means the equipped weapon is the tile's ballista (inBallista).
    equipped: unit.inBallista ? -1 : equippedIndex
  };
}

// Only stores what differs from a brand-new tile of the same type.
function serializeTile(tile) {
  const fresh = createTerrainByName(tile.name);
  const props = {};

  for (const [key, value] of Object.entries(tile)) {
    if (key === "unit" || key === "ballista") continue;
    if (!same(value, fresh[key])) props[key] = value;
  }

  const entry = { type: tile.name };

  if (Object.keys(props).length > 0) entry.props = props;
  if (tile.unit) entry.unit = serializeUnit(tile.unit);
  if (tile.ballista) entry.ballista = serializeItem(tile.ballista);

  return entry;
}

export function serializeGame() {
  return {
    game: SAVE_GAME,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    turn,
    side,
    gold: { ...teamGold },
    unlocked: getUnlockedUnits(),
    promotionSources: getPromotionSources(),
    cursor: gameCursor ? { x: gameCursor.x, y: gameCursor.y } : null,
    map: gameGrid.map(row => row.map(serializeTile))
  };
}

// ==========================================
// RESTORE
// ==========================================

function deserializeItem({ cls, props }) {
  const ItemClass = typeof Items[cls] === "function" ? Items[cls] : Items.Item;

  // No constructor call: the save holds the item's complete state.
  return safeAssign(Object.create(ItemClass.prototype), props);
}

function deserializeUnit(data) {
  const UnitClass = Units[data.cls];

  if (typeof UnitClass !== "function") {
    throw new Error(`The save has an unknown unit class: ${data.cls}.`);
  }

  const unit = safeAssign(Object.create(UnitClass.prototype), data.props);

  // Menus print these values, so they must really be numbers.
  const numbersOk =
    typeof unit.name === "string" &&
    UNIT_NUMBERS.every(key => Number.isFinite(unit[key])) &&
    ["str", "mag"].every(
      key => unit[key] === undefined || Number.isFinite(unit[key])
    ) &&
    Number.isInteger(unit.team) &&
    unit.team >= 1 &&
    unit.team <= TEAM_COUNT;

  if (!numbersOk) throw new Error("A unit in the save has damaged stats.");

  unit.selected = false;
  unit.inventory = (data.inventory ?? []).map(deserializeItem);
  if (unit.inBallista) {
    // Linked to the tile's ballista after the whole map is restored.
    unit.equippedWeapon = null;
    unit.inBallista = true;
  } else {
    unit.equippedWeapon = unit.inventory[data.equipped] ?? null;
  }

  return unit;
}

function deserializeTile(entry) {
  const tile = createTerrainByName(entry.type);

  safeAssign(tile, entry.props);
  tile.unit = entry.unit ? deserializeUnit(entry.unit) : undefined;
  if (entry.ballista) {
    tile.ballista = deserializeItem(entry.ballista);
  }

  return tile;
}

function validateSave(data) {
  if (data?.game !== SAVE_GAME || !Array.isArray(data.map)) {
    throw new Error("That file isn't a Water Marks save.");
  }

  if (data.version > SAVE_VERSION) {
    throw new Error("That save is from a newer version of the game.");
  }

  const rowsOk =
    data.map.length > 0 &&
    data.map.length <= MAX_MAP_SIDE &&
    data.map.every(row =>
      Array.isArray(row) &&
      row.length > 0 &&
      row.length <= MAX_MAP_SIDE &&
      row.every(tile => typeof tile?.type === "string")
    );

  if (!rowsOk) throw new Error("That save's map is damaged.");
}

// Replaces the whole game state. Everything is built first, so a bad
// save throws before anything is changed.
export function restoreGame(data) {
  validateSave(data);

  const rows = data.map.map(row => row.map(deserializeTile));

  const savedTurn =
    Number.isInteger(data.turn) && data.turn >= 1 ? data.turn : 1;

  const savedSide =
    Number.isInteger(data.side) && data.side >= 1 && data.side <= TEAM_COUNT
      ? data.side
      : 1;

  gameGrid.length = 0;
  rows.forEach(row => gameGrid.push(row));

  // Re-link units that were manning a ballista to the tile's ballista item.
  for (let y = 0; y < gameGrid.length; y++) {
  for (let x = 0; x < gameGrid[y].length; x++) {
    const tile = gameGrid[y][x];
    const unit = tile?.unit;

    if (!unit?.inBallista) continue;

    if (tile.ballista) {
      tile.ballista.equipped = true;
      unit.equippedWeapon = tile.ballista;
      unit.move = 0;
    } else {
      // Stale flag (an older save): not really in a ballista.
      unit.inBallista = false;
      delete unit._ballistaSavedMove;
      delete unit._ballistaPrevWeapon;
    }
  }
}

  for (let team = 1; team <= TEAM_COUNT; team++) {
    const gold = Number(data.gold?.[team]);

    if (Number.isFinite(gold)) teamGold[team] = Math.max(0, Math.floor(gold));
  }

  setUnlockedUnits(data.unlocked);
  setPromotionSources(data.promotionSources);
  setTurnState(savedTurn, savedSide);
  setMapDirty(true);
}

// ==========================================
// FILES
// ==========================================

// Chrome and Edge remember the last folder used with this id, so point
// it at the saves folder once and it stays there.
const PICKER_ID = "watermarks-saves";

const FILE_TYPES = [{
  description: "Water Marks save",
  accept: { "application/json": [".json"] }
}];

function makeFileName() {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");

  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`;

  const team = (TEAM_NAMES[side] ?? "side").toLowerCase();

  return `watermarks-turn${turn}-${team}-${stamp}.json`;
}

// Returns true if the file was written, false if the player cancelled.
async function writeFile(text, fileName) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        id: PICKER_ID,
        suggestedName: fileName,
        types: FILE_TYPES
      });

      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();

      return true;
    } catch (error) {
      if (error?.name === "AbortError") return false;
      console.warn("Save picker failed, downloading instead:", error);
    }
  }

  // Fallback (Firefox, Safari, phones): a normal download.
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return true;
}

// Returns the file's text, or null if the player cancelled.
async function readFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        id: PICKER_ID,
        types: FILE_TYPES,
        multiple: false
      });

      return await (await handle.getFile()).text();
    } catch (error) {
      if (error?.name === "AbortError") return null;
      console.warn("Open picker failed, using a file input instead:", error);
    }
  }

  return new Promise(resolve => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".json,application/json";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      resolve(file ? await file.text() : null);
    });

    input.addEventListener("cancel", () => resolve(null));

    input.click();
  });
}

// ==========================================
// PUBLIC API
// ==========================================

// Saving is only allowed on a human side with nothing in progress.
export function canSaveNow() {
  return (
    !isCpuSide(side) &&
    !sel.bool &&
    !getPendingMove() &&
    !getActiveAttack()
  );
}

export async function saveGameToFile() {
  if (!canSaveNow()) {
    showToast("You can't save right now.");
    return false;
  }

  try {
    // Serialized before the picker opens, so the file matches this moment.
    const text = JSON.stringify(serializeGame());
    const saved = await writeFile(text, makeFileName());

    if (saved) showToast("Game saved.");

    return saved;
  } catch (error) {
    console.error("Save failed:", error);
    showToast("Saving failed.");
    return false;
  }
}

// Lets the player choose a file. Returns the parsed save, or null if they
// cancelled. Throws an Error with a readable message for a bad file.
export async function pickSaveFile() {
  const text = await readFile();

  if (text === null) return null;

  if (text.length > MAX_SAVE_CHARS) throw new Error("That file is too large to be a save.");

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a valid save.");
  }

  validateSave(data);

  return data;
}
