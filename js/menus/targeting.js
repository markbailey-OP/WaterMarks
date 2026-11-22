import { gameGrid } from "../gameState.js";
import { canUseWeapon, isWeapon } from "../combat.js";
import { getStatusList, hasStatus, cureScore } from "../status.js";

// ==========================================
// SHARED RANGE HELPERS
// ==========================================

// Adds every in-bounds tile whose distance from any origin is min..max.
function tilesInRange(origins, min, max, tiles = new Map()) {
  for (const origin of origins) {
    for (let dy = -max; dy <= max; dy++) {
      for (let dx = -max; dx <= max; dx++) {
        const distance = Math.abs(dx) + Math.abs(dy);

        if (distance < min || distance > max) continue;

        const x = origin.x + dx;
        const y = origin.y + dy;

        if (
          y < 0 ||
          y >= gameGrid.length ||
          x < 0 ||
          x >= gameGrid[y].length
        ) {
          continue;
        }

        tiles.set(`${x},${y}`, { x, y });
      }
    }
  }

  return tiles;
}

// ==========================================
// ITEM RANGE (single source of truth for weapons)
// ==========================================

export function getItemRange(item) {
  const range = item.range;

  // A plain number means "up to N tiles". Bows cannot hit adjacent tiles.
  if (Number.isFinite(range)) {
    return {
      min: item.type === "Bow" ? 2 : 1,
      max: range
    };
  }

  if (Array.isArray(range)) {
    return {
      min: range[0],
      max: range[1] ?? range[0]
    };
  }

  if (range && typeof range === "object") {
    return {
      min: range.min ?? (item.type === "Bow" ? 2 : 1),
      max: range.max ?? range.min ?? 1
    };
  }

  // Non-numeric ranges (e.g. staff strings like "1~Mag/2") are not
  // attack ranges.
  return null;
}

// ==========================================
// WEAPONS AND ATTACK TILES
// ==========================================

function isBallistaWeapon(item) {
  return Boolean(item && /ballista/i.test(item.name ?? ""));
}

// Weapons the unit can fire at this distance, including a crewed ballista
// (which lives on the tile, not in inventory).
export function getWeaponsInRange(unit, distance) {
  const weapons = [];

  for (const item of unit.inventory ?? []) {
    if (!isWeapon(item)) continue;

    const range = getItemRange(item);
    if (!range) continue;
    if (distance < range.min || distance > range.max) continue;
    if (!canUseWeapon(unit, item).usable) continue;

    weapons.push(item);
  }

  // Crewed ballista is equipped but not in inventory.
  if (unit.inBallista && unit.equippedWeapon && isBallistaWeapon(unit.equippedWeapon)) {
    const item = unit.equippedWeapon;
    const range = getItemRange(item);
    if (
      range &&
      distance >= range.min &&
      distance <= range.max &&
      canUseWeapon(unit, item).usable
    ) {
      if (!weapons.includes(item)) weapons.push(item);
    }
  }

  return weapons;
}

// Every tile the unit's usable weapons can hit from the given origins.
// Origins that sit on a crewable ballista also contribute that ballista's range
// (so moving onto a ballista previews its long shots).
export function getAttackTiles(unit, origins) {
  const tiles = new Map();

  for (const item of unit.inventory ?? []) {
    if (!isWeapon(item) || !canUseWeapon(unit, item).usable) continue;

    const range = getItemRange(item);
    if (!range) continue;

    tilesInRange(origins, range.min, range.max, tiles);
  }

  // Crewed ballista weapon (not in inventory).
  if (unit.inBallista && unit.equippedWeapon && isBallistaWeapon(unit.equippedWeapon)) {
    const range = getItemRange(unit.equippedWeapon);
    if (range && canUseWeapon(unit, unit.equippedWeapon).usable) {
      tilesInRange(origins, range.min, range.max, tiles);
    }
  }

  // From each origin that has a ballista this unit could crew, preview
  // that ballista's attack range (even before entering).
  if (!unit.inBallista) {
    for (const origin of origins) {
      const tile = gameGrid[origin.y]?.[origin.x];
      const ballista = tile?.ballista;
      if (!ballista || !isBallistaWeapon(ballista)) continue;
      if (Number.isFinite(ballista.uses) && ballista.uses <= 0) continue;

      // Only archers/snipers can crew; skip others.
      const className = unit.className;
      if (className !== "Archer" && className !== "Sniper") continue;

      const range = getItemRange(ballista);
      if (!range) continue;

      tilesInRange([origin], range.min, range.max, tiles);
    }
  }

  return [...tiles.values()];
}

// ==========================================
// STAFF RANGE (single source of truth for staves)
// ==========================================

// Returns { min, max } or null when the staff has no tile range.
export function getStaffRange(unit, staff) {
  const r = staff.range;
  let range = null;

  if (Number.isFinite(r)) {
    range = { min: 1, max: r };
  } else if (Array.isArray(r)) {
    range = { min: r[0], max: r[1] ?? r[0] };
  } else if (r === "1~Mag/2") {
    range = { min: 1, max: Math.max(1, Math.floor((unit.mag ?? 0) / 2)) };
  } else if (r && typeof r === "object") {
    range = { min: r.min ?? 1, max: r.max ?? r.min ?? 1 };
  }

  if (
    !range ||
    !Number.isFinite(range.min) ||
    !Number.isFinite(range.max) ||
    range.max < range.min
  ) {
    return null;
  }

  return range;
}

// Every tile in range of this staff from (originX, originY).
export function getStaffRangeTiles(unit, staff, originX, originY) {
  if (!unit || !staff) return [];

  if (staff.range === "All") {
    const tiles = [];
    for (let y = 0; y < gameGrid.length; y++) {
      for (let x = 0; x < gameGrid[y].length; x++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }

  const range = getStaffRange(unit, staff);
  if (!range) return [];

  const tiles = new Map();
  tilesInRange([{ x: originX, y: originY }], range.min, range.max, tiles);
  return [...tiles.values()];
}

// Every tile the unit's usable staves can reach
// from the given movement positions.
export function getStaffTiles(unit, origins) {
  const tiles = new Map();

  for (const item of unit.inventory ?? []) {
    if (item.type !== "Staff") continue;
    if (!canUseWeapon(unit, item).usable) continue;

    const range = getStaffRange(unit, item);

    if (!range) continue;

    tilesInRange(origins, range.min, range.max, tiles);
  }

  return [...tiles.values()];
}

// ==========================================
// HEALING STAVES
// ==========================================

// A "support" staff heals, cures a status, or inflicts one.
export function isHealingStaff(staff) {
  return (
    staff?.type === "Staff" &&
    (staff.heal !== undefined || staff.cures === true || staff.inflicts !== undefined)
  );
}

// What a use is worth. For healing it is HP restored; for the others it is
// a score the CPU uses to compare targets.
export function getHealAmount(user, staff, target) {
  if (staff.inflicts) return hasStatus(target, staff.inflicts) ? 0 : 20;
  if (staff.cures) return cureScore(target);

  const missing = target.maxHp - target.hp;

  if (staff.heal === "full") return missing;

  return Math.min(missing, (user.mag ?? 0) + staff.heal);
}

// Valid targets this staff can reach from (originX, originY): wounded allies,
// allies with a status (Restore), or enemies without the status (Sleep).
export function getHealTargets(unit, staff, originX, originY) {
  if (!unit || !staff) return [];

  const range = getStaffRange(unit, staff);

  if (!range) return [];

  const valid = staff.inflicts
    ? t => t.team !== unit.team && !hasStatus(t, staff.inflicts)
    : staff.cures
      ? t => t.team === unit.team && getStatusList(t).length > 0
      : t => t.team === unit.team && t.hp < t.maxHp;

  const targets = [];

  for (let y = 0; y < gameGrid.length; y++) {
    for (let x = 0; x < gameGrid[y].length; x++) {
      const target = gameGrid[y][x].unit;

      if (!target || !valid(target)) continue;

      const distance = Math.abs(x - originX) + Math.abs(y - originY);

      if (distance < range.min || distance > range.max) continue;

      targets.push({
        type: "unit",
        name: target.name,
        unit: target,
        x,
        y,
        distance
      });
    }
  }

  return targets;
} 

// True if any usable healing staff has a target from (x, y).
export function canUseHealingStaff(unit, x, y) {
  return (unit.inventory ?? []).some(staff =>
    isHealingStaff(staff) &&
    canUseWeapon(unit, staff).usable &&
    getHealTargets(unit, staff, x, y).length > 0
  );
}

// ==========================================
// ATTACK TARGET DETECTION
// ==========================================

export function findAttackTargets(unit, x, y) {
  const targets = [];

  for (let ty = 0; ty < gameGrid.length; ty++) {
    for (let tx = 0; tx < gameGrid[ty].length; tx++) {
      const tile = gameGrid[ty][tx];
      let target = null;

      if (tile.unit && tile.unit.team !== unit.team) {
        target = {
          type: "unit",
          name: tile.unit.name,
          unit: tile.unit,
          x: tx,
          y: ty
        };
      } else if (
        tile.name === "WeakWall" ||
        (
          tile.name === "Snag" &&
          (!tile.unit || tile.unit.terrFactor !== "flier")
        )
      ) {
        target = {
          type: "terrain",
          name: tile.name,
          tile,
          x: tx,
          y: ty
        };
      }

      if (!target) continue;

      const distance =
        Math.abs(tx - x) + Math.abs(ty - y);

      const weapons = getWeaponsInRange(unit, distance);

      if (weapons.length > 0) {
        target.distance = distance;
        target.weapons = weapons;
        targets.push(target);
      }
    }
  }

  return targets;
}
