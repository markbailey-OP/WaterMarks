import { setBattleAnimation } from "../gameArea.js";
import { sleep as rawSleep, escapeHtml, statMarkup, levelLabel } from "../utils.js";
import { animMs } from "../settings.js";
import { MAX_LEVEL } from "../exp.js";

// Every pause on the EXP and level-up screens follows the animation speed.
const sleep = ms => rawSleep(animMs(ms));

// ==========================================
// TIMING
// ==========================================

const EXP_BAR_DURATION = 500;
const EXP_BAR_FRAMES = 15;

// ==========================================
// STAT HELPERS
// ==========================================

// Maps level-up gain keys to the unit's stat properties.
const STAT_ALIASES = {
  hp: "maxHp",
  maxHp: "maxHp",
  str: "str",
  mag: "mag",
  skl: "skl",
  spd: "spd",
  lck: "lck",
  def: "def",
  res: "res",
  move: "move",
  con: "con"
};

function getTrackedStats(unit) {
  return [
    "maxHp",
    unit.mag !== undefined && unit.mag !== null ? "mag" : "str",
    "skl",
    "spd",
    "lck",
    "def",
    "res",
    "move",
    "con"
  ];
}

// Converts one level's raw gains into { statKey: gainAmount },
// keeping only stats that actually increased.
function normalizeGains(rawGains, trackedStats) {
  const gains = {};

  for (const [gainKey, rawGain] of Object.entries(rawGains ?? {})) {
    const key = STAT_ALIASES[gainKey];
    const gain = Number(rawGain);

    if (
      !key ||
      !trackedStats.includes(key) ||
      !Number.isFinite(gain) ||
      gain <= 0
    ) {
      continue;
    }

    gains[key] = gain;
  }

  return gains;
}

// The unit's stats before ANY of this fight's level-ups:
// final stats minus every level's gains.
function getStartingValues(unit, levelGains, trackedStats) {
  const values = {};

  for (const key of trackedStats) {
    values[key] = unit[key];
  }

  for (const gains of levelGains) {
    for (const [key, gain] of Object.entries(gains)) {
      values[key] -= gain;
    }
  }

  return values;
}

// ==========================================
// EXPERIENCE ANIMATION
// ==========================================

async function animateExpBar(unit, result, level, from, to) {
  const show = progress => setBattleAnimation({
    type: "exp",
    unit,
    expGained: result.expGained,
    progress: Math.min(100, Math.max(0, progress)),
    level,
    showLevelUp: false
  });

  // Nothing to fill (for example, the bar resetting to 0 after
  // a level-up that used up all of the EXP).
  if (to <= from) {
    show(to);
    return;
  }

  for (let frame = 1; frame <= EXP_BAR_FRAMES; frame++) {
    show(from + (to - from) * frame / EXP_BAR_FRAMES);
    await sleep(EXP_BAR_DURATION / EXP_BAR_FRAMES);
  }
}

// Plays the EXP bar and any level-ups that actually happened.
// `result` is the object returned by awardClassExp().
export async function animateExpAward(unit, result, startingExp) {
  // Defeated units can receive EXP, but should not show an animation.
  if (!unit || unit.hp <= 0 || !result || result.expGained <= 0) {
    return;
  }

  const levelsGained = result.levelsGained ?? 0;
  const trackedStats = getTrackedStats(unit);

  const levelGains = (result.statGains ?? [])
    .slice(0, levelsGained)
    .map(gains => normalizeGains(gains, trackedStats));

  // Stats as they were before this fight, updated level by level.
  const runningValues = getStartingValues(
    unit,
    levelGains,
    trackedStats
  );

  // Final EXP after all level-ups. A capped trainee can hold 100+.
  const finalExp = Math.min(100, unit.exp ?? 0);

  let level = unit.lvl - levelsGained;
  let from = startingExp;

  // One bar fill and one level-up screen per level actually gained.
  for (let i = 0; i < levelsGained; i++) {
    await animateExpBar(unit, result, level, from, 100);

    const oldLevel = level;
    level++;

    // Display the level-up alert on the EXP bar.
    setBattleAnimation({
      type: "exp",
      unit,
      expGained: result.expGained,
      progress: 100,
      showLevelUp: true,
      level
    });

    // Give the player time to see the level-up alert.
    await sleep(800);

    // Show the level-up stat window.
    await showLevelUpStatusScreen(
      unit,
      oldLevel,
      level,
      runningValues,
      levelGains[i] ?? {}
    );

    // The next level starts from this level's results.
    for (const [key, gain] of Object.entries(levelGains[i] ?? {})) {
      runningValues[key] += gain;
    }

    from = 0;
  }

  // Remaining EXP toward the next level.
  await animateExpBar(unit, result, level, from, finalExp);

  await sleep(500);
  setBattleAnimation(null);
}

// ==========================================
// LEVEL-UP STATUS SCREEN
// ==========================================

function renderUnitStats(unit, options = {}) {
  if (!unit) return;

  const statsElement = document.getElementById("unitStats");
  if (!statsElement) return;

  const level = options.level ?? unit.lvl;

  const levelClass = level >= MAX_LEVEL
    ? "stat-capped"
    : options.levelColor === "old"
      ? "level-old"
      : options.levelColor === "new"
        ? "level-new"
        : "";

  const values = options.values ?? {};

  const maxHp = values.maxHp ?? unit.maxHp;
  const currentHp = unit.hp;
  const isMagicUser = unit.mag !== undefined && unit.mag !== null;

  const mainStatName = isMagicUser ? "Mag" : "Str";
  const mainStatKey = isMagicUser ? "mag" : "str";
  const mainStatValue = values[mainStatKey] ?? unit[mainStatKey];

  statsElement.innerHTML = `
    <h3>${escapeHtml(unit.name)}</h3>

    <p>
      <strong>Lvl:</strong>
      <span class="${levelClass}">${escapeHtml(levelLabel(unit, level))}</span>
    </p>

    <p>
      <strong>HP:</strong>
      ${escapeHtml(currentHp)}/${statMarkup(unit, "maxHp", maxHp, options)}
      &nbsp;&nbsp;
      <strong>Exp:</strong>
      ${escapeHtml(unit.exp)}/100
    </p>

    <hr>

    <div class="unit-stat-grid">
      <div><strong>${mainStatName}:</strong> ${statMarkup(unit, mainStatKey, mainStatValue, options)}</div>
      <div><strong>Skill:</strong> ${statMarkup(unit, "skl", values.skl ?? unit.skl, options)}</div>
      <div><strong>Spd:</strong> ${statMarkup(unit, "spd", values.spd ?? unit.spd, options)}</div>
      <div><strong>Luck:</strong> ${statMarkup(unit, "lck", values.lck ?? unit.lck, options)}</div>
      <div><strong>Def:</strong> ${statMarkup(unit, "def", values.def ?? unit.def, options)}</div>
      <div><strong>Res:</strong> ${statMarkup(unit, "res", values.res ?? unit.res, options)}</div>
      <div><strong>Mov:</strong> ${statMarkup(unit, "move", values.move ?? unit.move, options)}</div>
      <div><strong>Con:</strong> ${statMarkup(unit, "con", values.con ?? unit.con, options)}</div>
    </div>
  `;
}

// oldValues: the unit's stats before this level.
// gains: { statKey: amountGained } for this level only.
async function showLevelUpStatusScreen(
  unit,
  oldLevel,
  newLevel,
  oldValues,
  gains
) {
  const menu = document.getElementById("unitMenu");
  const options = document.getElementById("unitOptions");
  const details = document.getElementById("unitDetails");
  const stats = document.getElementById("unitStats");
  const weapons = document.getElementById("unitWeapons");
  const detailButtons = document.getElementById("unitDetailButtons");

  // Make sure all required elements exist.
  if (
    !menu ||
    !options ||
    !details ||
    !stats ||
    !weapons ||
    !detailButtons
  ) {
    console.error("Level-up screen: Required menu elements are missing.");
    return;
  }

  // Show the level-up menu above the battle display.
  menu.classList.add("level-up-screen");

  menu.style.position = "fixed";
  menu.style.display = "block";
  menu.style.visibility = "visible";
  menu.style.opacity = "1";
  menu.style.zIndex = "10000";

  options.style.display = "none";
  details.style.display = "block";
  stats.style.display = "block";
  weapons.style.display = "none";
  detailButtons.style.display = "none";

  // Show all stats using their pre-level values.
  renderUnitStats(unit, {
    level: oldLevel,
    levelColor: "old",
    values: oldValues
  });

  await sleep(500);

  // Change the displayed level.
  renderUnitStats(unit, {
    level: newLevel,
    levelColor: "new",
    values: oldValues
  });

  await sleep(500);

  const revealedStats = {};

  // Only animate stats that actually increased, in display order.
  const increasedStats = getTrackedStats(unit).filter(
    key => gains[key] !== undefined
  );

  for (const key of increasedStats) {
    revealedStats[key] = oldValues[key] + gains[key];

    renderUnitStats(unit, {
      level: newLevel,
      levelColor: "new",
      values: oldValues,
      revealedStats
    });

    await sleep(350);
  }

  // Keep the final results visible briefly.
  renderUnitStats(unit, {
    level: newLevel,
    levelColor: "new",
    values: oldValues,
    revealedStats
  });

  await sleep(1000);

  // Hide the level-up screen and restore the regular unit menu.
  menu.style.display = "none";
  menu.classList.remove("level-up-screen");

  menu.style.zIndex = "";
  menu.style.visibility = "";
  menu.style.opacity = "";
  menu.style.position = "";

  options.style.display = "block";
  details.style.display = "none";
  detailButtons.style.display = "flex";
}
