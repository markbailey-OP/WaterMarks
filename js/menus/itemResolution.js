import { sleep } from "../utils.js";
import { consumeWeaponUse } from "../inventory.js";
import {
  BATTLE_TIMING,
  createBattleStatus,
  clearBattleStatus,
  animateHpChange
} from "./combatAnimation.js";
import { 
  hasStatus, 
  cureStatus, 
  addTempRes } 
from "../status.js";
import { setAlert } from "../gameArea.js";
import { animMs } from "../settings.js";

// Staves also carry a `heal` value, so check the type too.
export function isHealingItem(item) {
  return item?.type === "Consumable" && item.heal !== undefined;
}

export function getItemHealAmount(unit, item) {
  const missing = unit.maxHp - unit.hp;

  if (item.heal === "full") return missing;

  return Math.min(missing, item.heal);
}

export function canUseHealingItem(unit, item) {
  return (
    isHealingItem(item) &&
    unit.hp > 0 &&
    unit.hp < unit.maxHp &&
    !(Number.isFinite(item.uses) && item.uses <= 0)
  );
}

export async function useHealingItem(unit, item) {
  const amount = getItemHealAmount(unit, item);

  createBattleStatus(unit, unit);          // one-unit HP panel
  await sleep(BATTLE_TIMING.beforeFirstStrike);
  await animateHpChange(unit, amount, unit, null);
  await sleep(BATTLE_TIMING.resultPause);
  clearBattleStatus();

  consumeWeaponUse(unit, item);            // works for any item with uses
}

export const BRACE_UNITS = {
  "Lunar Brace": "WyvernRider",
  "Solar Brace": "PegasusKnight"
};

export function isBraceItem(item) {
  return item?.type === "Consumable" && item.name in BRACE_UNITS;
}

// ==========================================
// CURES AND RESISTANCE ITEMS
// ==========================================

export const isCureItem = item =>
  item?.type === "Consumable" &&
  (item.cures === "poison" || item.name === "Antitoxin");

export const isResItem = item =>
  item?.type === "Consumable" &&
  (item.resBoost > 0 || item.name === "Pure Water");

const getResBoost = item => item.resBoost ?? 7;

const hasUses = item => !(Number.isFinite(item.uses) && item.uses <= 0);

export function canUseCureItem(unit, item) {
  return (
    isCureItem(item) && hasUses(item) &&
    unit.hp > 0 && hasStatus(unit, "poison")
  );
}

export function canUseResItem(unit, item) {
  return (
    isResItem(item) && hasUses(item) &&
    unit.hp > 0 && (unit.tempRes ?? 0) < getResBoost(item)
  );
}

// True for any consumable that does something when used from the menu
// (healing, cures, Pure Water). Braces are handled separately.
export function canUseItemEffect(unit, item) {
  return (
    canUseHealingItem(unit, item) ||
    canUseCureItem(unit, item) ||
    canUseResItem(unit, item)
  );
}

async function showItemAlert(unit, text, color) {
  setAlert([{ text, unit, color }]);
  await sleep(animMs(700));
  setAlert(null);
}

export async function useItemEffect(unit, item) {
  if (isHealingItem(item)) {
    await useHealingItem(unit, item);
    return;
  }

  if (isCureItem(item)) {
    cureStatus(unit, "poison");
    await showItemAlert(unit, "CURED", "#7fffa0");
  } else if (isResItem(item)) {
    const boost = getResBoost(item);

    addTempRes(unit, boost);
    await showItemAlert(unit, `RES +${boost}`, "#7fd4ff");
  }

  consumeWeaponUse(unit, item);
}