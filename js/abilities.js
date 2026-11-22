import { gameGrid } from "./gameState.js";
import {
  MAX_INVENTORY,
  addItem,
  equipNextAvailableWeapon
} from "./inventory.js";

// ==========================================
// CLASS ABILITIES
// ==========================================

// Class name -> abilities. Add new classes and abilities here.
const CLASS_ABILITIES = {
  Thief: ["steal"],
  Rogue: ["steal", "pass"],
  Assassin: ["pass", "silencer"],
  Summoner: ["summon"],
  Bishop: ["slayer"],
  Sniper: ["sureStrike"],
  General: ["greatShield"],
  WyvernKnight: ["pierce"]
};

// Flat critical-rate bonus a class gets (Serenes Forest: Swordmaster, Berserker).
const CLASS_CRIT_BONUS = {
  Swordmaster: 15,
  Berserker: 15
};

export function getClassCritBonus(unit) {
  return CLASS_CRIT_BONUS[unit?.className] ?? 0;
}

export function hasAbility(unit, ability) {
  return CLASS_ABILITIES[unit?.className]?.includes(ability) ?? false;
}

// ==========================================
// STEAL
// ==========================================

const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Monster weapons (rank: null) are part of the monster and can't be stolen.
export const isStealable = item => Boolean(item) && item.rank !== null;
// Adjacent enemy units with something to take, as { unit, x, y }.
export function getStealTargets(unit, x, y) {
  if (!hasAbility(unit, "steal")) return [];

  const targets = [];

  for (const [dx, dy] of DIRECTIONS) {
    const other = gameGrid[y + dy]?.[x + dx]?.unit;

        if (
      other &&
      other.team !== unit.team &&
      (other.inventory ?? []).some(isStealable)
    ) {
      targets.push({ unit: other, x: x + dx, y: y + dy });
    }
  }

  return targets;
}

export function canSteal(unit, x, y) {
  return getStealTargets(unit, x, y).length > 0;
}

// Moves one item (equipped or not) from the victim to the thief.
// Returns the item, or null if nothing was taken.
export function stealItem(thief, victim, index) {
    const item = victim?.inventory?.[index];

  if (!thief || !item || !isStealable(item)) return null;

  if ((thief.inventory?.length ?? 0) >= MAX_INVENTORY) return null;

  victim.inventory.splice(index, 1);

  if (victim.equippedWeapon === item) victim.equippedWeapon = null;
  item.equipped = false;

  addItem(thief, item);

  // The victim falls back to its next usable weapon. The thief only
  // equips something if it has nothing usable equipped already.
  equipNextAvailableWeapon(victim);
  equipNextAvailableWeapon(thief);

  return item;
}

// ==========================================
// SURE STRIKE
// ==========================================

// Percent chance that a strike is a guaranteed hit: 1.5 x level.
export function sureStrikeChance(unit) {
  return hasAbility(unit, "sureStrike") ? (unit.lvl ?? 1) * 1.5 : 0;
}

// Rolls once per strike.
export function rollSureStrike(unit) {
  return Math.random() * 100 < sureStrikeChance(unit);
}

// ==========================================
// SILENCER, GREAT SHIELD, PIERCE
// ==========================================

// 1.5 x level, in percent.
const levelChance = unit => (unit?.lvl ?? 1) * 1.5;

const roll = percent => Math.random() * 100 < percent;

// A critical hit has a 50% chance to kill outright.
export const SILENCER_CHANCE = 50;

export function rollSilencer(unit) {
  return hasAbility(unit, "silencer") && roll(SILENCER_CHANCE);
}

// The defender must be a General; the attacker's level sets the chance.
export function rollGreatShield(defender, attacker) {
  return hasAbility(defender, "greatShield") && roll(levelChance(attacker));
}

export function rollPierce(unit) {
  return hasAbility(unit, "pierce") && roll(levelChance(unit));
}

