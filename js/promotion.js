import * as Units from "./units.js";
import { isMonster } from "./combat.js";
import {
  isPromoted,
  getClassTier,
  WEAPON_RANK_THRESHOLDS,
  raiseRanksFromExp
} from "./exp.js";
import {
  equipNextAvailableWeapon,
  giveDefaultItemOfType,
  swapMonsterWeapon
} from "./inventory.js";

export const PROMOTION_LEVEL = 10;

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

// Middle-tier classes need one of these in their inventory.
const MASTER_SEAL = "Master Seal";

const CLASS_ITEMS = {
  "Hero Crest": ["Mercenary", "Myrmidon", "Fighter"],
  "Knight Crest": ["Cavalier", "Knight"],
  "Orion's Bolt": ["Archer"],
  "Elysian Whip": ["PegasusKnight", "WyvernRider"],
  "Guiding Ring": ["Mage", "Monk", "Priest", "Cleric", "Shaman", "Troubadour"],
  "Ocean Seal": ["Thief", "Pirate"]
};

// The item this unit would use to promote, or null. Class-specific items
// come first so a Master Seal is only spent when nothing else fits.
export function getPromotionItem(unit) {
  const items = unit?.inventory ?? [];

  return (
    items.find(item => CLASS_ITEMS[item.name]?.includes(unit.className)) ??
    items.find(item => item.name === MASTER_SEAL) ??
    null
  );
}

// Class names this unit can promote into right now.
export function getPromotionOptions(unit) {
  if (!unit || isPromoted(unit)) return [];
  if ((unit.lvl ?? 1) < PROMOTION_LEVEL) return [];

  // Trainees promote freely; middle tier needs an item.
    if (
    getClassTier(unit.className) === 1 &&
    !isMonster(unit) &&
    !getPromotionItem(unit)
  ) {
    return [];
  }

  return Object.keys(unit.promotionGains ?? {})
    .filter(name => typeof Units[name] === "function");
}

// A stat after a promotion gain, limited by the new class's cap.
function promotedValue(current, gain, cap) {
  const next = current + gain;

  return Number.isFinite(cap) ? Math.min(next, Math.max(cap, current)) : next;
}

// What promoting `unit` into `className` would do, without changing
// anything. Null if that promotion isn't possible.
export function getPromotionPreview(unit, className) {
  const gains = unit?.promotionGains?.[className];
  const UnitClass = Units[className];

  if (!gains || typeof UnitClass !== "function") return null;

  const template = new UnitClass(unit.team);
  const main = unit.mag !== undefined && unit.mag !== null ? "mag" : "str";

  // [key in the gains table, key on the unit, label]
  const columns = [
    ["hp", "maxHp", "HP"],
    [main, main, main === "mag" ? "Mag" : "Str"],
    ["skl", "skl", "Skl"],
    ["spd", "spd", "Spd"],
    ["lck", "lck", "Lck"],
    ["def", "def", "Def"],
    ["res", "res", "Res"],
    ["move", "move", "Mov"],
    ["con", "con", "Con"]
  ];

  const stats = [];

  for (const [gainKey, unitKey, label] of columns) {
    const current = unit[unitKey];

    if (typeof current !== "number") continue;

    const gain = gains[gainKey];
    const cap = template.maxStats?.[gainKey];

    const next = Number.isFinite(gain) && gain !== 0
      ? promotedValue(current, gain, cap)
      : current;

    stats.push({
      label,
      from: current,
      to: next,
      capped: Number.isFinite(cap) && next >= cap
    });
  }

  return {
    fromClass: unit.className,
    toClass: className,
    fromLevel: unit.lvl,
    toLevel: 1,
    stats
  };
}

// Turns `unit` into `className` in place: new class data, promotion
// gains, level 1, 0 EXP. Does no eligibility check, item use or fort
// record, so it can also build spawned units. Returns false if it can't apply.
export function applyPromotion(unit, className) {
  const gains = unit?.promotionGains?.[className];
  const UnitClass = Units[className];

  if (!gains || typeof UnitClass !== "function") return false;

  // A throwaway instance supplies the new class's data.
  const template = new UnitClass(unit.team);
  const oldClass = unit.className;

  // Shown as "(10) 1" next to the level.
  unit.priorLevel = unit.lvl;

  unit.className = template.className;
  unit.icon = template.icon;
  unit.terrFactor = template.terrFactor;
  unit.growthRates = template.growthRates;
  unit.maxStats = template.maxStats;
  unit.promotionGains = template.promotionGains;

  if (unit.name === oldClass) unit.name = className;

  // Promotion gains, limited by the new class's maximums.
  for (const [stat, gain] of Object.entries(gains)) {
    if (!Number.isFinite(gain) || gain === 0) continue;

    const key = stat === "hp" ? "maxHp" : stat;
    const current = unit[key];

    if (typeof current !== "number") continue;

    const next = promotedValue(current, gain, unit.maxStats?.[stat]);
    unit[key] = next;

    if (stat === "hp") {
      unit.hp = Math.min(unit.maxHp, unit.hp + (next - current));
    }
  }

  unit.weaponRanks ??= {};
  unit.weaponExp ??= {};

  // Weapon types the new class can't use are locked. Their EXP stays in
  // unit.weaponExp as a log for later promotions.
  for (const type of Object.keys(unit.weaponRanks)) {
    if (type in template.weaponRanks) continue;

    delete unit.weaponRanks[type];
    delete unit[type];
  }

  const gainedTypes = [];

  for (const [type, rank] of Object.entries(template.weaponRanks)) {
    const current = unit.weaponRanks[type];

    if (!current) gainedTypes.push(type);

    if (!current || RANK_ORDER.indexOf(current) < RANK_ORDER.indexOf(rank)) {
      unit.weaponRanks[type] = rank;
      unit[type] = rank;
    }

      unit.weaponExp[type] = Math.max(
      unit.weaponExp[type] ?? 0,
      WEAPON_RANK_THRESHOLDS[unit.weaponRanks[type]] ?? 0
    );
  }

  // Logged EXP can beat the promotion's base rank.
  raiseRanksFromExp(unit);

  unit.lvl = 1;
  unit.exp = 0;
  
  swapMonsterWeapon(unit);   // Bael's Poison Claw becomes Elder Bael's Lethal Talon

  // A locked weapon can't stay equipped. If nothing usable is left,
  // hand over a basic weapon of a newly gained type (not staves).
  equipNextAvailableWeapon(unit);

  if (!unit.equippedWeapon) {
    for (const type of gainedTypes) {
      if (type === "staff") continue;

      if (giveDefaultItemOfType(unit, type)) {
        equipNextAvailableWeapon(unit);
        break;
      }
    }
  }

  return true;
}

// Name of the item a class needs to promote: its own item, else a Master Seal.
export function getPromotionItemName(className) {
  for (const [name, classes] of Object.entries(CLASS_ITEMS)) {
    if (classes.includes(className)) return name;
  }

  return MASTER_SEAL;
}