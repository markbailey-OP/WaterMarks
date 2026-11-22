import * as Items from "./items/index.js";
import { canUseWeapon, isWeapon } from "./combat.js";
import { gameGrid } from "./gameState.js";

// ==========================================
// INVENTORY
// ==========================================

export const MAX_INVENTORY = 5;

export function addItem(unit, item) {
  if (!unit.inventory) {
    unit.inventory = [];
  }

  unit.inventory.push(item);
  return item;
}

// ==========================================
// EQUIPPING
// ==========================================

export function equipItem(unit, itemIndex) {
  const item = unit.inventory?.[itemIndex];

  if (!item) return false;

  if (!isWeapon(item)) return false;

  if (!canUseWeapon(unit, item).usable) {
    return false;
  }

  for (const inventoryItem of unit.inventory) {
    inventoryItem.equipped = false;
  }

  item.equipped = true;
  unit.equippedWeapon = item;

  // The equipped weapon always sits in the first slot.
  if (itemIndex > 0) {
    unit.inventory.splice(itemIndex, 1);
    unit.inventory.unshift(item);
  }

  return true;
}

// ==========================================
// DEFAULT STARTING ITEMS
// ==========================================

// Each rank receives an item appropriate to that rank.
const DEFAULT_ITEMS = {
  sword: {
    E: () => new Items.IronSword(),
    D: () => new Items.SteelSword(),
    C: () => new Items.KillingEdge(),
    B: () => new Items.BraveSword(),
    A: () => new Items.SilverSword(),
    S: () => new Items.Audhulma()
  },

  lance: {
    E: () => new Items.IronLance(),
    D: () => new Items.SteelLance(),
    C: () => new Items.KillerLance(),
    B: () => new Items.BraveLance(),
    A: () => new Items.SilverLance(),
    S: () => new Items.Vidofnir()
  },

  axe: {
    E: () => new Items.IronAxe(),
    D: () => new Items.Hammer(),
    C: () => new Items.KillerAxe(),
    B: () => new Items.BattleAxe(),
    A: () => new Items.SilverAxe(),
    S: () => new Items.Garm()
  },

  bow: {
    E: () => new Items.IronBow(),
    D: () => new Items.SteelBow(),
    C: () => new Items.KillerBow(),
    B: () => new Items.BraveBow(),
    A: () => new Items.SilverBow(),
    S: () => new Items.Nidhogg()
  },

  anima: {
    E: () => new Items.Fire(),
    D: () => new Items.Thunder(),
    C: () => new Items.Elfire(),
    B: () => new Items.Bolting(),
    A: () => new Items.Fimbulvetr(),
    S: () => new Items.Excalibur()
  },

  light: {
    E: () => new Items.Lightning(),
    D: () => new Items.Shine(),
    C: () => new Items.Divine(),
    B: () => new Items.Purge(),
    A: () => new Items.Aura(),
    S: () => new Items.Ivaldi()
  },

  dark: {
    D: () => new Items.Flux(),
    C: () => new Items.Luna(),
    B: () => new Items.Eclipse(),
    A: () => new Items.Fenrir(),
    S: () => new Items.Gleipnir()
  },

  staff: {
    E: () => new Items.Heal(),
    D: () => new Items.Mend(),
    C: () => new Items.Recover(),
    B: () => new Items.Physic(),
    A: () => new Items.Fortify(),
    S: () => new Items.Latona()
  }
};

// ==========================================
// DEFAULT MONSTER WEAPONS
// ==========================================

// Monsters without ordinary weapon ranks receive a weapon
// appropriate to their class.
// Class name -> factory, or a list of factories for several weapons.
const MONSTER_DEFAULT_ITEMS = {
  Revenant: () => new Items.RottenClaw(),
  Entombed: () => new Items.SharpClaw(),

  Bael: () => new Items.PoisonClaw(),
  ElderBael: () => new Items.LethalTalon(),

  MautheDoog: () => new Items.FieryFang(),
  Gwyllgi: () => new Items.Hellfang(),

  Mogall: () => new Items.EvilEye(),
  ArchMogall: () => new Items.CrimsonEye(),

  Gorgon: () => new Items.DemonSurge(),
  GorgonEgg: () => new Items.Stone(),
  DracoZombie: () => new Items.FieryFang(),

  DemonKing: () => new Items.DemonLight()
};

export function hasMonsterWeapon(className) {
  return Object.hasOwn(MONSTER_DEFAULT_ITEMS, className);
}

export function giveMonsterWeapon(unit) {
  const make = MONSTER_DEFAULT_ITEMS[unit?.className];

  if (!make || (unit.inventory?.length ?? 0) >= MAX_INVENTORY) return null;

  const item = make();

  addItem(unit, item);
  equipNextAvailableWeapon(unit);

  return item;
}

const RANKS = ["E", "D", "C", "B", "A", "S"];

// Names of the items giveDefaultWeapon hands out (one per weapon type).
export function getDefaultItemNames() {
  const names = new Set();

  for (const rankItems of Object.values(DEFAULT_ITEMS)) {
    const lowest = RANKS.find(rank => rankItems[rank]);

    if (lowest) names.add(rankItems[lowest]().name);
  }

  return names;
}

// ==========================================
// GIVE DEFAULT STARTING ITEMS
// ==========================================


export function giveDefaultWeapon(unit) {
  if (!unit) return [];

  if (!unit.inventory) {
    unit.inventory = [];
  }

  const startingItems = [];

  // Monster-specific weapons take priority.
  const monsterWeapon = MONSTER_DEFAULT_ITEMS[unit.className];

    if (hasMonsterWeapon(unit.className)) {
    const item = giveMonsterWeapon(unit);
    return item ? [item] : [];
  }

  const weaponRanks = unit.weaponRanks ?? {};

  // Give the lowest-ranking item for every weapon
  // type the unit has a weapon rank in.
  for (const [type, rank] of Object.entries(weaponRanks)) {
    if (!rank) continue;

    const rankItems = DEFAULT_ITEMS[type];

    if (!rankItems) continue;

    const lowestRank = RANKS.find(
      availableRank => rankItems[availableRank]
    );

    if (!lowestRank) continue;

    const item = rankItems[lowestRank]();

    addItem(unit, item);
    startingItems.push(item);
  }

  // Equip the first usable weapon.
  equipNextAvailableWeapon(unit);

  return startingItems;
}

// One default item of this weapon type, if there's room.
export function giveDefaultItemOfType(unit, type) {
  const rankItems = DEFAULT_ITEMS[type];

  if (!rankItems) return null;

  const lowest = RANKS.find(rank => rankItems[rank]);

  if (!lowest || (unit.inventory?.length ?? 0) >= MAX_INVENTORY) return null;

  const item = rankItems[lowest]();
  addItem(unit, item);

  return item;
}

// ==========================================
// WEAPON DURABILITY
// ==========================================

export function consumeWeaponUse(unit, weapon) {
  if (!unit || !weapon) return false;

  const inInventory = unit.inventory?.includes(weapon);
  const isTileBallista = unit.inBallista && isBallista(weapon);

  if (!inInventory && !isTileBallista) return false;

  // A successful hit consumes one use.
  if (Number.isFinite(weapon.uses)) {
    weapon.uses = Math.max(0, weapon.uses - 1);
  }

  if (weapon.uses === 0) {
    if (inInventory) {
      unit.inventory.splice(unit.inventory.indexOf(weapon), 1);
    }

    if (unit.equippedWeapon === weapon) {
      unit.equippedWeapon = null;
    }

    weapon.equipped = false;

    // Spent ballista: unit leaves it and can move again.
    if (isTileBallista) {
      unit.inBallista = false;
      if (Number.isFinite(unit._ballistaSavedMove)) {
        unit.move = unit._ballistaSavedMove;
      }
      delete unit._ballistaSavedMove;
      delete unit._ballistaPrevWeapon;
      equipNextAvailableWeapon(unit);
    }

    return true;
  }

  return false;
}

// ==========================================
// AUTOMATIC WEAPON RE-EQUIPPING
// ==========================================

export function equipNextAvailableWeapon(unit) {
  if (!unit) return null;

  // Crewed ballista stays equipped (it is not in inventory).
  if (
    unit.inBallista &&
    unit.equippedWeapon &&
    isBallista(unit.equippedWeapon) &&
    canUseWeapon(unit, unit.equippedWeapon).usable
  ) {
    return unit.equippedWeapon;
  }

  // Keep the current inventory weapon if it is still usable.
  if (
    unit.equippedWeapon &&
    unit.inventory?.includes(unit.equippedWeapon) &&
    isWeapon(unit.equippedWeapon) &&
    canUseWeapon(unit, unit.equippedWeapon).usable
  ) {
    return unit.equippedWeapon;
  }

  // Do not strip a crewed ballista when searching inventory fails.
  if (unit.inBallista && unit.equippedWeapon && isBallista(unit.equippedWeapon)) {
    return unit.equippedWeapon;
  }

  unit.equippedWeapon = null;

  for (const item of unit.inventory ?? []) {
    item.equipped = false;
  }

  // Inventory order determines which weapon is selected.
  for (let i = 0; i < (unit.inventory?.length ?? 0); i++) {
    const item = unit.inventory[i];

    if (!isWeapon(item)) continue;

    if (canUseWeapon(unit, item).usable) {
      equipItem(unit, i);
      return item;
    }
  }

  return null;
}

// Moves every plunder item from a defeated unit to its killer.
// Items that don't fit in the killer's inventory are left behind.
export function plunderItems(from, to) {
  if (!from || !to || from === to) return [];

  const taken = [];

  for (const item of [...(from.inventory ?? [])]) {
    if (!item.plunder) continue;
    if ((to.inventory?.length ?? 0) >= MAX_INVENTORY) break;

    from.inventory.splice(from.inventory.indexOf(item), 1);

    if (from.equippedWeapon === item) from.equippedWeapon = null;
    item.equipped = false;

    addItem(to, item);
    taken.push(item);
  }

  return taken;
}

// Replaces a monster's rank-less weapons with its current class's default.
export function swapMonsterWeapon(unit) {
  if (!hasMonsterWeapon(unit?.className)) return null;

  unit.inventory = (unit.inventory ?? []).filter(item => {
    const drop = isWeapon(item) && item.rank === null;

    if (drop) {
      item.equipped = false;
      if (unit.equippedWeapon === item) unit.equippedWeapon = null;
    }

    return !drop;
  });

  return giveMonsterWeapon(unit);
}

// Gives a default item for every weapon type the unit can use but holds no
// item of. Used by promoted spawns, so they match a freshly built unit of
// that class. Monsters are skipped: they use their own weapons.
export function giveMissingDefaultWeapons(unit) {
  if (!unit || hasMonsterWeapon(unit.className)) return [];

  const given = [];

  for (const [type, rank] of Object.entries(unit.weaponRanks ?? {})) {
    if (!rank) continue;

    const has = (unit.inventory ?? []).some(
      item => String(item.type).toLowerCase() === type
    );

    if (has) continue;

    const item = giveDefaultItemOfType(unit, type);

    if (item) given.push(item);
  }

  equipNextAvailableWeapon(unit);

  return given;
}

// ==========================================
// BALLISTA
// ==========================================

export function isBallista(item) {
  return Boolean(item && /ballista/i.test(item.name ?? ""));
}

export function canCrewBallista(unit) {
  return Boolean(
    unit &&
    (unit.className === "Archer" || unit.className === "Sniper")
  );
}

// Tile has a ballista the unit can enter (same team occupancy is not required to enter).
export function tileHasUsableBallista(x, y, unit) {
  const tile = gameGrid?.[y]?.[x];
  if (!tile?.ballista || !canCrewBallista(unit)) return false;
  if (Number.isFinite(tile.ballista.uses) && tile.ballista.uses <= 0) return false;
  return true;
}

// Enter: movement becomes 0, inventory weapons unusable, ballista becomes equipped.
// Ballista does not consume an inventory slot.
export function enterBallista(unit, x, y) {
  const tile = gameGrid?.[y]?.[x];
  if (!tile?.ballista || !canCrewBallista(unit)) return false;
  if (unit.inBallista) return false;
  if (Number.isFinite(tile.ballista.uses) && tile.ballista.uses <= 0) return false;

  unit.inBallista = true;
  unit._ballistaSavedMove = unit.move;
  unit.move = 0;

  // Remember previous equipped so exit can restore.
  unit._ballistaPrevWeapon = unit.equippedWeapon ?? null;
  for (const inv of unit.inventory ?? []) inv.equipped = false;

  tile.ballista.equipped = true;
  unit.equippedWeapon = tile.ballista;
  return true;
}

export function exitBallista(unit, x, y) {
  if (!unit?.inBallista) return false;
  const tile = gameGrid?.[y]?.[x];

  unit.inBallista = false;
  if (Number.isFinite(unit._ballistaSavedMove)) {
    unit.move = unit._ballistaSavedMove;
  }
  delete unit._ballistaSavedMove;

  if (tile?.ballista) tile.ballista.equipped = false;
  unit.equippedWeapon = unit._ballistaPrevWeapon ?? null;
  delete unit._ballistaPrevWeapon;

  equipNextAvailableWeapon(unit);
  return true;
}
