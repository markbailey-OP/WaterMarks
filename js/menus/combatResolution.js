import {
  gameGrid,
  setAttackTargets,
  setSelectedAttackTarget,
  getUnitPosition,
  addGold
} from "../gameState.js";
import {
  awardWeaponExp,
  calculateClassExp,
  awardClassExp
} from "../exp.js";
import { 
  canUseWeapon, 
  isBrave,
  halvesHp,
  drainFraction
} from "../combat.js";
import {
  equipItem,
  consumeWeaponUse,
  equipNextAvailableWeapon,
  plunderItems
} from "../inventory.js";
import { sleep } from "../utils.js";
import { 
  recordUnitLevel, 
  recordWeaponExp } 
from "../strongholds.js";
import { 
  setBattleAnimation, 
  setMapDirty, 
  setAlert } from "../gameArea.js";
import {
  rollSureStrike,
  rollSilencer,
  rollGreatShield,
  rollPierce
} from "../abilities.js";
import {
  BATTLE_TIMING,
  rollAttack,
  animateStrike,
  createBattleStatus,
  clearBattleStatus,
  animateHpChange,
  animateTerrainStrike,
  animateTerrainHpChange,
  showTerrainStatus,
  clearTerrainStatus,
  orderTeams
} from "./combatAnimation.js";
import {
  getActiveAttack,
  clearActiveAttack
} from "./attackState.js";
import {
  pushInputContext,
  popInputContext,
  NO_INPUT
} from "../input.js";
import {
  isImmobile,
  applyStatus,
  getInflictedStatus,
  statusAlert
} from "../status.js";
import { animMs } from "../settings.js";
import { rollPromotionShop } from "../cpu.js";
import { animateExpAward } from "./levelUpMenu.js";
import { destroyTerrain } from "../terrainDestruction.js";


// Weapons live in inventory, except a crewed ballista, which is on the tile.
const holdsWeapon = (unit, weapon) =>
  Boolean(weapon) && (
    unit.inventory?.includes(weapon) ||
    (unit.inBallista && unit.equippedWeapon === weapon)
  );
  
// ==========================================
// HTML HELPERS
// ==========================================

function hideAttackInterface() {
  document.querySelectorAll(".combat-preview").forEach(
    element => element.remove()
  );

  document.getElementById("attackMenu").style.display = "none";
}

// ==========================================
// COMBAT RESOLUTION
// ==========================================

async function resolveUnitStrike(
  attacker,
  defender,
  weapon,
  result,
  teamOne,
  teamTwo,
  indirect = false
) {
  // Eclipse halves the defender's CURRENT HP, so every strike recalculates
  // (a doubling attacker halves twice). It never crits or pierces.
  if (halvesHp(weapon)) {
    const half = Math.floor(defender.hp / 2);

    result = { ...result, damage: half, attack: half, crit: 0 };
  }
  
  // Sure Strike: an automatic hit. Skipped when the hit chance is already 100.
  const sure = result.hit < 100 && rollSureStrike(attacker);
  const outcome = rollAttack(result, sure);

  // Misses still show their result, but do not decrease HP.
  if (!outcome.hit) {
    await animateStrike(
      attacker,
      defender,
      outcome.text
    );

    awardWeaponExp(attacker, weapon, {
      indirect
    });

    return {
      hit: false,
      critical: false,
      damage: 0,
      defeated: false,
      weaponBroke: false
    };
  }

  // The strike lands. Decide the skills, in order.
  const critMultiplier = outcome.critical ? 3 : 1;

  // Silencer: a critical hit may kill outright.
  const silencer = outcome.critical && rollSilencer(attacker);

  // Great Shield: never rolls if Sure Strike or Silencer triggered.
    const shield = !sure && !silencer && rollGreatShield(defender, attacker); 

  // Pierce: only matters if defense reduces the damage, and never
  // triggers if the defender's Great Shield did.
  const pierce =
    !shield &&
    result.attack > result.damage &&
    rollPierce(attacker);

  let damage;
  let text;

  if (shield) {
    damage = 0;
    text = "0";
  } else if (silencer) {
    damage = defender.hp;
    text = `${Math.min(damage, 999)} CRIT!`;
  } else if (pierce) {
    damage = Math.max(0, result.attack) * critMultiplier;
    text = outcome.critical
      ? `${Math.min(damage, 999)} CRIT!`
      : String(Math.min(damage, 999));
  } else {
    damage = outcome.damage;
    text = outcome.text;
  }

  // One banner pass before the lunge.
  const alerts = [];
  const attackerBanners = [];

  if (sure) attackerBanners.push("SURE SHOT");
  if (silencer) attackerBanners.push("SILENCER");
  if (pierce) attackerBanners.push("PIERCE");

  for (const banner of attackerBanners) {
    alerts.push({ text: banner, unit: attacker });
  }

  if (shield) {
    alerts.push({ text: "GREAT SHIELD", unit: defender, color: "#7fd4ff" });
  }

  if (alerts.length > 0) {
    setAlert(alerts);
    await sleep(animMs(600));
  }

  // Calculate actual damage before the animation.
  const actualDamage = Math.min(defender.hp, damage);

  // Consume durability only after a successful hit.
  const weaponBroke = consumeWeaponUse(attacker, weapon);

  // HP starts decreasing at the exact moment the damage
  // number appears, and the banners disappear with it.
  await animateStrike(
    attacker,
    defender,
    text,
    () => {
      setAlert(null);

      return animateHpChange(
        defender,
        -actualDamage,
        teamOne,
        teamTwo
      );
    }
  );

  const defeated = defender.hp <= 0;
  
  // Nosferatu: the user recovers the damage dealt, never past max HP.
  const drain = Math.min(
    Math.floor(actualDamage * drainFraction(weapon)),
    attacker.maxHp - attacker.hp
  );

  if (drain > 0 && attacker.hp > 0) {
    await animateHpChange(attacker, drain, teamOne, teamTwo);
  }

  awardWeaponExp(attacker, weapon, {
    critical: outcome.critical,
    fatal: defeated,
    weaponBroke,
    indirect
  });
  
    // Poison weapons, Stone and the like land on a hit that wasn't blocked.
  const inflicted = getInflictedStatus(weapon);

  if (inflicted && !shield && !defeated && applyStatus(defender, inflicted)) {
    setAlert([{ ...statusAlert(inflicted), unit: defender }]);
    await sleep(animMs(500));
    setAlert(null);
  }

  return {
    hit: true,
    critical: outcome.critical,
    damage: actualDamage,
    defeated,
    weaponBroke
  };
}

// ==========================================
// FULL COMBAT SEQUENCE
// ==========================================

// One strike, or two in a row with a brave weapon. Stops early if either
// unit falls or the weapon breaks. Returns the combined result.
async function resolveStrikes(
  attacker, defender, weapon, result, teamOne, teamTwo, indirect
) {
  const total = {
    hit: false, critical: false, damage: 0, defeated: false, weaponBroke: false
  };

  const count = isBrave(weapon) ? 2 : 1;

  for (let i = 0; i < count; i++) {
    if (attacker.hp <= 0 || defender.hp <= 0) break;
    if (!holdsWeapon(attacker, weapon)) break;
    if (!canUseWeapon(attacker, weapon).usable) break;

    const strike = await resolveUnitStrike(
      attacker, defender, weapon, result, teamOne, teamTwo, indirect
    );

    total.hit ||= strike.hit;
    total.critical ||= strike.critical;
    total.damage += strike.damage ?? 0;
    total.defeated ||= strike.defeated;
    total.weaponBroke ||= strike.weaponBroke;
  }

  return total;
}

async function resolveCombat(attack, attacker, defender, preview) {
  const target = attack.target;

  const attackerWeapon = preview.weapon;
  const defenderWeapon = preview.defenderWeapon;

  // Ballista stays equipped from the tile; only equip inventory weapons.
  if (attacker.inventory?.includes(attackerWeapon)) {
    equipItem(attacker, attacker.inventory.indexOf(attackerWeapon));
  } else if (attacker.inBallista && attackerWeapon) {
    attacker.equippedWeapon = attackerWeapon;
  }

  const [teamOne, teamTwo] = orderTeams(attacker, defender);

  // Track total combat results for class EXP.
  let attackerDamage = 0;
  let defenderDamage = 0;
  let attackerDefeated = false;
  let defenderDefeated = false;
  let defenderCountered = false;
  let attackerHit = false;
  let defenderHit = false;

  // Determine whether this attack is being made at range.
  const attackDistance =
    Math.abs(attack.destinationX - target.x) +
    Math.abs(attack.destinationY - target.y);

  const indirectAttack = attackDistance > 1;

  createBattleStatus(attacker, defender);

  await sleep(BATTLE_TIMING.beforeFirstStrike);

  // First attacker strike.
  const firstStrike = await resolveStrikes(
    attacker,
    defender,
    attackerWeapon,
    preview.result,
    teamOne,
    teamTwo,
    indirectAttack
  );

  attackerDamage += firstStrike.damage ?? 0;
  attackerDefeated ||= firstStrike.defeated;
  attackerHit ||= firstStrike.hit;

  // Defender counterattacks if alive and able to counter.
  if (
    defender.hp > 0 &&
    !isImmobile(defender) &&
    preview.canCounter &&
    defenderWeapon &&
    defender.inventory.includes(defenderWeapon) &&
    canUseWeapon(defender, defenderWeapon).usable
  ) {
    defenderCountered = true;

    const counterStrike = await resolveStrikes(
      defender,
      attacker,
      defenderWeapon,
      preview.counterResult,
      teamOne,
      teamTwo,
      indirectAttack
    );

    defenderDamage += counterStrike.damage ?? 0;
    defenderDefeated ||= counterStrike.defeated;
    defenderHit ||= counterStrike.hit;
  }

  // Attacker follow-up requires an attack-speed advantage of 4.
   const attackerHoldsWeapon = holdsWeapon(attacker, attackerWeapon);

  const attackerCanFollowUp =
    attacker.hp > 0 &&
    !isImmobile(attacker) &&
    defender.hp > 0 &&
    attackerHoldsWeapon &&
    canUseWeapon(attacker, attackerWeapon).usable &&
    preview.result.attackerAS >= preview.result.defenderAS + 4;

  if (attackerCanFollowUp) {
    const followUpStrike = await resolveStrikes(
      attacker,
      defender,
      attackerWeapon,
      preview.result,
      teamOne,
      teamTwo,
      indirectAttack
    );

    attackerDamage += followUpStrike.damage ?? 0;
    attackerDefeated ||= followUpStrike.defeated;
    attackerHit ||= followUpStrike.hit;
  }

  // Defender follow-up (if defender has 4+ AS advantage over attacker and can counter)
    const defenderCanFollowUp =
    defender.hp > 0 &&
    !isImmobile(defender) &&
    attacker.hp > 0 &&
    defenderCountered &&
    preview.canCounter &&
    defenderWeapon &&
    defender.inventory.includes(defenderWeapon) &&
    canUseWeapon(defender, defenderWeapon).usable &&
    preview.counterResult.attackerAS >= preview.counterResult.defenderAS + 4;

  if (defenderCanFollowUp) {
    const defenderFollowUp = await resolveStrikes(
      defender,
      attacker,
      defenderWeapon,
      preview.counterResult,
      teamOne,
      teamTwo,
      indirectAttack
    );

    defenderDamage += defenderFollowUp.damage ?? 0;
    defenderDefeated ||= defenderFollowUp.defeated;
    defenderHit ||= defenderFollowUp.hit;
  }

  // Calculate class EXP once after the entire combat.
  const expResults = calculateClassExp({
  attacker, defender,
  attackerDamage, defenderDamage,
  attackerHit, defenderHit,
  attackerDefeated, defenderDefeated,
  canCounter: defenderCountered,
  enemyIsBoss: defender.isBoss === true
});

  // Save the starting EXP before awarding anything.
  const attackerStartingExp = attacker.exp ?? 0;
  const defenderStartingExp = defender.exp ?? 0;

  // Award class EXP to both units.
  const attackerLevelResult = awardClassExp(
    attacker,
    expResults.attackerExp
  );

  const defenderLevelResult = awardClassExp(
    defender,
    expResults.defenderExp
  );

  // Defeating enemy units awards gold, equal to 10x exp gained
  if (attackerDefeated && attacker?.team) {
  addGold(attacker.team, (expResults.attackerExp ?? 0) * 10);
}
if (defenderDefeated && defender?.team) {
  addGold(defender.team, (expResults.defenderExp ?? 0) * 10);
}

  recordUnitLevel(attacker);
  recordUnitLevel(defender);
  if (attackerLevelResult.levelsGained > 0) recordWeaponExp(attacker);
  if (defenderLevelResult.levelsGained > 0) recordWeaponExp(defender);
  if (attackerLevelResult.levelsGained > 0) rollPromotionShop(attacker);
  if (defenderLevelResult.levelsGained > 0) rollPromotionShop(defender);

  console.log("Combat EXP:", {
    attacker: {
      gained: expResults.attackerExp,
      levelUp: attackerLevelResult
    },
    defender: {
      gained: expResults.defenderExp,
      levelUp: defenderLevelResult
    }
  });
  
    // The killer takes any plunder items from the unit it defeated.
  if (attackerDefeated) plunderItems(defender, attacker);
  if (defenderDefeated) plunderItems(attacker, defender);

  // Equip replacement weapons only after all combat is finished.
  equipNextAvailableWeapon(attacker);
  equipNextAvailableWeapon(defender);

  // Make sure the canvas EXP animation is visible.
  hideAttackInterface();

  // Play EXP animations one unit at a time for surviving units.
  if (attacker.hp > 0 && (expResults.attackerExp ?? 0) > 0) {
    await animateExpAward(
      attacker,
      attackerLevelResult,
      attackerStartingExp
    );
  }

  if (defender.hp > 0 && (expResults.defenderExp ?? 0) > 0) {
    await animateExpAward(
      defender,
      defenderLevelResult,
      defenderStartingExp
    );
  }
}

// ==========================================
// TERRAIN ATTACK
// ==========================================

async function resolveTerrainAttack(attack, attacker, weapon) {
  const target = attack.target;
  const tile = target.tile ?? gameGrid[target.y]?.[target.x];

  if (!tile) return;

  tile.maxHp ??= 30;
  tile.hp ??= tile.maxHp;

  if (attacker.inventory?.includes(weapon)) {
    equipItem(attacker, attacker.inventory.indexOf(weapon));
  } else if (attacker.inBallista && weapon) {
    attacker.equippedWeapon = weapon;
  }

  const distance =
    Math.abs(attack.destinationX - target.x) +
    Math.abs(attack.destinationY - target.y);

  const indirect = distance > 1;

  const damage = Math.max(
    1,
    (attacker.str ?? attacker.mag ?? 10) + (weapon.might ?? 0)
  );

  const actualDamage = Math.min(tile.hp, damage);

  showTerrainStatus(attacker, tile);
  await sleep(BATTLE_TIMING.beforeFirstStrike);

  await animateTerrainStrike(
    attacker,
    { x: target.x, y: target.y },
    String(damage),
    () => animateTerrainHpChange(attacker, tile, -actualDamage)
  );

  const weaponBroke = consumeWeaponUse(attacker, weapon);

  awardWeaponExp(attacker, weapon, { weaponBroke, indirect });

  // Destroyed terrain transforms once its HP bar has emptied.
  if (tile.hp <= 0) {
    destroyTerrain(target.x, target.y);
    setMapDirty(true);

        await sleep(animMs(500));
  }

  equipNextAvailableWeapon(attacker);
}

// ==========================================
// CLEANUP (ALWAYS RUNS AFTER COMBAT)
// ==========================================

function finishAttack(attacker) {
  // Mark the attacker as moved only if still on the map.
  if (getUnitPosition(attacker) !== null) {
    attacker.hasMoved = true;
  }

  setBattleAnimation(null);
  setAlert(null);
  clearBattleStatus();
  clearTerrainStatus();

  clearActiveAttack();

  setAttackTargets([]);
  setSelectedAttackTarget(null);

  hideAttackInterface();
}

// ==========================================
// PERFORM ATTACK
// ==========================================

export async function performAttack(weapon) {
  const attack = getActiveAttack();

  if (!attack || attack.resolving) return;

  const attacker = attack.unit;
  const target = attack.target;

  if (!target) return;

  // Terrain attacks deal damage to WeakWalls and Snags.
    if (target.type === "terrain") {
    if (!holdsWeapon(attacker, weapon)) return;

    attack.resolving = true;

    const inputLock = pushInputContext(NO_INPUT);

    hideAttackInterface();

    try {
      await resolveTerrainAttack(attack, attacker, weapon);
    } catch (error) {
      console.error("Terrain attack failed:", error);
    } finally {
      popInputContext(inputLock);
      finishAttack(attacker);
    }

    return;
  }

  const defender = target.unit;
  const preview = attack.preview;

  if (!preview || !defender || defender.hp <= 0) return;

  // The weapon must still be in the attacker's inventory.
  if (!holdsWeapon(attacker, preview.weapon)) return;

  attack.resolving = true;

  // Freeze all controller input until combat is completely done.
  const inputLock = pushInputContext(NO_INPUT);

  hideAttackInterface();

  try {
    await resolveCombat(attack, attacker, defender, preview);
  } catch (error) {
    console.error("Combat failed:", error);
  } finally {
    popInputContext(inputLock);
    finishAttack(attacker);
  }
}
