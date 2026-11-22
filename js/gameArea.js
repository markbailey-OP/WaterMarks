import {
  gameGrid,
  selectedAttackTarget,
  getUnitPosition,
  TEAM_COLORS
} from "./gameState.js";
import { TILE_SIZE } from "./map.js";
import { getActiveAttack } from "./menus/attackState.js";
import {
  staffTargets,
  selectedStaffTarget,
  getActiveStaff,
  getActiveStaffRange
} from "./menus/staffState.js";
import {
  VIEW_SIZE,
  applyCamera,
  getScale,
  resetCamera,
  tileToScreen
} from "./camera.js";

import { drawTerrainTile } from "./tileset.js";
import { drawUnitSprite } from "./sprites.js";
import { appearsUsed } from "./status.js";

let battleAnimation = null;
let battleStatus = null;
let terrainStatus = null;
let summonTiles = [];

export function setBattleAnimation(animation) {
  battleAnimation = animation;
}

export function setBattleStatus(status) {
  battleStatus = status;
}

export function setTerrainStatus(status) {
  terrainStatus = status;
}

let skillAlerts = [];

// A list of { text, unit } banners, or null to clear.
export function setAlert(alerts) {
  skillAlerts = alerts ? [].concat(alerts) : [];
}

export function setSummonTiles(tiles) {
  summonTiles = tiles ?? [];
}

export function setMapDirty(dirty = true) {
  mapDirty = dirty;
}

// The canvas is a fixed viewport; the map is drawn through the camera.
export let canvasWidth = 0;
export let canvasHeight = 0;

// Whole map in world pixels (TILE_SIZE per tile).
let worldWidth = 0;
let worldHeight = 0;

// ==========================================
// DRAWING HELPERS
// ==========================================

function fillTiles(ctx, tiles, color) {
  ctx.fillStyle = color;

  for (const tile of tiles) {
    ctx.fillRect(
      tile.x * TILE_SIZE,
      tile.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
  }
}

// Red attack tiles; the currently selected target is brighter.
function drawAttackTiles(ctx, tiles) {
  for (const tile of tiles) {
    const isSelected =
      selectedAttackTarget &&
      selectedAttackTarget.x === tile.x &&
      selectedAttackTarget.y === tile.y;

    fillTiles(
      ctx,
      [tile],
      isSelected
        ? "rgba(255, 40, 40, 0.55)"
        : "rgba(220, 30, 30, 0.30)"
    );
  }
}

// Green staff tiles; the currently selected target is brighter.
function drawStaffTiles(ctx, tiles) {
  for (const tile of tiles) {
    const isSelected =
      selectedStaffTarget &&
      selectedStaffTarget.x === tile.x &&
      selectedStaffTarget.y === tile.y;

    const isTarget = staffTargets.some(
      target => target.x === tile.x && target.y === tile.y
    );

    fillTiles(
      ctx,
      [tile],
      isSelected
        ? "rgba(30, 220, 90, 0.65)"
        : isTarget
          ? "rgba(30, 200, 70, 0.45)"
          : "rgba(30, 200, 70, 0.30)"
    );
  }
}

// Reads the HUD panel colors from the active theme.
function readThemeColors() {
  const theme = getComputedStyle(document.documentElement);
  const read = (name, fallback) =>
    theme.getPropertyValue(name).trim() || fallback;

  return {
    background: read("--panel-bg", "#30373c"),
    raised: read("--panel-raised", "#414b50"),
    text: read("--text-light", "#f2eee3"),
    border: read("--gold", "#c6a75b"),
    accent: read("--accent", "#667d61"),
    blue: read("--blue-team", "#356fc0"),
    red: read("--red-team", "#b94a4a"),
    green: read("--green-team","#3f9a4f"),
    page: read("--page-bg", "#202326")
  };
}

// Theme colors are cached and only re-read when the theme changes.
let cachedThemeName = null;
let cachedThemeColors = null;

function getThemeColors() {
  const themeName = document.documentElement.dataset.theme ?? "";

  if (!cachedThemeColors || themeName !== cachedThemeName) {
    cachedThemeColors = readThemeColors();
    cachedThemeName = themeName;
  }

  return cachedThemeColors;
}

function teamThemeColor(colors, team) {
  return team === 1 ? colors.blue : team === 2 ? colors.red : colors.green;
}

// ==========================================
// MAP LAYER (rendered once, then reused)
// ==========================================

let mapLayer = null;
let mapDirty = true;

// Call when terrain changes (for example, a destroyed wall)
// so the map is redrawn on the next frame.
export function invalidateMap() {
  mapDirty = true;
}

function renderMapLayer() {
  mapLayer ??= document.createElement("canvas");

  mapLayer.width = worldWidth;
  mapLayer.height = worldHeight;
  
  const ctx = mapLayer.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < gameGrid.length; y++) {
    for (let x = 0; x < gameGrid[y].length; x++) {
      const tile = gameGrid[y][x];

      if (!tile) continue;

   // Sprite from the tileset, or the terrain's solid color if it has none.
      if (!drawTerrainTile(ctx, tile.name, x, y, TILE_SIZE)) {
        ctx.fillStyle = tile.color;

        ctx.fillRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
                        if (tile.owner) {
        const teamColor = TEAM_COLORS[tile.owner];

        // Thrones still show a border; forts show only their number.
        if (tile.name === "Throne") {
          ctx.strokeStyle = teamColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(
            x * TILE_SIZE + 3,
            y * TILE_SIZE + 3,
            TILE_SIZE - 6,
            TILE_SIZE - 6
          );
        }

        // Fort index in the bottom right corner.
        if (tile.name === "Fort" && tile.index) {
          const label = String(tile.index);
          const labelX = x * TILE_SIZE + TILE_SIZE - 7;
          const labelY = y * TILE_SIZE + TILE_SIZE - 7;

          ctx.font = "bold 12px Arial";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.lineJoin = "round";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "black";
          ctx.strokeText(label, labelX, labelY);
          ctx.fillStyle = teamColor;
          ctx.fillText(label, labelX, labelY);
        }
      }

     /* // Shop marker
      if (tile.name === "Shop") {
        const labelX = x * TILE_SIZE + TILE_SIZE / 2;
        const labelY = y * TILE_SIZE + TILE_SIZE / 2;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "black";
        ctx.strokeText("$", labelX, labelY);
        ctx.fillStyle = "#ffeb3b";
        ctx.fillText("$", labelX, labelY);
      } */
    }
  }

  /* // Grid lines.
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x <= canvasWidth; x += TILE_SIZE) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
  }

  for (let y = 0; y <= canvasHeight; y += TILE_SIZE) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
  }

  ctx.stroke();
  */

  mapDirty = false;
}

// HUD panels sit at the bottom when the unit is in the top half
// of the map, and at the top otherwise.
function getPanelTop(unit, height) {
  const position = getUnitPosition(unit);

  const unitIsInTopHalf = position
    ? (() => {
        const spot = tileToScreen(position.x, position.y);
        return spot.y + spot.size / 2 < canvasHeight / 2;
      })()
    : true;

  return unitIsInTopHalf
    ? canvasHeight - height - 10
    : 10;
}

export const myGameArea = {
  canvas: null,
  context: null,
  frame: null,

  start(update) {
    this.canvas = document.getElementById("gameCanvas");

    if (!this.canvas) {
      console.error('Could not find canvas with id "gameCanvas".');
      return;
    }

    // Calculate map dimensions.
        const rows = gameGrid.length;
    const columns = Math.max(0, ...gameGrid.map(row => row.length));

    worldWidth = columns * TILE_SIZE;
    worldHeight = rows * TILE_SIZE;

    canvasWidth = VIEW_SIZE;
    canvasHeight = VIEW_SIZE;

    // Set the actual canvas resolution.
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    resetCamera();
    
    this.context = this.canvas.getContext("2d");

    if (!this.context) {
      console.error("Could not get the canvas 2D context.");
      return;
    }

    this.context.font = "20px Times New Roman";
    this.context.textAlign = "center";

    // The map layer is rebuilt for the new dimensions.
    mapDirty = true;

    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
    }

    // Schedule the next frame first so one error cannot stop the loop.
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      update();
    };

    this.frame = requestAnimationFrame(loop);
  },
  
  drawMap() {
  if (!this.context) return;

  if (mapDirty || !mapLayer) {
    renderMapLayer();
  }

  if (mapLayer) {
    this.context.drawImage(mapLayer, 0, 0);
  }
},

    clear() {
    if (!this.context || !this.canvas) return;

    const ctx = this.context;

    // Screen space: wipe and fill the area outside the map.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = getThemeColors().page;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.imageSmoothingEnabled = false;

    // World space until drawUnits() switches back for the HUD.
    applyCamera(ctx);
  },

  // ==========================================
  // DRAW BATTLE HP STATUS
  // ==========================================

  drawBattleStatus() {
    if (!this.context || !battleStatus) return;

    const ctx = this.context;
    const colors = getThemeColors();
    const single = !battleStatus.teamTwo;

    // ==========================================
    // PANEL POSITION
    // ==========================================

    const width = Math.min(single ? 260 : 520, canvasWidth - 20);
    const height = 120;

    const left = (canvasWidth - width) / 2;
    const top = getPanelTop(battleStatus.attacker, height);

    // ==========================================
    // BACKGROUND PANEL
    // ==========================================

    ctx.fillStyle = colors.background;
    ctx.fillRect(left, top, width, height);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(left, top, width, height);

    // ==========================================
    // DRAW BOTH UNITS
    // ==========================================

    const units = [
  {
    ...battleStatus.teamOne,
    color: teamThemeColor(colors, battleStatus.teamOne.team),
    x: left + 20
  }
];

if (!single) {
  units.push({
    ...battleStatus.teamTwo,
    color: teamThemeColor(colors, battleStatus.teamTwo.team),
    x: left + width / 2 + 10
  });
}

    const sectionWidth = single ? width - 30 : (width - 40) / 2;

    for (const unit of units) {
      const percentage = unit.maxHp > 0
        ? Math.max(0, Math.min(100, unit.hp / unit.maxHp * 100))
        : 0;

      // Unit name.
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = unit.color;

      ctx.fillText(
        unit.name,
        unit.x,
        top + 25
      );

      // HP text.
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "right";
      ctx.fillStyle = colors.text;

      ctx.fillText(
        `${unit.hp}/${unit.maxHp}`,
        unit.x + sectionWidth - 10,
        top + 25
      );

      // HP bar background.
      const barLeft = unit.x;
      const barTop = top + 48;
      const barWidth = sectionWidth - 10;
      const barHeight = 24;

      ctx.fillStyle = colors.raised;

      ctx.fillRect(
        barLeft,
        barTop,
        barWidth,
        barHeight
      );

      // HP bar fill.
      ctx.fillStyle = unit.hp <= 0 ? "#222222" : unit.color;

      ctx.fillRect(
        barLeft,
        barTop,
        barWidth * percentage / 100,
        barHeight
      );

      // HP bar border.
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2;

      ctx.strokeRect(
        barLeft,
        barTop,
        barWidth,
        barHeight
      );
    }
  },
  
    // ==========================================
  // DRAW TERRAIN HP STATUS
  // ==========================================

  drawTerrainStatus() {
    if (!this.context || !terrainStatus) return;

    const ctx = this.context;
    const colors = getThemeColors();

    const width = Math.min(260, canvasWidth - 20);
    const height = 120;

    const left = (canvasWidth - width) / 2;
    const top = getPanelTop(terrainStatus.attacker, height);

    ctx.fillStyle = colors.background;
    ctx.fillRect(left, top, width, height);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(left, top, width, height);

    const percentage = terrainStatus.maxHp > 0
      ? Math.max(0, Math.min(100, terrainStatus.hp / terrainStatus.maxHp * 100))
      : 0;

    // "WeakWall" -> "Weak Wall"
    const displayName = terrainStatus.name.replace(/([a-z])([A-Z])/g, "$1 $2");

    ctx.font = "bold 18px Arial";
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    ctx.fillStyle = colors.text;
    ctx.fillText(displayName, left + 20, top + 25);

    ctx.font = "bold 16px Arial";
    ctx.textAlign = "right";
    ctx.fillText(
      `${terrainStatus.hp}/${terrainStatus.maxHp}`,
      left + width - 20,
      top + 25
    );

    const barLeft = left + 20;
    const barTop = top + 48;
    const barWidth = width - 40;
    const barHeight = 24;

    ctx.fillStyle = colors.raised;
    ctx.fillRect(barLeft, barTop, barWidth, barHeight);

    // Terrain HP is always grey.
    ctx.fillStyle = "#9e9e9e";
    ctx.fillRect(barLeft, barTop, barWidth * percentage / 100, barHeight);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(barLeft, barTop, barWidth, barHeight);
  },

  // ==========================================
  // DRAW EXP ANIMATION
  // ==========================================

  drawExpAnimation() {
    if (!this.context || battleAnimation?.type !== "exp") return;

    const ctx = this.context;
    const animation = battleAnimation;
    const colors = getThemeColors();

    // ==========================================
    // CALCULATE PANEL POSITION
    // ==========================================

    const width = Math.min(520, canvasWidth - 20);
    const height = 210;

    const left = (canvasWidth - width) / 2;
    const top = getPanelTop(animation.unit, height);

    // ==========================================
    // DRAW BACKGROUND PANEL
    // ==========================================

    ctx.fillStyle = colors.background;
    ctx.fillRect(left, top, width, height);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(left, top, width, height);

    // ==========================================
    // UNIT NAME AND EXP GAINED
    // ==========================================

    const fontSize = Math.min(32, width * 0.065);

    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    ctx.fillStyle = teamThemeColor(colors, animation.unit.team);


    ctx.fillText(
      animation.unit.name,
      left + 20,
      top + 38
    );

    ctx.textAlign = "right";
    ctx.fillStyle = colors.text;

    ctx.fillText(
      `+${animation.expGained} EXP`,
      left + width - 20,
      top + 38
    );

    // ==========================================
    // EXP BAR
    // ==========================================

    const barLeft = left + 20;
    const barTop = top + 76;
    const barWidth = width - 40;
    const barHeight = 30;

    // Bar background.
    ctx.fillStyle = colors.raised;
    ctx.fillRect(barLeft, barTop, barWidth, barHeight);

    // Current EXP progress.
    const progress = Math.min(
      100,
      Math.max(0, animation.progress ?? 0)
    );

    ctx.fillStyle = colors.accent;

    ctx.fillRect(
      barLeft,
      barTop,
      barWidth * (progress / 100),
      barHeight
    );

    // Bar border.
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(barLeft, barTop, barWidth, barHeight);

    // ==========================================
    // LEVEL-UP MESSAGE
    // ==========================================

    if (animation.showLevelUp) {
      ctx.font = "bold 36px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = colors.border;

      ctx.fillText(
        "LEVEL UP!",
        left + width / 2,
        top + 160
      );
    }
  },

  // ==========================================
  // DRAW OVERLAYS AND UNITS
  // ==========================================

  drawUnits() {
    if (!this.context) return;

    const ctx = this.context;

    // ==========================================
    // PASS 1: OVERLAYS (always underneath units)
    // ==========================================

    // Attack target range during target selection.
    const activeAttack = getActiveAttack();

    if (activeAttack?.attackRange) {
      drawAttackTiles(ctx, activeAttack.attackRange);
    }

    // Staff target range during staff target selection (green squares).
    const activeStaff = getActiveStaff();
    const activeStaffRange = getActiveStaffRange();

    if (activeStaff) {
      if (activeStaffRange && activeStaffRange.length > 0) {
        drawStaffTiles(ctx, activeStaffRange);
      } else {
        drawStaffTiles(ctx, staffTargets);
      }
    }

    // Selected unit's movement range, attack range, and outline.
    // When attacking or using a staff, the blue squares for movement disappear.
    if (!activeAttack?.attackRange && !activeStaff) {
      for (let y = 0; y < gameGrid.length; y++) {
        for (let x = 0; x < gameGrid[y].length; x++) {
          const unit = gameGrid[y][x]?.unit;

          if (!unit || !unit.selected || !unit.moves) continue;

          // Possible movement locations in blue.
          fillTiles(ctx, unit.moves, "rgba(30, 144, 255, 0.50)");

          // Build lookup sets so overlapping ranges can be prioritized.
          const moveKeys = new Set(
            unit.moves.map(tile => `${tile.x},${tile.y}`)
          );

          const attackKeys = new Set(
            (unit.attackRange ?? []).map(
              tile => `${tile.x},${tile.y}`
            )
          );

          // Staff range only appears outside movement and attack range.
          // Red attack tiles take priority over green staff tiles.
          const staffOnlyTiles = (unit.staffRange ?? []).filter(tile => {
            const key = `${tile.x},${tile.y}`;

            return !moveKeys.has(key) && !attackKeys.has(key);
          });

          // Possible staff locations in green.
          fillTiles(
            ctx,
            staffOnlyTiles,
            "rgba(30, 200, 70, 0.50)"
          );

         // Attack squares only appear beyond the movement squares.
          const attackOnlyTiles = (unit.attackRange ?? []).filter(tile =>
            !moveKeys.has(`${tile.x},${tile.y}`) &&
            !(tile.x === x && tile.y === y)
          );

          drawAttackTiles(ctx, attackOnlyTiles);

          // Highlight selected unit.
          ctx.strokeStyle = "cyan";
          ctx.lineWidth = 2;

          ctx.strokeRect(
            x * TILE_SIZE + 5,
            y * TILE_SIZE + 5,
            TILE_SIZE - 10,
            TILE_SIZE - 10
          );
        }
      }
    }
    
        // Tiles a phantom can be summoned onto.
    if (summonTiles.length > 0) {
      fillTiles(ctx, summonTiles, "rgba(170, 60, 220, 0.55)");
    }

    // ==========================================
    // PASS 2: BALLISTAE (under units that share the tile)
    // ==========================================

    // Tiles where an occupied ballista was actually drawn. Pass 3 skips
    // the crew on these, so the ballista art replaces the unit.
    const hiddenCrew = new Set();

    for (let y = 0; y < gameGrid.length; y++) {
      for (let x = 0; x < gameGrid[y].length; x++) {
        const tile = gameGrid[y][x];
        const ballista = tile?.ballista;
        if (!ballista) continue;

        const crew = tile.unit?.inBallista ? tile.unit : null;

        // The occupied ballista takes on the crew's team colour, used
        // (grey) state, status, selection and attack lunge.
        const fake = crew
          ? {
              className: ballista.name,
              team: crew.team,
              hasMoved: crew.hasMoved,
              selected: crew.selected,
              status: crew.status
            }
          : {
              className: /killer/i.test(ballista.name)
                ? "EmptyKillerBallista"
                : "EmptyBallista",
              team: 3,
              hasMoved: false,
              selected: false
            };

        const lunging = crew && battleAnimation?.attacker === crew;

        const drawn = drawUnitSprite(
          ctx,
          fake,
          x,
          y,
          lunging ? (battleAnimation.offsetX ?? 0) : 0,
          lunging ? (battleAnimation.offsetY ?? 0) : 0
        );

        if (drawn && crew) hiddenCrew.add(`${x},${y}`);
      }
    }

    // ==========================================
    // PASS 3: UNITS (drawn on top of ballistae)
    // ==========================================

    for (let y = 0; y < gameGrid.length; y++) {
      for (let x = 0; x < gameGrid[y].length; x++) {
        const unit = gameGrid[y][x]?.unit;

        if (!unit) continue;
        // A crewed ballista is already drawn in Pass 2 in place of the unit.
        if (hiddenCrew.has(`${x},${y}`)) continue;

        // Only the attacker receives a drawing offset.
        let offsetX = 0;
        let offsetY = 0;

        if (battleAnimation?.attacker === unit) {
          offsetX = battleAnimation.offsetX ?? 0;
          offsetY = battleAnimation.offsetY ?? 0;
        }
        if (drawUnitSprite(ctx, unit, x, y, offsetX, offsetY)) continue;

        const px =
          x * TILE_SIZE + TILE_SIZE / 2 + offsetX;

        const py =
          y * TILE_SIZE + TILE_SIZE / 2 + offsetY;

        const unitColor = TEAM_COLORS[unit.team];

        ctx.fillStyle = appearsUsed(unit) ? "#777777" : unitColor;

        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.lineWidth = 3;
        ctx.strokeStyle = "black";

        ctx.strokeText(unit.icon, px, py);
        ctx.fillText(unit.icon, px, py);
      }
    }

    // ==========================================
    // COMBAT RESULT TEXT
    // ==========================================

    // ==========================================
    // SCREEN-SPACE TEXT (fixed size at any zoom)
    // ==========================================

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const zoom = getScale();

    if (battleAnimation?.outcomeText) {
      // Terrain strikes (and unit strikes) carry a fixed target tile.
      // Calling getUnitPosition(undefined) would match an empty tile,
      // so only look up a defender when there is one.
      const defenderPosition =
        battleAnimation.targetPosition ??
        (battleAnimation.defender
          ? getUnitPosition(battleAnimation.defender)
          : null);

      if (defenderPosition) {
        const spot = tileToScreen(defenderPosition.x, defenderPosition.y);
        const px = spot.x + spot.size / 2;
        const py = spot.y + spot.size / 2;

        ctx.font = "bold 18px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        ctx.lineWidth = 3;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "#FF2222";

        ctx.strokeText(battleAnimation.outcomeText, px + 12 * zoom, py - 15 * zoom);
        ctx.fillText(battleAnimation.outcomeText, px + 12 * zoom, py - 15 * zoom);
      }
    }

    // Skill alerts (SURE SHOT, PIERCE, ...) above their units.
    // Several alerts on one unit stack upward.
    const stacked = new Map();

    for (const alert of skillAlerts) {
      const alertPosition = getUnitPosition(alert.unit);

      if (!alertPosition) continue;

      const spot = tileToScreen(alertPosition.x, alertPosition.y);

      // Skip units that are off screen.
      if (
        spot.x + spot.size < 0 || spot.x > canvasWidth ||
        spot.y + spot.size < 0 || spot.y > canvasHeight
      ) {
        continue;
      }

      const level = stacked.get(alert.unit) ?? 0;
      stacked.set(alert.unit, level + 1);

      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "black";
      ctx.fillStyle = alert.color ?? "#ffdf55";

      const alertX = Math.max(
        60,
        Math.min(canvasWidth - 60, spot.x + spot.size / 2)
      );

      // Moves down the screen instead if there's no room above the unit.
      const above = spot.y - 10 - level * 24;
      const alertY = above >= 14
        ? above
        : spot.y + spot.size + 14 + level * 24;

      ctx.strokeText(alert.text, alertX, alertY);
      ctx.fillText(alert.text, alertX, alertY);
    }

    // Draw battle and EXP displays.
    this.drawBattleStatus();
    this.drawTerrainStatus();
    this.drawExpAnimation();
  }
};
 