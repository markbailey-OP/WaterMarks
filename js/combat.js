import { hasAbility, getClassCritBonus } from "./abilities.js";
import { hasStatus, STONE_CRIT_BONUS } from "./status.js";

const WEAPON_TRIANGLE = {
  Sword: { Axe: 1, Lance: -1 },
  Axe: { Lance: 1, Sword: -1 },
  Lance: { Sword: 1, Axe: -1 },

  Anima: { Light: 1, Dark: -1 },
  Light: { Dark: 1, Anima: -1 },
  Dark: { Anima: 1, Light: -1 }
};

const MAGICAL_WEAPONS = new Set([
  "Anima",
  "Light",
  "Dark"
]);

const RANK_ORDER = {
  E: 0,
  D: 1,
  C: 2,
  B: 3,
  A: 4,
  S: 5
};

// --------------------------------------------------
// WEAPON TRIANGLE
// --------------------------------------------------

export function getWeaponTriangle(attackerWeapon, defenderWeapon) {
  const attackerType = attackerWeapon?.type;
  const defenderType = defenderWeapon?.type;

  const advantage = WEAPON_TRIANGLE[attackerType]?.[defenderType] ?? 0;

  if (advantage === 1) {
    return {
      damage: 1,
      hit: 15,
      advantage: "advantage"
    };
  }

  if (advantage === -1) {
    return {
      damage: -1,
      hit: -15,
      advantage: "disadvantage"
    };
  }

  return {
    damage: 0,
    hit: 0,
    advantage: "neutral"
  };
}

// --------------------------------------------------
// ATTACK SPEED
// --------------------------------------------------

export function calculateAttackSpeed(unit, weapon) {
  const speed = unit.spd ?? 0;
  const constitution = unit.con ?? 0;
  const weaponWeight = weapon?.wt ?? 0;

  const weightPenalty = Math.max(
    0,
    weaponWeight - constitution
  );

  return Math.max(0, speed - weightPenalty);
}

// --------------------------------------------------
// WEAPON RANK CHECK
// --------------------------------------------------

// True for items that can be equipped and used to attack.
// Staves and consumables are never attack weapons.
export function isWeapon(item) {
  return Boolean(item) &&
    item.type !== "Staff" &&
    item.type !== "Consumable";
}

// Returns { usable, reason }. Always check `.usable`.
export function canUseWeapon(unit, weapon) {
  if (!unit || !weapon) {
    return {
      usable: false,
      reason: "Invalid unit or weapon."
    };
  }

  // While manning a ballista only the ballista itself is usable.
  if (unit.inBallista) {
    const isThisBallista = /ballista/i.test(weapon.name ?? "");
    if (!isThisBallista) {
      return {
        usable: false,
        reason: "Unit is manning a ballista."
      };
    }
  }

  if (Number.isFinite(weapon.uses) && weapon.uses <= 0) {
    return {
      usable: false,
      reason: "Weapon has no uses remaining."
    };
  }

  if (!weapon.rank) {
    return {
      usable: true,
      reason: null
    };
  }

  // Character-specific ("Prf") and special ("*") ranks are not
  // modeled yet, so they are treated as usable for now.
  if (weapon.rank === "Prf" || weapon.rank === "*") {
    return {
      usable: true,
      reason: null
    };
  }

  const weaponType = weapon.type?.toLowerCase();
  const unitRank =
    unit.weaponRanks?.[weaponType] ??
    unit[weaponType];

  const requiredRank = RANK_ORDER[weapon.rank];
  const availableRank = RANK_ORDER[unitRank];

  if (requiredRank === undefined || availableRank === undefined) {
    return {
      usable: false,
      reason: "Unit does not have the required weapon rank."
    };
  }

  if (availableRank < requiredRank) {
    return {
      usable: false,
      reason: "Unit's weapon rank is too low."
    };
  }

  return {
    usable: true,
    reason: null
  };
}

// Brave weapons strike twice in a row. (The effect text is a fallback for
// items restored from older saves.)
export function isBrave(weapon) {
  return Boolean(weapon) &&
    (weapon.brave === true || /consecutive hits/i.test(weapon.effect ?? ""));
}

export const ignoresResistance = weapon =>
  weapon?.ignoresRes === true || weapon?.name === "Luna";

// Share of damage dealt the user recovers (0 for most weapons).
export const drainFraction = weapon =>
  weapon?.drain ?? (weapon?.name === "Nosferatu" ? 1 : 0);

export const halvesHp = weapon =>
  weapon?.halvesHp === true || weapon?.name === "Eclipse";

export const cannotBeCountered = weapon =>
  weapon?.noCounter === true || weapon?.name === "Eclipse";

// Eclipse damage. floor, so 1 HP -> 0, 3 -> 1, 5 -> 2.
export const halfHp = unit => Math.floor((unit?.hp ?? 0) / 2);

// --------------------------------------------------
// WEAPON EFFECTIVENESS
// --------------------------------------------------

const CAVALRY_CLASSES = new Set(["Cavalier", "Paladin", "GreatKnight", "Troubadour", "MageKnight", "Ranger"]);
const ARMORED_CLASSES = new Set(["Knight", "General", "GreatKnight"]);
const FLYING_CLASSES = new Set(["PegasusKnight", "Falcoknight", "WyvernRider", "WyvernLord", "WyvernKnight"]);
const DRAGON_CLASSES = new Set(["Manakete", "WyvernRider", "WyvernLord", "WyvernKnight", "DracoZombie"]);
const MONSTER_CLASSES = new Set([
  "Bonewalker", "Wight", "Bael", "ElderBael", "MautheDoog", "Gwyllgi",
  "Tarvos", "Maelduin", "Mogall", "ArchMogall", "Gargoyle", "Deathgoyle",
  "Gorgon", "GorgonEgg", "Cyclops", "DracoZombie", "DemonKing", "Entombed", 
  "Revenant", "Initiate", "Medium", "Necromancer"
]);

export function isMonster(unit) {
  const cName = unit?.className ?? unit?.constructor?.name ?? unit?.name;

  return MONSTER_CLASSES.has(cName);
}

export function isEffective(weapon, defender) {
  if (!weapon || !defender) return false;
  const cName = defender.className ?? defender.constructor?.name ?? defender.name;

  const effectiveAgainst = Array.isArray(weapon.effectiveAgainst) ? weapon.effectiveAgainst : [];
  if (effectiveAgainst.includes(cName)) return true;

  for (const cat of effectiveAgainst) {
    const c = String(cat).toLowerCase();
    if ((c === "cavalry" || c === "horseback" || c === "horse") && CAVALRY_CLASSES.has(cName)) return true;
    if ((c === "armored" || c === "armoured" || c === "armor") && ARMORED_CLASSES.has(cName)) return true;
    if ((c === "flying" || c === "flier") && FLYING_CLASSES.has(cName)) return true;
    if (c === "dragon" && DRAGON_CLASSES.has(cName)) return true;
    if (c === "monster" && MONSTER_CLASSES.has(cName)) return true;
  }

  const effectDesc = String(weapon.effect ?? "").toLowerCase();
  if (effectDesc.includes("horseback") && CAVALRY_CLASSES.has(cName)) return true;
  if ((effectDesc.includes("armoured") || effectDesc.includes("armored")) && ARMORED_CLASSES.has(cName)) return true;
  if (effectDesc.includes("flying") && FLYING_CLASSES.has(cName)) return true;
  if (effectDesc.includes("dragon") && DRAGON_CLASSES.has(cName)) return true;
  if (effectDesc.includes("monster") && MONSTER_CLASSES.has(cName)) return true;

  return false;
}

// FE8: a unit with S rank in the weapon's type gets +5 Hit and +5 Crit.
export const S_RANK_BONUS = 5;

export function getSRankBonus(unit, weapon) {
  const type = weapon?.type?.toLowerCase();

  if (!type) return 0;

  const rank = unit?.weaponRanks?.[type] ?? unit?.[type];

  return rank === "S" ? S_RANK_BONUS : 0;
}

// --------------------------------------------------
// COMBAT CALCULATION
// --------------------------------------------------

export function calculateCombat(
  attacker,
  defender,
  weapon,
  defenderTerrain = null,
  defenderWeaponOverride = defender?.equippedWeapon,
  isIndirect = false
) {
  if (!attacker || !defender || !weapon) {
    throw new Error("Invalid combat participants or weapon.");
  }

  // Determine physical or magical damage (including Magic Swords).
  const isMagicSword = weapon.name === "Runesword" ||
    (isIndirect && (weapon.name === "Light Brand" || weapon.name === "Wind Sword"));
  const isMagical = MAGICAL_WEAPONS.has(weapon.type) || Boolean(isMagicSword);

  const attackStat = isMagical
    ? (attacker.mag ?? attacker.str ?? 0)
    : (attacker.str ?? 0);

      const defenseStat = ignoresResistance(weapon)
    ? 0
    : isMagical
      ? (defender.res ?? 0) + (defender.tempRes ?? 0)
      : (defender.def ?? 0);

  // Weapon triangle.
  const triangle = getWeaponTriangle(weapon, defenderWeaponOverride);

   // Weapon effectiveness. Slayer works like an effective weapon against
  // monsters: might x3. It does not stack with a weapon's own effectiveness.
  const slayer = hasAbility(attacker, "slayer") && isMonster(defender);
  const effective = isEffective(weapon, defender) || slayer;
  const effectivenessMultiplier = effective ? 3 : 1;

    // Fliers hover above the ground, so terrain gives them no bonuses.
  const grounded = defender.terrFactor !== "flier";

  // Terrain bonuses.
  const terrainDefense = grounded ? (defenderTerrain?.def ?? 0) : 0;
  const terrainAvoid = grounded ? (defenderTerrain?.avd ?? 0) : 0;

  // Damage calculation.
  const weaponMight = (weapon.might ?? 0) * effectivenessMultiplier;

  const attack =
    attackStat +
    weaponMight +
    triangle.damage;

  const defense = defenseStat + terrainDefense;

      const halves = halvesHp(weapon);

  const damage = halves
    ? halfHp(defender)
    : weapon.noDamage ? 0 : Math.max(0, attack - defense);

  // Attack speed.
  const attackerAS = calculateAttackSpeed(attacker, weapon);

  const defenderAS = calculateAttackSpeed(defender, defenderWeaponOverride);

  // Avoid.
  const avoid =
    defenderAS * 2 +
    (defender.lck ?? 0) +
    terrainAvoid;

  // Hit rate.
  const hit = Math.min(
    100,
    Math.max(
      0,
      (weapon.hit ?? 0) +
      (attacker.skl ?? 0) * 2 +
      Math.floor((attacker.lck ?? 0) / 2) +
      triangle.hit +
      getSRankBonus(attacker, weapon) -
      avoid
    )
  );

    // Critical rate.
    const crit = Math.min(
    100,
    Math.max(
      0,
      (weapon.crit ?? 0) +
      Math.floor((attacker.skl ?? 0) / 2) +
      getClassCritBonus(attacker) +
      getSRankBonus(attacker, weapon) -
      (defender.lck ?? 0) +
      (hasStatus(defender, "stone") ? STONE_CRIT_BONUS : 0)
    )
  );

  return {
    damage,
    hit,
    crit: halves ? 0 : crit,

    attack: halves ? damage : attack,
    defense: halves ? 0 : defense,
    avoid,

    attackerAS,
    defenderAS,

    isMagical,
    effective,
    effectivenessMultiplier,

    triangle
  };
}
