import { gameGrid } from "./gameState.js";
import { showToast } from "./utils.js";

// ==========================================
// SETTINGS (tweak these)
// ==========================================

export const SLEEP_TURNS = 3;
export const POISON_FRACTION = 0.2;     // of max HP, at the start of the unit's phase
export const POISON_CAN_KILL = false;   // false: poison stops at 1 HP
export const STONE_CRIT_BONUS = 50;     // added to crit chance against a stoned unit
export const IMMOBILE_CAN_COUNTER = false;
export const STATUS_CYCLE_MS = 1000;    // how long each status shows when several apply

// Display order and priority.
const ORDER = ["stone", "sleep", "poison"];
const NAMES = { poison: "POISON", sleep: "SLEEP", stone: "STONE" };

const ALERTS = {
  poison: { text: "POISONED", color: "#c06bff" },
  sleep: { text: "SLEEP", color: "#7fb6ff" },
  stone: { text: "PETRIFIED", color: "#c8c8c8" }
};

// unit.status = { poison: true, sleep: <turns left>, stone: true }
// It is a plain object on the unit, so saves carry it automatically.

// ==========================================
// QUERIES
// ==========================================

// [{ type, label }] in display order. Sleep's label includes its turns.
export function getStatusList(unit) {
  const state = unit?.status;

  if (!state) return [];

  return ORDER.filter(type => state[type]).map(type => ({
    type,
    label: type === "sleep" ? `${NAMES.sleep} ${state.sleep}` : NAMES[type]
  }));
}

// The status to show right now. With several, they take turns.
export function currentStatus(unit, now = performance.now()) {
  const list = getStatusList(unit);

  if (list.length === 0) return null;

  return list[Math.floor(now / STATUS_CYCLE_MS) % list.length];
}

export const hasStatus = (unit, type) => Boolean(unit?.status?.[type]);

// Asleep or stoned: cannot be selected, moved or act.
export const isImmobile = unit =>
  Boolean(unit?.status?.sleep || unit?.status?.stone);

// Drawn in the greyed "used" colours: already acted, or stoned.
export const appearsUsed = unit =>
  Boolean(unit?.hasMoved || unit?.status?.stone);

export const statusAlert = type => ALERTS[type] ?? { text: type, color: "#ffffff" };

// The status a weapon inflicts on a hit, or null. Falls back to the weapon's
// text so saves made before this change keep working.
export function getInflictedStatus(weapon) {
  if (!weapon) return null;
  if (weapon.inflicts) return weapon.inflicts;
  if (weapon.poison || /poisons/i.test(weapon.effect ?? "")) return "poison";

  return null;
}

// How much a Restore is worth, for the CPU's choice of target.
export const cureScore = unit => getStatusList(unit).length * 20;

// ==========================================
// CHANGING STATUS
// ==========================================

// Returns true if the unit gained the status (or sleep got longer).
export function applyStatus(unit, type) {
  if (!unit || !NAMES[type] || unit.hp <= 0) return false;

  unit.status ??= {};

  if (type === "sleep") {
    const current = unit.status.sleep ?? 0;

    unit.status.sleep = Math.max(current, SLEEP_TURNS);

    return current < SLEEP_TURNS;
  }

  if (unit.status[type]) return false;

  unit.status[type] = true;

  return true;
}

// One status, or every status when `type` is null.
export function cureStatus(unit, type = null) {
  if (!unit?.status) return;

  if (type) delete unit.status[type];
  else unit.status = {};

  if (Object.keys(unit.status).length === 0) delete unit.status;
}

// ==========================================
// TURN PROCESSING (called from turnMenu.js)
// ==========================================

function forEachUnit(callback) {
  for (let y = 0; y < gameGrid.length; y++) {
    for (let x = 0; x < gameGrid[y].length; x++) {
      const unit = gameGrid[y][x]?.unit;

      if (unit) callback(unit, x, y);
    }
  }
}

// Call when a side's phase ENDS: its sleepers count down one turn.
export function tickSleep(team) {
  forEachUnit(unit => {
    if (unit.team !== team || !unit.status?.sleep) return;

    unit.status.sleep -= 1;

    if (unit.status.sleep <= 0) cureStatus(unit, "sleep");
  });
}

// Call when a side's phase STARTS: its poisoned units lose max HP x 20%.
export function applyPoison(team) {
  let count = 0;

  forEachUnit((unit, x, y) => {
    if (unit.team !== team || !unit.status?.poison || unit.hp <= 0) return;

    const damage = Math.max(1, Math.floor(unit.maxHp * POISON_FRACTION));

    unit.hp = Math.max(POISON_CAN_KILL ? 0 : 1, unit.hp - damage);
    count++;

    if (unit.hp <= 0) gameGrid[y][x].unit = undefined;
  });

  if (count > 0) {
    showToast(`${count} poisoned unit${count > 1 ? "s" : ""} took damage.`);
  }
}

// ==========================================
// TEMPORARY RESISTANCE (Pure Water)
// ==========================================

// unit.tempRes is a plain number on the unit, so saves carry it automatically.
export function addTempRes(unit, amount) {
  if (!unit) return;

  unit.tempRes = Math.max(unit.tempRes ?? 0, amount);
}

// Call when a side's phase STARTS: its units' bonus drops by 1.
export function decayTempRes(team) {
  forEachUnit(unit => {
    if (unit.team !== team || !unit.tempRes) return;

    unit.tempRes -= 1;

    if (unit.tempRes <= 0) delete unit.tempRes;
  });
}