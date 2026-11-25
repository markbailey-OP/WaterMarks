import * as Items from "./items/index.js";
import {
  gameGrid,
  gameCursor,
  getUnitPosition,
  getGold,
  setGold,
  TEAM_COUNT
} from "./gameState.js";
import {
  findAttackTargets,
  isHealingStaff,
  getHealTargets,
  getHealAmount,
  getAttackTiles,
  getItemRange
} from "./menus/targeting.js";
import {
  canUseHealingItem,
  canUseCureItem,
  useItemEffect,
  useHealingItem,
  isBraceItem,
  BRACE_UNITS
} from "./menus/itemResolution.js";
import { 
  setActiveAttack, 
  clearActiveAttack } 
from "./menus/attackState.js";
import {
  getCapturableTile,
  captureTile,
  promoteUnit,
  isLord,
  getAvailableUnits,
  getUnitWeight,
  addPromotedClassToFort,
  addPurchasedClassToFort,
  unlockUnit,
  getDestroyableCave,
  destroyCave
} from "./strongholds.js";
import { 
  getPurchasableUnits, 
  getUnitPrice, 
  canPlaceUnit } 
from "./menus/shopMenu.js";
import { 
  getPromotionOptions, 
  getPromotionItem, 
  getPromotionItemName,
  PROMOTION_LEVEL
} from "./promotion.js";
import {
  getReachableTiles,
  getDistanceMap,
  findPath,
  getEnterCost
} from "./pathfinding.js";
import { 
  addItem, 
  consumeWeaponUse, 
  MAX_INVENTORY } 
from "./inventory.js";
import { 
  isPromoted, 
  getClassTier, 
  MAX_LEVEL
} from "./exp.js";
import { 
  canUseWeapon, 
  isWeapon,
  isMonster,
  halvesHp,
  drainFraction
} from "./combat.js";
import { 
  hasAbility, 
  getStealTargets, 
  isStealable } 
from "./abilities.js";
import { 
  isImmobile, 
  hasStatus, 
  getInflictedStatus } 
from "./status.js";
import { pushInputContext, popInputContext, NO_INPUT } from "./input.js";
import { sleep as rawSleep } from "./utils.js";
import { stepMs, setCpuActing } from "./settings.js";
import { startMoveAnimation, waitForMoves } from "./sprites.js";
import { buildCombatPreview } from "./menus/combatPreview.js";
import { performAttack } from "./menus/combatResolution.js";
import { useHealingStaff } from "./menus/staffResolution.js";
import { resolveSteal } from "./menus/stealResolution.js";
import { isGameOver } from "./victory.js";

// Every pause in this file follows the CPU step speed.
const sleep = async ms => {
  await rawSleep(stepMs(ms));
  await waitForMoves();
};

// Default mode for every unit on a CPU side. A unit's own `ai` overrides it.
// Remove a side from this table to control it by hand.
export const CPU_SIDES = { 2: "attack", 3: "attack" };

// Attack units head for neutral forts and enemy thrones. Turn this on to
// have them also go for forts owned by other teams.
const CAPTURE_ENEMY_FORTS = false;

const STEP_PAUSE = 250;

// Drink a healing item at or below this share of max HP.
const USE_BELOW = 0.5;

// Shopping: one roll when an attack-mode unit first acts.
const SHOP_MIN_GOLD = 1000;   // needed to roll at all (Vulnerary)
const ELIXIR_GOLD = 4000;     // needed for the Elixir tier
const SHOP_CHANCE = 0.3;
// Buying a new unit type: one roll when an attack-mode unit first acts.
// 5% once gold reaches the unit's price, +5% for each further 100 gold.
const UNIT_BUY_MIN_CHANCE = 0.05;
const UNIT_BUY_PER_100 = 0.05;
// A unit waits this many turns for an occupied shop before giving up.
const MAX_SHOP_WAIT = 3;

// Promotion shopping: chance rises linearly from 5% at level 10 to 100% at 20.
const PROMO_MIN_LEVEL = PROMOTION_LEVEL;
const PROMO_MAX_LEVEL = MAX_LEVEL;
const PROMO_CHANCE_MIN = 0.05;
// Monsters roll ONCE, the first time they are level 10+ (at spawn if the
// fort spawns them that high). Pass = they promote on their next turn.
// Fail = they never promote.
const MONSTER_PROMO_CHANCE = 0.5;

// ------------------------------------------
// Fight evaluation
// ------------------------------------------
// Damage dealt and taken are turned into "percent of HP" so a fight
// is judged the same way for a 14 HP trainee and a 40 HP lord.
const KILL_BONUS = 50;         // added to gain for a certain kill
const STATUS_BONUS = { stone: 60, sleep: 40, poison: 15 };   // gain for a likely infliction
const DEATH_PENALTY = 60;      // added to loss for a certain death
const MIN_TRADE = 0.5;         // gain must be at least this x loss
const LORD_MIN_TRADE = 1.0;    // lords take only even-or-better fights
const RISK_WEIGHT = 0.5;       // loss counts this much against the score
const LORD_GUARD_RADIUS = 6;   // enemies this close to our lord are threats
const LORD_GUARD_BONUS = 1.5;
const ENEMY_LORD_BONUS = 1.2;
const SPAWN_TILE_PENALTY = 0.9; // fighting from a fort blocks spawns

// ------------------------------------------
// Lord escort
// ------------------------------------------
const LEASH = 5;              // escorts stay this close to the lord
const ESCORT_RADIUS = 5;      // units this close count as the lord's escort
const ESCORT_MIN = 2;         // escorts needed before the lord advances
const DESIRED_ESCORTS = 3;    // the first units become escorts
const ESCORT_SHARE = 0.3;     // chance a later unit becomes one
const LORD_HOLD_BELOW = 0.5;  // wounded lord waits for a healer

// ------------------------------------------
// Routes (bridges are waypoints)
// ------------------------------------------
const ROUTE_DETOUR = 3;       // a bridge may cost up to this x the direct path
const BRIDGE_MERGE = 2;       // bridges this close count as one crossing

const NO_DANGER = new Set();

export function isCpuSide(team) {
  return Object.hasOwn(CPU_SIDES, team);
}

// Sets who is human. Every other team becomes CPU.
export function setControllers(humanTeams) {
  for (const key of Object.keys(CPU_SIDES)) delete CPU_SIDES[key];

  for (let team = 1; team <= TEAM_COUNT; team++) {
    if (!humanTeams.includes(team)) CPU_SIDES[team] = "attack";
  }
}

export function getHumanTeams() {
  const teams = [];

  for (let team = 1; team <= TEAM_COUNT; team++) {
    if (!isCpuSide(team)) teams.push(team);
  }

  return teams;
}

function getAi(unit) {
  return unit.ai ?? CPU_SIDES[unit.team] ?? "defend";
}

const keyOf = (x, y) => `${x},${y}`;

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// ==========================================
// MAP HELPERS
// ==========================================

function forEachTile(callback) {
  for (let y = 0; y < gameGrid.length; y++) {
    for (let x = 0; x < gameGrid[y].length; x++) {
      callback(gameGrid[y][x], x, y);
    }
  }
}

function getTeamUnits(team) {
  const units = [];

  forEachTile(tile => {
    if (tile.unit && tile.unit.team === team) units.push(tile.unit);
  });

  return units;
}

function moveUnit(unit, from, to) {
  if (from.x === to.x && from.y === to.y) return;

  startMoveAnimation(unit, from, findPath(from.x, from.y, to.x, to.y, unit));

  gameGrid[from.y][from.x].unit = undefined;
  gameGrid[to.y][to.x].unit = unit;
}

// A tile where this unit would block its own team's reinforcements.
// A lord on his own throne is fine: the throne only respawns a dead lord.
function isSpawnTile(unit, x, y) {
  const tile = gameGrid[y]?.[x];

  if (!tile || tile.owner !== unit.team) return false;

return tile.name === "Fort" || tile.name === "Cave" ||
  (tile.name === "Throne" && !isLord(unit));
}

function getBridges() {
  const bridges = [];

  forEachTile((tile, x, y) => {
    if (tile.name !== "Bridge" && tile.name !== "SnagBridge") return;
    if (bridges.some(bridge => manhattan(bridge, { x, y }) <= BRIDGE_MERGE)) return;

    bridges.push({ x, y });
  });

  return bridges;
}

// ==========================================
// FIGHT EVALUATION
// ==========================================

// Chance that at least enough of `strikes` strikes of `damage` at `hit`
// (0..1) land to remove `hp`. Crits are ignored, so this is slightly pessimistic.
function chanceToKill(damage, strikes, hit, hp) {
  if (damage <= 0 || hit <= 0 || hp <= 0) return 0;

  const needed = Math.ceil(hp / damage);

  if (needed > strikes) return 0;

  const choose = (n, k) => {
    let r = 1;
    for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return r;
  };

  let chance = 0;

  for (let k = needed; k <= strikes; k++) {
    chance += choose(strikes, k) * hit ** k * (1 - hit) ** (strikes - k);
  }

  return chance;
}

// Expected result of one attack, from a combat preview.
// gain / loss are in percent of the target's / attacker's max HP.
function evaluateExchange(preview, attacker, defender) {
  const {
    result, counterResult, canCounter, attackerDoubles, defenderDoubles
  } = preview;

    const hit = result.hit / 100;
  const strikes = preview.attackerStrikes ?? (attackerDoubles ? 2 : 1);

    const halves = halvesHp(preview.weapon);

  const dealt =
    Math.min(defender.hp, result.damage * (halves ? 1 : strikes)) * hit;
  const killChance = halves
    ? 0
    : chanceToKill(result.damage, strikes, hit, defender.hp);
  const healed = dealt * drainFraction(preview.weapon);

  const inflicted = getInflictedStatus(preview.weapon);
  const statusGain =
    inflicted && !hasStatus(defender, inflicted)
      ? hit * (STATUS_BONUS[inflicted] ?? 0)
      : 0;

  let taken = 0;
  let dieChance = 0;

  if (canCounter && counterResult.damage > 0 && counterResult.hit > 0) {
        const counterHit = counterResult.hit / 100;
    const counterStrikes = preview.defenderStrikes ?? (defenderDoubles ? 2 : 1);

    // The counter only happens if the first strike(s) didn't kill.
    const survives =
      1 - chanceToKill(result.damage, preview.attackerHits ?? 1, hit, defender.hp);

    taken =
      Math.min(attacker.hp, counterResult.damage * counterStrikes) *
      counterHit * survives;

    dieChance =
      survives *
      chanceToKill(counterResult.damage, counterStrikes, counterHit, attacker.hp);
  }

  return {
    gain:
      dealt / Math.max(1, defender.maxHp) * 100 +
      healed / Math.max(1, attacker.maxHp) * 100 +
      killChance * KILL_BONUS + statusGain,
    loss:
      taken / Math.max(1, attacker.maxHp) * 100 + dieChance * DEATH_PENALTY,
    killChance,
    dieChance
  };
}

function isWorthwhile(outcome, minTrade) {
  if (outcome.gain <= 0) return false;

  // Can't finish it and might die: no chance of success.
  if (outcome.killChance < 0.05 && outcome.dieChance > 0.2) return false;

  return outcome.gain >= outcome.loss * minTrade;
}

function minTradeFor(unit) {
  return isLord(unit) ? LORD_MIN_TRADE : MIN_TRADE;
}

// ==========================================
// GUARDS AND DANGER ZONES
// ==========================================

// A real tile exactly `distance` from `pos`, so a duel can be previewed
// at that range. Null if the map has none.
function findTileAtDistance(pos, distance) {
  for (let dx = -distance; dx <= distance; dx++) {
    const dy = distance - Math.abs(dx);

    for (const sign of dy === 0 ? [1] : [1, -1]) {
      const x = pos.x + dx;
      const y = pos.y + dy * sign;

      if (gameGrid[y]?.[x]) return { x, y };
    }
  }

  return null;
}

function previewAgainst(unit, enemy, enemyPos, weapon, distance) {
  const origin = findTileAtDistance(enemyPos, distance);

  if (!origin) return null;

  return buildCombatPreview(
    {
      unit,
      target: { type: "unit", unit: enemy, x: enemyPos.x, y: enemyPos.y },
      destinationX: origin.x,
      destinationY: origin.y
    },
    weapon
  );
}

// True if no weapon this unit owns gives it a worthwhile fight with the
// enemy, at the nearest or farthest range that weapon reaches.
function isHopeless(unit, enemy, enemyPos) {
  const minTrade = minTradeFor(unit);

  for (const weapon of unit.inventory ?? []) {
    if (!isWeapon(weapon) || !canUseWeapon(unit, weapon).usable) continue;

    const range = getItemRange(weapon);

    if (!range) continue;

    for (const distance of new Set([range.min, range.max])) {
      const preview = previewAgainst(unit, enemy, enemyPos, weapon, distance);

      if (!preview) continue;
      if (
          (preview.result.damage <= 0 && !getInflictedStatus(weapon)) ||
          preview.result.hit <= 0
        ) continue;

      if (isWorthwhile(evaluateExchange(preview, unit, enemy), minTrade)) {
        return false;
      }
    }
  }

  return true;
}

// Tiles this unit must not end a move on: the tile and attack range of
// every stationary guard it cannot profitably fight. Guards never move,
// so their zone is fixed.
function getDangerTiles(unit) {
  const danger = new Set();

  forEachTile((tile, x, y) => {
    const enemy = tile.unit;

    if (!enemy || enemy.team === unit.team) return;
    if (!isCpuSide(enemy.team) || getAi(enemy) !== "defend") return;
    if (isImmobile(enemy)) return;
    if (!isHopeless(unit, enemy, { x, y })) return;

    danger.add(keyOf(x, y));

    for (const reach of getAttackTiles(enemy, [{ x, y }])) {
      danger.add(keyOf(reach.x, reach.y));
    }
  });

  return danger;
}

// ==========================================
// TARGET AND WEAPON CHOICE
// ==========================================

function threatensLord(lordPos, target) {
  return Boolean(lordPos) && manhattan(lordPos, target) <= LORD_GUARD_RADIUS;
}

// Best (tile, target, weapon) among the given origin tiles, or null.
// Only units are targeted. Walls and snags are ignored. A fight must pass
// isWorthwhile, and tiles inside a guard's danger zone are never used.
function findBestAttack(unit, origins, danger, lordPos) {
  const minTrade = minTradeFor(unit);
  let best = null;

  for (const origin of origins) {
    if (danger.has(keyOf(origin.x, origin.y))) continue;

    const onSpawn = isSpawnTile(unit, origin.x, origin.y);
    const targets = findAttackTargets(unit, origin.x, origin.y);

    for (const target of targets) {
      if (target.type !== "unit") continue;

      for (const weapon of target.weapons) {
        const preview = buildCombatPreview(
          { unit, target, destinationX: origin.x, destinationY: origin.y },
          weapon
        );

       if (
          (preview.result.damage <= 0 && !getInflictedStatus(weapon)) ||
          preview.result.hit <= 0
        ) continue;

        const outcome = evaluateExchange(preview, unit, target.unit);

        if (!isWorthwhile(outcome, minTrade)) continue;

        let score = outcome.gain - outcome.loss * RISK_WEIGHT;

        if (score <= 0) continue;

        if (threatensLord(lordPos, target)) score *= LORD_GUARD_BONUS;
        if (isLord(target.unit)) score *= ENEMY_LORD_BONUS;
        if (onSpawn && !isLord(unit)) score *= SPAWN_TILE_PENALTY;

        const cost = origin.cost ?? 0;

        if (
          !best ||
          score > best.score ||
          (score === best.score && cost < best.cost)
        ) {
          best = { origin, target, weapon, preview, score, cost };
        }
      }
    }
  }

  return best;
}

async function executeAttack(unit, from, best) {
  moveUnit(unit, from, best.origin);
  gameCursor?.moveToTarget(best.origin);
  await sleep(0);

  setActiveAttack({
    unit,
    targets: [best.target],
    target: best.target,
    originalX: from.x,
    originalY: from.y,
    destinationX: best.origin.x,
    destinationY: best.origin.y,
    movedToAttackPosition: false,
    preview: best.preview
  });

  try {
    await performAttack(best.weapon);
  } finally {
    // If performAttack bailed out early, don't leave an attack hanging.
    clearActiveAttack();
  }
}

// ==========================================
// DISTANCES AND ADVANCING
// ==========================================

const distanceCache = new Map();

function getCachedMap(unit, objective) {
  const cacheKey = `${unit.terrFactor}|${objective.x},${objective.y}`;

  if (!distanceCache.has(cacheKey)) {
    distanceCache.set(
      cacheKey,
      getDistanceMap(unit, objective.x, objective.y, true)
    );
  }

  return distanceCache.get(cacheKey);
}

function isCorner(x, y) {
  const lastY = gameGrid.length - 1;
  const lastX = (gameGrid[y]?.length ?? 1) - 1;

  return (x === 0 || x === lastX) && (y === 0 || y === lastY);
}

// What this unit may walk toward. Tiles in a danger zone are dropped, so
// a unit never heads for a guard it cannot beat. Lords only want thrones.
function getObjectives(unit, danger) {
  const team = unit.team;
  const lordUnit = isLord(unit);
  const objectives = [];

  forEachTile((tile, x, y) => {
    if (danger.has(keyOf(x, y))) return;

    if (tile.name === "Throne" && tile.owner != null && tile.owner !== team) {
      objectives.push({ x, y });
      return;
    }

	// attack units walk to enemy caves. Put this before the
	if (
	  tile.name === "Cave" && tile.owner != null &&
	  tile.owner !== team && !lordUnit
	) {
	  objectives.push({ x, y });
	  return;
	}

    if (lordUnit || tile.name !== "Fort") return;

    const neutral = tile.owner == null;
    const rivalCorner = tile.owner !== team && isCorner(x, y);
    const rivalFort = tile.owner !== team && CAPTURE_ENEMY_FORTS;

    if (neutral || rivalCorner || rivalFort) objectives.push({ x, y });
  });

  return objectives;
}

// Fallback when no objective is reachable: walk toward enemy units
// (never toward a guard whose zone is off limits).
function getEnemyPositions(team, danger) {
  const positions = [];

  forEachTile((tile, x, y) => {
    if (tile.unit && tile.unit.team !== team && !danger.has(keyOf(x, y))) {
      positions.push({ x, y });
    }
  });

  return positions;
}

// The reachable tile (or staying put) that gets closest to the nearest
// target. Returns null if no target can be reached at all.
//   rules.allowed(tile): tiles it may end on
//   rules.leave: it must step off its spawn tile (stay only as a last resort)
function chooseAdvance(unit, position, moves, targets, rules = {}) {
  const { allowed = null, leave = false } = rules;

  let bestMap = null;
  let startDistance = Infinity;

  for (const target of targets) {
    const map = getCachedMap(unit, target);
    const d = map.get(keyOf(position.x, position.y));

    if (d !== undefined && d < startDistance) {
      startDistance = d;
      bestMap = map;
    }
  }

  if (!bestMap) return null;

  const stay = { x: position.x, y: position.y, dist: startDistance, cost: 0 };

  // When leaving, staying only wins if nothing else is possible.
  let best = leave ? null : stay;

  for (const tile of moves) {
    if (allowed && !allowed(tile)) continue;
    if (leave && isSpawnTile(unit, tile.x, tile.y)) continue;

    const d = bestMap.get(keyOf(tile.x, tile.y));

    if (d === undefined) continue;

    if (
      !best ||
      d < best.dist ||
      (d === best.dist && tile.cost < best.cost)
    ) {
      best = { x: tile.x, y: tile.y, dist: d, cost: tile.cost };
    }
  }

  return best ?? stay;
}

// The cheapest safe tile that is not a spawn tile.
function findLeaveTile(unit, moves, danger) {
  let best = null;

  for (const tile of moves) {
    if (isSpawnTile(unit, tile.x, tile.y)) continue;
    if (danger.has(keyOf(tile.x, tile.y))) continue;

    if (!best || tile.cost < best.cost) best = tile;
  }

  return best;
}

async function stepOff(unit, position, moves, danger) {
  const step = findLeaveTile(unit, moves, danger);

  if (!step) return position;

  moveUnit(unit, position, step);
  gameCursor?.moveToTarget(step);
  await sleep(STEP_PAUSE);

  return { x: step.x, y: step.y };
}

// ==========================================
// PLANS: ROLE, ROUTE AND GOAL (kept on the unit, saved with it)
// ==========================================
// unit.plan = {
//   role: "lord" | "escort" | "raider",
//   goal: { x, y } | null,      the objective it is walking to
//   route: { x, y } | null | undefined,
//          the bridge it crosses by; null = straight there; undefined = not chosen
//   routeDone: true once it has reached the bridge
// }

function ensurePlan(unit, ctx) {
  if (unit.plan) return unit.plan;

  let role = "raider";

  if (isLord(unit)) {
    role = "lord";
  } else if (
    ctx.lord &&
    (ctx.escorts < DESIRED_ESCORTS || Math.random() < ESCORT_SHARE)
  ) {
    role = "escort";
    ctx.escorts++;
  }

  unit.plan = { role, goal: null, route: undefined, routeDone: false };

  return unit.plan;
}

// Is going via `waypoint` a sensible way to reach `goal`? It has to be
// reachable, get closer to the goal, and not be an absurd detour.
function routeEligible(unit, position, waypoint, goal) {
  const toWaypoint = getCachedMap(unit, waypoint).get(keyOf(position.x, position.y));
  const goalMap = getCachedMap(unit, goal);
  const fromWaypoint = goalMap.get(keyOf(waypoint.x, waypoint.y));
  const direct = goalMap.get(keyOf(position.x, position.y));

  if (
    toWaypoint === undefined ||
    fromWaypoint === undefined ||
    direct === undefined
  ) {
    return false;
  }

  if (fromWaypoint >= direct) return false;

  return toWaypoint + fromWaypoint <= direct * ROUTE_DETOUR;
}

// Picks one eligible bridge at random, or null to go straight.
function pickRoute(unit, position, goal) {
  const options = getBridges().filter(bridge =>
    routeEligible(unit, position, bridge, goal)
  );

  if (options.length === 0) return null;

  return options[Math.floor(Math.random() * options.length)];
}

function pickGoal(unit, position, objectives) {
  let best = null;
  let bestDistance = Infinity;

  for (const objective of objectives) {
    const d = getCachedMap(unit, objective).get(keyOf(position.x, position.y));

    if (d !== undefined && d < bestDistance) {
      bestDistance = d;
      best = { x: objective.x, y: objective.y };
    }
  }

  return best;
}

// Keeps the unit's goal and route, only choosing new ones when it has
// none or the goal stopped being valid. Returns the tile to walk to now
// (the bridge first, then the goal), or null if there is no goal.
function refreshPlan(unit, position, objectives) {
  const plan = unit.plan;
  const goal = plan.goal;
  const valid = goal && objectives.some(o => o.x === goal.x && o.y === goal.y);

  if (!valid) {
    plan.goal = pickGoal(unit, position, objectives);

    // A route still on its way and still sensible is kept, so a new goal
    // doesn't make the unit turn around.
    const keep =
      plan.goal &&
      plan.route &&
      !plan.routeDone &&
      routeEligible(unit, position, plan.route, plan.goal);

    if (!keep) {
      plan.route = undefined;
      plan.routeDone = false;
    }
  }

  if (!plan.goal) return null;

  if (plan.route === undefined) {
    plan.route = pickRoute(unit, position, plan.goal);
  }

  if (plan.route && !plan.routeDone && manhattan(position, plan.route) <= 1) {
    plan.routeDone = true;
  }

  return plan.route && !plan.routeDone ? plan.route : plan.goal;
}

// Where a unit with a plan is heading right now, or null.
function getHeading(unit) {
  const plan = unit?.plan;

  if (!plan?.goal) return null;

  return plan.route && !plan.routeDone ? plan.route : plan.goal;
}

// ==========================================
// LORD ESCORT
// ==========================================

function teamHasHealer(lord) {
  return getTeamUnits(lord.team).some(unit => unit !== lord && isHealer(unit));
}

// The lord only walks into the field with company, and waits to be
// healed if he is hurt and a healer exists.
function lordMayAdvance(lord, position) {
  if (lord.hp < lord.maxHp * LORD_HOLD_BELOW && teamHasHealer(lord)) {
    return false;
  }

  let escorts = 0;

  forEachTile((tile, x, y) => {
    const other = tile.unit;

    if (
      other &&
      other !== lord &&
      other.team === lord.team &&
      manhattan({ x, y }, position) <= ESCORT_RADIUS
    ) {
      escorts++;
    }
  });

  return escorts >= ESCORT_MIN;
}

// ==========================================
// STEALING
// ==========================================

function canStealNow(unit) {
  return (
    hasAbility(unit, "steal") &&
    (unit.inventory?.length ?? 0) < MAX_INVENTORY
  );
}

// Plunder items (braces) first, then the most valuable item.
function stealValue(item) {
  if (item.plunder) return 1_000_000;

  return Number.isFinite(item.worth) ? item.worth : 0;
}

function findBestSteal(unit, origins, danger) {
  if (!canStealNow(unit)) return null;

  let best = null;

  for (const origin of origins) {
    if (danger.has(keyOf(origin.x, origin.y))) continue;

    const rank = isSpawnTile(unit, origin.x, origin.y)
      ? SPAWN_TILE_PENALTY
      : 1;

    for (const target of getStealTargets(unit, origin.x, origin.y)) {
            (target.unit.inventory ?? []).forEach((item, index) => {
        if (!isStealable(item)) return;

        const score = stealValue(item) * rank;
        const cost = origin.cost ?? 0;

        if (
          !best ||
          score > best.score ||
          (score === best.score && cost < best.cost)
        ) {
          best = { origin, victim: target.unit, index, score, cost };
        }
      });
    }
  }

  return best;
}

async function executeSteal(unit, from, best) {
  moveUnit(unit, from, best.origin);
  gameCursor?.moveToTarget(best.origin);
  await sleep(0);

  await resolveSteal(unit, best.victim, best.index);
  await sleep(STEP_PAUSE);
}

// Enemies carrying something, outside guard zones.
function getStealPositions(team, danger) {
  const positions = [];

  forEachTile((tile, x, y) => {
    const other = tile.unit;

    if (
      other &&
      other.team !== team &&
      (other.inventory ?? []).some(isStealable) &&
      !danger.has(keyOf(x, y))
    ) {
      positions.push({ x, y });
    }
  });

  return positions;
}

// ==========================================
// HEALING STAVES
// ==========================================

function getHealStaves(unit) {
  return (unit.inventory ?? []).filter(item =>
    isHealingStaff(item) && canUseWeapon(unit, item).usable
  );
}

function isHealer(unit) {
  return getHealStaves(unit).length > 0;
}

// Best (tile, staff, ally) among the origins: the biggest heal wins,
// the shortest walk breaks ties. Spawn tiles and danger zones are avoided.
function findBestHeal(unit, origins, danger) {
  const staves = getHealStaves(unit);

  if (staves.length === 0) return null;

  let best = null;

  for (const origin of origins) {
    if (danger.has(keyOf(origin.x, origin.y))) continue;

    const rank = isSpawnTile(unit, origin.x, origin.y)
      ? SPAWN_TILE_PENALTY
      : 1;

    for (const staff of staves) {
      for (const target of getHealTargets(unit, staff, origin.x, origin.y)) {
        // The healer's own tile still holds it while it plans a move.
        if (target.unit === unit) continue;

        const amount = getHealAmount(unit, staff, target.unit);

        if (amount <= 0) continue;

        const score = amount * rank;
        const cost = origin.cost ?? 0;

        if (
          !best ||
          score > best.score ||
          (score === best.score && cost < best.cost)
        ) {
          best = { origin, staff, target, amount, score, cost };
        }
      }
    }
  }

  return best;
}

async function executeHeal(unit, from, best) {
  moveUnit(unit, from, best.origin);
  gameCursor?.moveToTarget(best.origin);
  await sleep(0);

  await useHealingStaff(unit, best.staff, best.target.unit);
}

// Allies a healer should walk toward: wounded ones, or any fighter.
function getAllyPositions(unit, woundedOnly) {
  const positions = [];

  forEachTile((tile, x, y) => {
    const other = tile.unit;

    if (!other || other === unit || other.team !== unit.team) return;

    if (woundedOnly ? other.hp < other.maxHp : !isHealer(other)) {
      positions.push({ x, y });
    }
  });

  return positions;
}

// ==========================================
// HEALING ITEMS AND SHOPPING
// ==========================================

function getUsableBrace(unit) {
  return (unit.inventory ?? []).find(item =>
    isBraceItem(item) && canPlaceUnit(unit.team, BRACE_UNITS[item.name])
  );
}

// Same result as a human using a brace: the class is unlocked and added
// to the emptiest fort (lowest unit weight), free of charge.
function useBrace(unit, item) {
  const className = BRACE_UNITS[item.name];
  const fort = pickFortForUnit(unit.team, className);

  unlockUnit(unit.team, className);
  if (fort) addPurchasedClassToFort(fort, className);

  consumeWeaponUse(unit, item);
}

function getUsableHealingItem(unit) {
  return (unit.inventory ?? []).find(item => canUseHealingItem(unit, item));
}

// Is the shop beside this team's own throne held by another unit?
function isOwnShopOccupied(unit) {
  let occupied = false;

  forEachTile((tile, x, y) => {
    if (tile.name !== "Throne" || tile.owner !== unit.team) return;

    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = gameGrid[y + dy]?.[x + dx];

      if (next?.name === "Shop" && next.unit && next.unit !== unit) {
        occupied = true;
      }
    }
  });

  return occupied;
}

function rollShopTrips(unit) {
  // New unit type: one roll. This unit will wait for a busy shop.
  if (!unit.unitRolled) {
    unit.unitRolled = true;
    unit.unitTrip = rollUnitPurchase(unit.team);
  }

  // Healing item: one roll, made only while the team's own shop is free.
  if (unit.shopRolled || isOwnShopOccupied(unit)) return;

  unit.shopRolled = true;
  unit.shopTrip = null;

  if ((unit.inventory?.length ?? 0) >= MAX_INVENTORY) return;

  const gold = getGold(unit.team);

  if (gold < SHOP_MIN_GOLD) return;
  if (Math.random() >= SHOP_CHANCE) return;

  unit.shopTrip = gold >= ELIXIR_GOLD ? "Elixir" : "Vulnerary";
}

function buyTripItem(unit) {
  const item = unit.shopTrip === "Elixir"
    ? new Items.Elixir()
    : new Items.Vulnerary();

  unit.shopTrip = null;

  if ((unit.inventory?.length ?? 0) >= MAX_INVENTORY) return false;
  if (getGold(unit.team) < item.worth) return false;

  setGold(unit.team, getGold(unit.team) - item.worth);
  addItem(unit, item);

  return true;
}

function getOwnedForts(team) {
  const forts = [];

  forEachTile(tile => {
    if (tile.name === "Fort" && tile.owner === team) forts.push(tile);
  });

  return forts;
}

function isOffered(team, className) {
  return getOwnedForts(team).some(fort =>
    getAvailableUnits(team, fort).includes(className)
  );
}

// Shop units this team can afford that no owned fort offers yet.
function getUnitPurchaseCandidates(team) {
  if (getOwnedForts(team).length === 0) return [];

  const gold = getGold(team);

  return getPurchasableUnits(team).filter(entry =>
    entry.price <= gold && !isOffered(team, entry.name)
  );
}

// One roll. Returns the class name to buy, or null.
function rollUnitPurchase(team) {
  const candidates = getUnitPurchaseCandidates(team);

  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const steps = Math.floor((getGold(team) - pick.price) / 100);
  const chance = Math.min(1, UNIT_BUY_MIN_CHANCE + steps * UNIT_BUY_PER_100);

  return Math.random() < chance ? pick.name : null;
}

// The fort whose offered units weigh the least. Ties are random.
function pickFortForUnit(team, className = null) {
  let best = [];
  let bestWeight = Infinity;

  for (const fort of getOwnedForts(team)) {
    const offered = getAvailableUnits(team, fort);

    if (className && offered.includes(className)) continue;

    const weight = offered.reduce((sum, name) => sum + getUnitWeight(name), 0);

    if (weight < bestWeight) {
      bestWeight = weight;
      best = [fort];
    } else if (weight === bestWeight) {
      best.push(fort);
    }
  }

  return best.length > 0
    ? best[Math.floor(Math.random() * best.length)]
    : null;
}

// The class this unit should buy right now, or null. Drops the errand
// if another unit already bought that class.
function getUnitErrand(unit) {
  const className = unit.unitTrip;

  if (!className) return null;

  if (getOwnedForts(unit.team).length === 0 || isOffered(unit.team, className)) {
    unit.unitTrip = null;
    return null;
  }

  return getGold(unit.team) >= getUnitPrice(className) ? className : null;
}

function buyTripUnit(unit, className) {
  unit.unitTrip = null;

  const price = getUnitPrice(className);
  const fort = pickFortForUnit(unit.team);

  if (!fort || getGold(unit.team) < price) return false;
  if (isOffered(unit.team, className)) return false;

  setGold(unit.team, getGold(unit.team) - price);
    addPurchasedClassToFort(fort, className);

  return true;
}

function getShopPositions() {
  const positions = [];

  forEachTile((tile, x, y) => {
    if (tile.name === "Shop") positions.push({ x, y });
  });

  return positions;
}

// ==========================================
// PROMOTION SHOPPING
// ==========================================

export function promotionShopChance(unit) {
  const lvl = unit?.lvl ?? 1;

  if (lvl < PROMO_MIN_LEVEL) return 0;

  const t = Math.min(1, (lvl - PROMO_MIN_LEVEL) / (PROMO_MAX_LEVEL - PROMO_MIN_LEVEL));

  return PROMO_CHANCE_MIN + (1 - PROMO_CHANCE_MIN) * t;
}

// A middle-tier unit at level 10+ with somewhere to promote to but no item.
function needsPromotionItem(unit) {
  return (
    Boolean(unit) &&
    !isPromoted(unit) &&
    getClassTier(unit.className) === 1 &&
    !isMonster(unit) &&
    Object.keys(unit.promotionGains ?? {}).length > 0 &&
    (unit.lvl ?? 1) >= PROMO_MIN_LEVEL &&
    !getPromotionItem(unit)
  );
}

// One roll per monster, ever. The flags live on the unit, so they are
// saved with it and can't be re-rolled by loading.
function rollMonsterPromotion(unit) {
  if (unit.promoRolled) return unit.monsterPromote === true;

  if (isPromoted(unit) || getClassTier(unit.className) !== 1) return false;
  if (Object.keys(unit.promotionGains ?? {}).length === 0) return false;
  if ((unit.lvl ?? 1) < PROMO_MIN_LEVEL) return false;   // not yet: no roll

  unit.promoRolled = true;
  unit.monsterPromote = Math.random() < MONSTER_PROMO_CHANCE;

  return unit.monsterPromote;
}

// Call after a level-up or a spawn. Rolls once; once the flag is set
// it never rolls again.
export function rollPromotionShop(unit) {
  if (!unit || !isCpuSide(unit.team)) return false;
  if (isMonster(unit)) return rollMonsterPromotion(unit);   
  if (unit.promoShop) return true;
  if (!needsPromotionItem(unit)) return false;
  if (Math.random() >= promotionShopChance(unit)) return false;

  unit.promoShop = true;

  return true;
}

const itemClasses = new Map();

function createItemByName(name) {
  if (itemClasses.size === 0) {
    for (const Cls of Object.values(Items)) {
      if (typeof Cls !== "function") continue;

      try {
        const sample = new Cls();

        if (sample instanceof Items.Item && sample.name) {
          itemClasses.set(sample.name, Cls);
        }
      } catch {
        // Not constructible without arguments: skip it.
      }
    }
  }

  const Cls = itemClasses.get(name);

  return Cls ? new Cls() : null;
}

// The item this unit should buy right now, or null if the errand is
// over, impossible (inventory full) or unaffordable for now.
function getPromotionErrand(unit) {
  if (!unit.promoShop) return null;

  if (!needsPromotionItem(unit)) {
    unit.promoShop = false;   // promoted, or already holds the item
    return null;
  }

  if ((unit.inventory?.length ?? 0) >= MAX_INVENTORY) return null;

  const item = createItemByName(getPromotionItemName(unit.className));

  if (!item) {
    unit.promoShop = false;
    return null;
  }

  return getGold(unit.team) >= item.worth ? item : null;
}

function buyPromotionItem(unit, item) {
  if ((unit.inventory?.length ?? 0) >= MAX_INVENTORY) return false;
  if (getGold(unit.team) < item.worth) return false;

  setGold(unit.team, getGold(unit.team) - item.worth);
  addItem(unit, item);

  // The purchase is this unit's action. Step 1 of takeUnitTurn promotes
  // it next turn, now that it holds the item.
  unit.promoShop = false;

  return true;
}

// Buys at a shop within reach, or walks toward one. Without `wait`, only
// free shop tiles count as destinations.
// Returns "bought", "walked", "stay", "blocked" (every shop is occupied)
// or "unreachable" (no shop can be reached at all).
async function runShopErrand(
  unit, position, moves, origins, danger, leave, buy, wait = false
) {
  const safe = tile => !danger.has(keyOf(tile.x, tile.y));

  const shop = origins
    .filter(tile => gameGrid[tile.y][tile.x].name === "Shop" && safe(tile))
    .sort((a, b) => a.cost - b.cost)[0];

  if (shop) {
    moveUnit(unit, position, shop);
    gameCursor?.moveToTarget(shop);
    await sleep(STEP_PAUSE);

    buy();
    return "bought";
  }

  const all = getShopPositions();
  const targets = all.filter(spot =>
    wait || (gameGrid[spot.y][spot.x].unit ?? unit) === unit
  );

  if (all.length > 0 && targets.length === 0) return "blocked";

  const step = chooseAdvance(
    unit, position, moves, targets, { allowed: safe, leave }
  );

  if (!step) return "unreachable";

  if (step.x !== position.x || step.y !== position.y) {
    moveUnit(unit, position, step);
    gameCursor?.moveToTarget(step);
    await sleep(STEP_PAUSE);
    return "walked";
  }

  return "stay";
}

// ==========================================
// ONE UNIT'S TURN
// ==========================================

function getTurnOrigins(unit, position) {
  const here = { x: position.x, y: position.y, cost: 0 };

  // Defenders never move, so they only look at their own tile.
  const moves = getAi(unit) === "attack"
    ? getReachableTiles(position.x, position.y, unit)
    : [];

  return { moves, origins: [here, ...moves] };
}

// 0 = healer with someone to heal right now (goes first)
// 1 = the lord, so escorts react to where he ends up
// 2 = units standing on their own fort or throne, so those tiles clear
// 3 = everyone else
// 4 = healer with nothing to heal yet (goes last, so it can patch up
//     whoever got hurt in this turn's fights)
function getTurnPriority(unit) {
  const position = getUnitPosition(unit);

  if (isHealer(unit)) {
    if (!position) return 4;

    const { origins } = getTurnOrigins(unit, position);

    return findBestHeal(unit, origins, NO_DANGER) ? 0 : 4;
  }

  if (isLord(unit)) return 1;

  if (
    position &&
    getAi(unit) === "attack" &&
    isSpawnTile(unit, position.x, position.y)
  ) {
    return 2;
  }

  return 3;
}

// Picks where to walk this turn. Returns a tile, or null for "no idea".
function chooseMove(unit, position, moves, objectives, ctx, danger, leave, lordPos) {
  const safe = tile => !danger.has(keyOf(tile.x, tile.y));
  const rules = { allowed: safe, leave };
  const plan = ensurePlan(unit, ctx);
  const attempts = [];

  if (canStealNow(unit)) {
    attempts.push(() =>
      chooseAdvance(unit, position, moves, getStealPositions(unit.team, danger), rules)
    );
  }
  
  // Healers follow wounded allies, then fighters.
  if (isHealer(unit)) {
    attempts.push(
      () => chooseAdvance(unit, position, moves, getAllyPositions(unit, true), rules),
      () => chooseAdvance(unit, position, moves, getAllyPositions(unit, false), rules)
    );
  }

  if (plan.role === "escort" && lordPos) {
    // Escorts stay near the lord and move with him.
    attempts.push(() => {
      if (manhattan(position, lordPos) > LEASH) {
        return chooseAdvance(unit, position, moves, [lordPos], rules);
      }

      const heading = getHeading(ctx.lord) ?? lordPos;

      return chooseAdvance(unit, position, moves, [heading], {
        leave,
        allowed: tile =>
          safe(tile) && manhattan(tile, lordPos) <= LEASH
      });
    });
  } else {
    attempts.push(() => {
      const target = refreshPlan(unit, position, objectives);

      if (!target) return null;

      // The lord waits for company (or a healer) before going out.
      if (isLord(unit) && !lordMayAdvance(unit, position)) {
        const step = leave ? findLeaveTile(unit, moves, danger) : null;

        return step ?? { x: position.x, y: position.y, cost: 0 };
      }

      return chooseAdvance(unit, position, moves, [target], rules);
    });
  }

  // A lord never wanders off alone to chase enemies.
  if (!isLord(unit)) {
    attempts.push(() =>
      chooseAdvance(unit, position, moves, getEnemyPositions(unit.team, danger), rules)
    );
  }

  for (const attempt of attempts) {
    const choice = attempt();

    if (choice) return choice;
  }

  return null;
}

// Walls and snags are handled like enemy units that block the road: the
// distance map runs through them, and when one stands next to the unit on
// its shortest route, the unit attacks it.
function pickTerrainWeapon(unit, weapons) {
  const equipped = weapons.find(weapon => weapon === unit.equippedWeapon);

  if (equipped) return equipped;   // don't swap weapons just to dig

  const price = weapon => Number.isFinite(weapon.worth) ? weapon.worth : Infinity;

  return [...weapons].sort(
    (a, b) => (price(a) > price(b)) - (price(a) < price(b))
  )[0];
}

function findTerrainBreak(unit, spot) {
  const goal = getHeading(unit);

  if (!goal) return null;

  const map = getCachedMap(unit, goal);
  const here = map.get(keyOf(spot.x, spot.y));

  if (here === undefined) return null;

  for (const target of findAttackTargets(unit, spot.x, spot.y)) {
    if (target.type !== "terrain") continue;
    if (manhattan(spot, target) !== 1) continue;

    const there = map.get(keyOf(target.x, target.y));
    const cost = getEnterCost(target.x, target.y, unit, true);

    if (there === undefined || cost === null) continue;

    // Only when the shortest route to the goal runs through this tile.
    if (here !== there + cost) continue;

    return {
      origin: spot,
      target,
      weapon: pickTerrainWeapon(unit, target.weapons),
      preview: null
    };
  }

  return null;
}

async function takeUnitTurn(unit, ctx) {
  let position = getUnitPosition(unit);

  if (!position) return;

  gameCursor?.moveToTarget(position);
  await sleep(STEP_PAUSE);

  const attackMode = getAi(unit) === "attack";

  // The single shop roll for this unit.
  if (attackMode) rollShopTrips(unit);

  const danger = attackMode ? getDangerTiles(unit) : NO_DANGER;
  const leave = attackMode && isSpawnTile(unit, position.x, position.y);
  const { moves, origins } = getTurnOrigins(unit, position);

  const lordPos = ctx.lord && ctx.lord !== unit
    ? getUnitPosition(ctx.lord)
    : null;
    
  // 0. Use a brace it carries. Ends the unit's action, so a promotion
  // waits for the next turn.
  const brace = attackMode ? getUsableBrace(unit) : null;

  if (brace) {
    if (leave) position = await stepOff(unit, position, moves, danger);

    useBrace(unit, brace);
    await sleep(STEP_PAUSE);
    return;
  }

    // 1. Promote when eligible. This ends the unit's action.
  const promotions = getPromotionOptions(unit);

  // A monster only promotes if its one-time roll passed.
  const mayPromote =
    promotions.length > 0 &&
    (!isMonster(unit) || unit.monsterPromote === true);

  if (mayPromote) {
    unit.promoShop = false;
    // Step off the fort first so a reinforcement can appear there.
    if (leave) position = await stepOff(unit, position, moves, danger);

    promoteUnit(
      unit,
      promotions[Math.floor(Math.random() * promotions.length)]
    );
    await sleep(STEP_PAUSE);
    return;
  }

  // 2. Badly hurt: drink a healing item it already carries.
  const potion = getUsableHealingItem(unit);

  if (potion && unit.hp <= unit.maxHp * USE_BELOW) {
    if (leave) position = await stepOff(unit, position, moves, danger);

    await useHealingItem(unit, potion);
    return;
  }
  
    // 2b. Poisoned: use an Antitoxin it already carries.
  const antidote = (unit.inventory ?? []).find(item => canUseCureItem(unit, item));

  if (antidote) {
    if (leave) position = await stepOff(unit, position, moves, danger);

    await useItemEffect(unit, antidote);
    unit.hasMoved = true;
    return;
  }

  // 3. Heal an ally with a staff.
  const heal = findBestHeal(unit, origins, danger);

  if (heal) {
    await executeHeal(unit, position, heal);
    return;
  }
  
    // 3b. Thieves steal while they have room.
  const steal = findBestSteal(unit, origins, danger);

  if (steal) {
    await executeSteal(unit, position, steal);
    return;
  }

  // 4. Attack the best target available, if the fight is worth it.
  const best = findBestAttack(unit, origins, danger, lordPos);

  if (best) {
    await executeAttack(unit, position, best);
    return;
  }

  if (!attackMode) return;

  // 5. Shopping errands, in priority order: a promotion item, a new
  // unit type, then a healing item. Only the unit errand waits for a
  // busy shop.
  const promoItem = getPromotionErrand(unit);
  const unitName = promoItem ? null : getUnitErrand(unit);

  let buy = null;

  if (promoItem) buy = () => buyPromotionItem(unit, promoItem);
  else if (unitName) buy = () => buyTripUnit(unit, unitName);
  else if (unit.shopTrip) buy = () => buyTripItem(unit);

  if (buy) {
    const waits = Boolean(unitName);
    const result = await runShopErrand(
      unit, position, moves, origins, danger, leave, buy, waits
    );

    if (result === "bought" || result === "walked") {
      unit.shopWait = 0;
      return;
    }

    if (result === "stay" && waits) {
      unit.shopWait = (unit.shopWait ?? 0) + 1;

      if (unit.shopWait <= MAX_SHOP_WAIT) return;

      // Waited too long: give the errand up.
      unit.shopWait = 0;
      unit.unitTrip = null;
    }

    // No shop can be reached at all: give up a purchase trip.
    // ("blocked" keeps the errand and tries again next turn.)
    if (result === "unreachable") {
      if (unitName) unit.unitTrip = null;
      else if (!promoItem) unit.shopTrip = null;
    }
  }

  // 6. Advance along the plan (escort, lord or raider).
  const objectives = getObjectives(unit, danger);
  const choice = chooseMove(
    unit, position, moves, objectives, ctx, danger, leave, lordPos
  );

  // Dig through a wall or snag on the way. Healers, thieves on the hunt
  // and a lord still waiting for escorts don't.
  const digs =
    !isHealer(unit) &&
    !canStealNow(unit) &&
    (!isLord(unit) || lordMayAdvance(unit, position));

  if (digs) {
    const dig = findTerrainBreak(unit, choice ?? position);

    if (dig) {
      await executeAttack(unit, position, dig);
      distanceCache.clear();   // the map just changed
      return;
    }
  }
  
  let current = position;

  if (choice && (choice.x !== position.x || choice.y !== position.y)) {
    moveUnit(unit, position, choice);
    gameCursor?.moveToTarget(choice);
    await sleep(STEP_PAUSE);
    current = { x: choice.x, y: choice.y };
  }

  // Never end the turn on a spawn tile if any safe tile is in reach.
  if (leave && current === position) {
    current = await stepOff(unit, position, moves, danger);
  }

  const now = getUnitPosition(unit);

	if (now && getCapturableTile(unit, now.x, now.y)) {
	  captureTile(unit);
	} else if (now && getDestroyableCave(unit, now.x, now.y)) {
	  destroyCave(unit);
	}
}

// ==========================================
// FULL CPU TURN
// ==========================================

function buildContext(team) {
  const units = getTeamUnits(team);

  return {
    lord: units.find(isLord) ?? null,
    escorts: units.filter(unit => unit.plan?.role === "escort").length
  };
}

export async function runCpuTurn(team) {
  const lock = pushInputContext(NO_INPUT);
  setCpuActing(true);

  try {
    distanceCache.clear();

    // Also guarantees a CPU-only game can't spin without yielding.
    await sleep(400);

    const ctx = buildContext(team);

    const units = getTeamUnits(team)
      .map(unit => ({ unit, priority: getTurnPriority(unit) }))
      .sort((a, b) => a.priority - b.priority)
      .map(entry => entry.unit);

    for (const unit of units) {
  	if (isGameOver()) break;
      if (!getUnitPosition(unit) || unit.hasMoved || isImmobile(unit)) continue;

      try {
        await takeUnitTurn(unit, ctx);
      } catch (error) {
        console.error("CPU unit failed:", error);
      } finally {
        if (getUnitPosition(unit)) unit.hasMoved = true;
      }
    }
  } finally {
    setCpuActing(false);
    popInputContext(lock);
  }
}