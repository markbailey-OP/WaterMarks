import * as Items from "./items/index.js";
import { canUseWeapon, isWeapon } from "./combat.js";
import { 
  getDefaultItemNames, 
  hasMonsterWeapon, 
  MAX_INVENTORY, 
  addItem, equipItem } 
from "./inventory.js";

// ==========================================
// LUCKY WEAPON SETTINGS (tweak for balance)
// ==========================================

export const LUCKY = {
  enabled: true,

  // Percent chance to get a lucky weapon = Lck x this (capped at 100).
  chancePerLuck: 2.5,

  // Percent chance for each listed item of that rank to be the one given.
  tierChances: { S: 5, A: 10, B: 20, C: 30, D: 40, E: 50 },

  // Equip the lucky weapon when it is a weapon (staves are never equipped).
  equip: true,

  // Only staves with a heal value are eligible (others aren't implemented).
  healingStavesOnly: true,

  // Classes that never roll for a lucky weapon, e.g. ["Lord", "GreatLord"].
  skipClasses: [],

  // Items that can never be lucky weapons.
  excludedItems: [
    "Ballista", "Iron Ballista", "Killer Ballista",
    "Beacon Bow", "Fiendcleaver", "Shadowkiller", "Bright Lance",
    "Alacalibur", "Naglfar"
  ],

  // Order of items inside one rank and weapon type. Earlier items are
  // rolled first, so they are more likely. The item exports are sorted
  // alphabetically by the module system, so by default the cheapest come
  // first (unobtainable items last, then by name).
  sort: (a, b) =>
    worthOf(a) - worthOf(b) || a.name.localeCompare(b.name)
};

function worthOf(entry) {
  return Number.isFinite(entry.worth) ? entry.worth : Infinity;
}

const RANKS = ["E", "D", "C", "B", "A", "S"];

// ==========================================
// ITEM CATALOG (built once)
// ==========================================

let catalog = null;

function getCatalog() {
  if (catalog) return catalog;

  catalog = [];

  const seen = new Set();

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
    if (sample.type === "Consumable") continue;
    if (!RANKS.includes(sample.rank)) continue;
    if (!Number.isFinite(sample.uses)) continue;

    const key = `${sample.type}|${sample.name}`;

    if (seen.has(key)) continue;
    seen.add(key);

    catalog.push({
      Cls,
      sample,
      name: sample.name,
      type: sample.type.toLowerCase(),
      rank: sample.rank,
      worth: sample.worth,
      isStaff: sample.type === "Staff",
      isHealing: sample.heal !== undefined
    });
  }

  return catalog;
}

// ==========================================
// CANDIDATE LIST
// ==========================================

// The ordered list this unit would roll through: highest rank first,
// and inside a rank the weapon type the unit is best at first.
export function getLuckyCandidates(unit) {
  const ranks = unit?.weaponRanks ?? {};
  const defaults = getDefaultItemNames();
  const excluded = new Set(LUCKY.excludedItems);

  const types = Object.keys(ranks)
    .filter(type => RANKS.includes(ranks[type]))
    .sort((a, b) => RANKS.indexOf(ranks[b]) - RANKS.indexOf(ranks[a]));

  const list = [];

  for (let r = RANKS.length - 1; r >= 0; r--) {
    for (const type of types) {
      if (RANKS.indexOf(ranks[type]) < r) continue;

      const group = getCatalog()
        .filter(entry =>
          entry.type === type &&
          entry.rank === RANKS[r] &&
          !excluded.has(entry.name) &&
          !defaults.has(entry.name) &&
          !(LUCKY.healingStavesOnly && entry.isStaff && !entry.isHealing) &&
          canUseWeapon(unit, entry.sample).usable
        )
        .sort(LUCKY.sort);

      list.push(...group);
    }
  }

  return list;
}

// ==========================================
// ROLLING
// ==========================================

export function getLuckyChance(unit) {
  return Math.max(0, Math.min(100, (unit?.lck ?? 0) * LUCKY.chancePerLuck));
}

// Rolls for a lucky weapon and adds it. Returns the item, or null.
export function giveLuckyWeapon(unit) {
  if (!LUCKY.enabled || !unit) return null;
  if (hasMonsterWeapon(unit.className)) return null;   
  if (LUCKY.skipClasses.includes(unit.className)) return null;
  if ((unit.inventory?.length ?? 0) >= MAX_INVENTORY) return null;

  if (Math.random() * 100 >= getLuckyChance(unit)) return null;

  const list = getLuckyCandidates(unit);

  if (list.length === 0) return null;

  // First success wins. If every roll fails, the last item is given.
  let chosen = list[list.length - 1];

  for (const entry of list) {
    if (Math.random() * 100 < (LUCKY.tierChances[entry.rank] ?? 0)) {
      chosen = entry;
      break;
    }
  }

  const item = new chosen.Cls();

  addItem(unit, item);

  if (LUCKY.equip && isWeapon(item)) {
    equipItem(unit, unit.inventory.indexOf(item));
  }

  return item;
}