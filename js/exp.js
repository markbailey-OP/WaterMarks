
/*
 * EXP SYSTEM
 *
 * Handles class EXP calculations and weapon EXP.
 * Combat previews must never call these functions.
 */

// Class power determines how quickly a class earns EXP.
const CLASS_POWER = {
  Journeyman: 1,
  Recruit: 1,
  Pupil: 1,
  Trainee: 1,
  Civilian: 1,
  Pontifex: 1,
  Entombed: 1,

  Cleric: 2,
  Soldier: 2,
  Troubadour: 2,
  Manakete: 2,
  Thief: 2,
  Priest: 2,
  Dancer: 2,

  DemonKing: 5
};

// Promoted classes receive a class bonus.
const PROMOTED_CLASSES = new Set([
  "GreatLord", "Paladin", "GreatKnight",
  "General", "Hero", "Swordmaster",
  "Assassin", "Rogue", "Sniper",
  "Ranger", "WyvernLord", "WyvernKnight",
  "Sage", "MageKnight", "Bishop",
  "Druid", "Summoner", "Warrior",
  "Berserker", "Falcoknight", "Valkyrie",
  "Necromancer",
  "Entombed", "Wight", "ElderBael", "Gwyllgi",
  "Maelduin", "ArchMogall", "Deathgoyle",
  "Cyclops", "Gorgon"
]);

const PROMOTED_BONUS_40 = new Set([
  "Assassin",
  "Rogue",
  "Bishop",
  "Valkyrie"
]);

const TRAINEE_CLASSES = new Set([
  "Recruit",
  "Pupil",
  "Journeyman",
  "Trainee"
]);

export const WEAPON_RANK_THRESHOLDS = {
  E: 1,
  D: 31,
  C: 71,
  B: 121,
  A: 181,
  S: 251
};

const WEAPON_RANK_ORDER = ["E", "D", "C", "B", "A", "S"];
const EXP_MULTIPLIER = 3;
const WEAPON_EXP_MULTIPLIER = 3.5;

function getClassName(unit) {
  return unit.className ?? unit.constructor.name;
}

function getClassPower(unit) {
  const className = getClassName(unit);
  return CLASS_POWER[className] ?? 3;
}

export function isPromoted(unit) {
  return PROMOTED_CLASSES.has(getClassName(unit));
}

// 0 = trainee, 1 = middle tier, 2 = promoted.
export function getClassTier(className) {
  if (PROMOTED_CLASSES.has(className)) return 2;
  if (TRAINEE_CLASSES.has(className)) return 0;
  return 1;
}

// Added to a class's recorded level when a CPU fort picks what to spawn.
export const TIER_LEVEL_BONUS = [0, 3, 11];

function getClassBonusA(unit) {
  return isPromoted(unit) ? 20 : 0;
}

function getClassBonusB(unit) {
  if (!isPromoted(unit)) return 0;

  return PROMOTED_BONUS_40.has(getClassName(unit))
    ? 40
    : 60;
}

/*
 * Calculates EXP earned from one combat.
 *
 * attackerDamage:
 *   Total actual damage dealt by the attacker.
 *
 * defenderDamage:
 *   Total actual damage dealt by the defender.
 *
 * attackerDefeated:
 *   Whether the attacker defeated the defender.
 *
 * defenderDefeated:
 *   Whether the defender defeated the attacker.
 *
 * canCounter:
 *   Whether the defender was able to counterattack.
 *
 * enemyIsBoss:
 *   Whether the defeated enemy was a boss.
 */


export function calculateClassExp({
  attacker,
  defender,
  attackerDamage = 0,
  defenderDamage = 0,
  attackerHit = false,
  defenderHit = false,
  attackerDefeated = false,
  defenderDefeated = false,
  canCounter = false,
  enemyIsBoss = false,
  attackerSilencer = false,
  defenderSilencer = false
}) {
  const attackerAlive = Boolean(attacker && attacker.hp > 0 && !defenderDefeated);
  const defenderAlive = Boolean(defender && defender.hp > 0 && !attackerDefeated);

  const attackerExp = attackerAlive
    ? calculateUnitExp({
        unit: attacker,
        enemy: defender,
        damage: attackerDamage,
        hit: attackerHit,
        defeated: attackerDefeated,
        enemyIsBoss,
        silencer: attackerSilencer
      })
    : 0;

  const defenderExp = defenderAlive
    ? calculateUnitExp({
        unit: defender,
        enemy: attacker,
        damage: defenderDamage,
        hit: defenderHit,
        defeated: defenderDefeated,
        enemyIsBoss: false,
        silencer: defenderSilencer
      })
    : 0;

  let finalDefenderExp = 0;
  if (defenderAlive) {
    finalDefenderExp = Math.max(1, canCounter ? defenderExp : 1);
  }

  return {
    attackerExp: attackerAlive ? attackerExp : 0,
    defenderExp: defenderAlive ? finalDefenderExp : 0
  };
}

function calculateUnitExp({
  unit,
  enemy,
  damage,
  hit = false,
  defeated,
  enemyIsBoss = false,
  silencer = false
}) {
  const enemyLevel = enemy.lvl ?? 1;
  const unitLevel = unit.lvl ?? 1;

  const enemyPower = getClassPower(enemy);
  const unitPower = getClassPower(unit);

  const enemyBonusA = getClassBonusA(enemy);
  const unitBonusA = getClassBonusA(unit);

  const enemyBonusB = getClassBonusB(enemy);
  const unitBonusB = getClassBonusB(unit);

  // Normal EXP for dealing damage.
  const damageExp = Math.max(1, Math.floor(
    (31 + (enemyLevel + enemyBonusA) -
      (unitLevel + unitBonusA)) / unitPower
  ));

  // A miss grants 1 EXP. A hit that deals no damage grants half.
  if (damage <= 0 && !defeated) {
    return hit ? Math.max(1, Math.floor(damageExp / 2)) : 1;
  }

  if (!defeated) return damageExp;

  const enemyDefeatValue = enemyLevel * enemyPower + enemyBonusB;
  const unitDefeatValue = unitLevel * unitPower + unitBonusB;

  const defeatBase = enemyDefeatValue - unitDefeatValue;
  const modeCoefficient = defeatBase <= 0 ? 2 : 1;

  let defeatExp = Math.ceil(
    enemyDefeatValue - (unitDefeatValue / modeCoefficient)
  );

  defeatExp += 20;

  if (enemyIsBoss) defeatExp += 40;

  if (["Thief", "Rogue", "Assassin"].includes(getClassName(enemy))) {
    defeatExp += 20;
  }

  defeatExp = Math.max(0, defeatExp);

  if (silencer) defeatExp = Math.floor(defeatExp * 1.8);

  return Math.max(1, damageExp + defeatExp);
}


/*
 * WEAPON EXP
 *
 * Awards weapon rank experience after an actual attack.
 * This function does not handle combat previews.
 */

const INDIRECT_MAGIC_SWORDS = new Set([
  "Light Brand",
  "Runesword",
  "Wind Sword"
]);

function getWeaponName(weapon) {
  return weapon.name ?? weapon.constructor.name;
}

export function awardWeaponExp(
  unit,
  weapon,
  {
    critical = false,
    fatal = false,
    weaponBroke = false,
    indirect = false
  } = {}
) {
  if (!unit || unit.hp <= 0 || unit.noExp || !weapon || weaponBroke) return 0;

  // These magic swords do not grant WExp
  // when used for their ranged magic attack.
  if (
    indirect &&
    ["Light Brand", "Runesword", "Wind Sword"].includes(weapon.name)
  ) {
    return 0;
  }

  const weaponType = weapon.type?.toLowerCase();
  const baseExp = weapon.wExp ?? 0;

  if (!weaponType || baseExp <= 0) return 0;

  // A locked weapon type earns nothing until a class unlocks it again.
  if (!unit.weaponRanks?.[weaponType]) return 0;

  const wanted =
    (critical || fatal ? baseExp * 2 : baseExp) * WEAPON_EXP_MULTIPLIER;

  const maxRank = getWeaponRankCap(unit);

  // Below S, EXP stops at the cap rank's threshold, so nothing builds up
  // toward the next rank before a promotion allows it.
  const ceiling =
    maxRank === "S" ? Infinity : WEAPON_RANK_THRESHOLDS[maxRank];

  unit.weaponExp ??= {};

  const before = unit.weaponExp[weaponType] ?? 0;
  const after = before >= ceiling
    ? before
    : Math.min(before + wanted, ceiling);

  const gainedExp = after - before;

  if (gainedExp <= 0) return 0;

  unit.weaponExp[weaponType] = after;

  const newRank = getWeaponRank(after, maxRank);
  const oldRank = unit.weaponRanks[weaponType];
  const oldIndex = WEAPON_RANK_ORDER.indexOf(oldRank);
  const newIndex = WEAPON_RANK_ORDER.indexOf(newRank);

  if (newRank && newIndex > oldIndex) {
    unit.weaponRanks[weaponType] = newRank;
    unit[weaponType] = newRank;
  }

  return gainedExp;
}


export function getWeaponRankCap(unit) {
  const className = getClassName(unit);

  // Trainees are limited to C.
  if (TRAINEE_CLASSES.has(className)) {
    return "C";
  }

  // Promoted classes can reach S.
  if (isPromoted(unit)) {
    return "S";
  }

  // Other unpromoted classes are limited to A.
  return "A";
}

export function getWeaponRank(totalExp, maxRank = "S") {
  const maxIndex = WEAPON_RANK_ORDER.indexOf(maxRank);

  if (maxIndex === -1) return "E";

  let rank = null;

  for (let i = 0; i <= maxIndex; i++) {
    const currentRank = WEAPON_RANK_ORDER[i];

    if (totalExp >= WEAPON_RANK_THRESHOLDS[currentRank]) {
      rank = currentRank;
    }
  }

  return rank;
}
// Raises each weapon rank the unit's class can use to whatever its
// logged weapon EXP has earned. Never lowers a rank.
export function raiseRanksFromExp(unit) {
  const cap = getWeaponRankCap(unit);

  for (const type of Object.keys(unit.weaponRanks ?? {})) {
    const earned = getWeaponRank(unit.weaponExp?.[type] ?? 0, cap);
    const current = unit.weaponRanks[type];

    if (
      earned &&
      WEAPON_RANK_ORDER.indexOf(earned) > WEAPON_RANK_ORDER.indexOf(current)
    ) {
      unit.weaponRanks[type] = earned;
      unit[type] = earned;
    }
  }
}

// Applies a fort's { sword: exp, ... } record: keeps the larger value
// per weapon type, then raises ranks to match.
export function applyWeaponExpRecord(unit, record) {
  if (!record) return;

  unit.weaponExp ??= {};

  for (const [type, exp] of Object.entries(record)) {
    if (exp > (unit.weaponExp[type] ?? 0)) unit.weaponExp[type] = exp;
  }

  raiseRanksFromExp(unit);
}


const MAX_LEVEL = 20;
const TRAINEE_MAX_LEVEL = 10;

function isTrainee(unit) {
  return TRAINEE_CLASSES.has(unit.className);
}

export function levelUp(unit) {
  const gainedStats = {};

  for (const [stat, growthRate] of Object.entries(unit.growthRates ?? {})) {
    if (!Number.isFinite(growthRate) || growthRate <= 0) continue;

    const currentStat = stat === "hp"
      ? unit.maxHp
      : unit[stat];

    const statCap = unit.maxStats?.[stat];

    if (typeof currentStat !== "number") continue;
    if (typeof statCap === "number" && currentStat >= statCap) continue;

    let increase = Math.floor(growthRate / 100);
    const remainingChance = growthRate % 100;

    if (Math.random() * 100 < remainingChance) {
      increase++;
    }

    if (typeof statCap === "number") {
      increase = Math.min(increase, statCap - currentStat);
    }

    if (increase <= 0) continue;

        if (stat === "hp") {
      unit.maxHp += increase;   // current HP is left alone
    } else {
      unit[stat] += increase;
    }

    gainedStats[stat] = increase;
  }

  unit.lvl++;

  return gainedStats;
}

// Raises a freshly created unit to `targetLevel`, running one
// level-up roll per level gained (level 2 = 1 roll, level 8 = 7 rolls).
// Returns the stat gains from each roll. EXP is left at 0.
export function raiseToLevel(unit, targetLevel) {
  const maxLevel = isTrainee(unit) ? TRAINEE_MAX_LEVEL : MAX_LEVEL;
  const target = Math.min(Math.floor(targetLevel), maxLevel);

  const gains = [];

    while (unit.lvl < target) {
    gains.push(levelUp(unit));
  }

  unit.exp = 0;
  unit.hp = unit.maxHp;   // a freshly built unit starts at full HP

  return gains;
}

export function awardClassExp(unit, amount) {
  const none = {
    expGained: 0,
    levelsGained: 0,
    statGains: [],
    promotionNeeded: false
  };

    if (!unit || unit.hp <= 0 || unit.noExp || !amount || amount <= 0) return none;

  const trainee = isTrainee(unit);
  const maxLevel = trainee ? TRAINEE_MAX_LEVEL : MAX_LEVEL;

  // At the cap: no EXP is gained and none is kept.
  if (unit.lvl >= maxLevel) {
    unit.exp = 0;
    return { ...none, promotionNeeded: trainee };
  }

  const expGained = Math.max(0, Math.floor(amount * EXP_MULTIPLIER));

  unit.exp = (unit.exp ?? 0) + expGained;

  let levelsGained = 0;
  const statGains = [];

  while (unit.exp >= 100 && unit.lvl < maxLevel) {
    unit.exp -= 100;
    statGains.push(levelUp(unit));
    levelsGained++;
  }

  // Reaching the cap throws away any leftover EXP.
  if (unit.lvl >= maxLevel) unit.exp = 0;

  return {
    expGained,
    levelsGained,
    statGains,
    promotionNeeded: trainee && unit.lvl >= maxLevel
  };
}