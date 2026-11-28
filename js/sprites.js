import { SPRITES } from "./spriteData.js";
import { TILE_SIZE } from "./map.js";
import { gameCursor, side } from "./gameState.js";
import { animMs } from "./settings.js";
import { sleep } from "./utils.js";
import { 
  appearsUsed, 
  isImmobile } 
from "./status.js";

// ==========================================
// SETTINGS
// ==========================================

export const SPRITESHEET_SRC = "./assets/sprites.png";

// Milliseconds per frame. Walking loops top to bottom; idle and selected
// bounce (a, b, c, b).
const STAND_MS = 500;    // idle (3 frames)
const SELECT_MS = 260;   // cursor on a unit, or unit selected (3 frames)
const WALK_MS = 150;      // walking (4 frames)

// Time to cross one tile. Follows the Animation / CPU Anim speed setting;
// "Instant" skips the walk.
const MOVE_MS_PER_TILE = 240;

// Sprite size on the map: pixels per sheet pixel. 2.5 fills a 40 px tile
// exactly (TILE_SIZE / 16); lower is smaller. The feet stay at the bottom
// centre of the tile; nudge with the offsets (in screen pixels).
const SPRITE_SCALE = 2.2;
const SPRITE_OFFSET_X = 0;
const SPRITE_OFFSET_Y = 0;

// Set to true to also animate units that have already acted.
const SELECT_ANIM_ON_USED_UNITS = false;

// The sheet's colour legend (Ally, Enemy, Neutral, Used, Arena Grey rows).
// Colours are read from the sheet itself, so editing the legend recolors
// the game too. Swatch 0 is the transparent background.
const LEGEND = { x: 53, y: 7382, step: 8, rowStep: 15, count: 16 };
const PALETTE_ROWS = { ally: 0, enemy: 1, neutral: 2, used: 3, arena: 4 };

// Team number -> palette row.
const TEAM_PALETTE = { 1: "ally", 2: "enemy", 3: "neutral", 4: "purple" };

// ==========================================
// CLASS -> SHEET NAME
// ==========================================

// Class name -> sprite name on the sheet (male versions only).
const CLASS_SPRITES = {
  Lord: ["Lord (Ephraim)"],
  GreatLord: ["Great Lord (Ephraim)"],
  Dancer: ["Dancer"],

  Trainee: ["Man"],
  Recruit: ["Recruit"],
  Pupil: ["Pupil"],
  Journeyman: ["Journeyman"],

  Soldier: ["Soldier"],
  Cavalier: ["Cavalier"],
  Paladin: ["Paladin"],
  GreatKnight: ["Great Knight"],
  Knight: ["Knight"],
  General: ["General"],

  Mercenary: ["Mercenary"],
  Hero: ["Hero M"],
  Myrmidon: ["Myrmidon M"],
  Swordmaster: ["Swordmaster M"],
  Assassin: ["Assassin M"],
  Thief: ["Thief"],
  Rogue: ["Rogue"],

  Archer: ["Archer M"],
  Sniper: ["Sniper M"],
  Ranger: ["Ranger"],

  // Occupied ballistae (sheet art under Necromancer / Pontifex).
  Ballista: ["Ballista"],
  "Iron Ballista": ["Ballista"],
  "Killer Ballista": ["Killer Ballista"],
  // Unoccupied ballistae.
EmptyBallista: ["Empty Ballista"],
EmptyKillerBallista: ["Empty Killer Ballista"],

  Fighter: ["Fighter"],
  Warrior: ["Warrior"],
  Brigand: ["Brigand"],
  Pirate: ["Pirate"],
  Berserker: ["Berserker"],

  PegasusKnight: ["Pegasus Knight"],
  Falcoknight: ["Falcon Knight"],
  WyvernRider: ["Wyvern Rider"],
  WyvernLord: ["Wyvern Lord"],
  WyvernKnight: ["Wyvern Knight"],

  Mage: ["Mage M"],
  Sage: ["Sage M"],
  MageKnight: ["Mage Knight M"],
  Monk: ["Monk"],
  Priest: ["Priest"],
  Cleric: ["Cleric"],
  Bishop: ["Bishop M"],
  Shaman: ["Shaman"],
  Druid: ["Druid"],
  Summoner: ["Summoner"],
  Troubadour: ["Troubadour"],
  Valkyrie: ["Valkyrie"],
  Necromancer: ["Necromancer"],

  Phantom: ["Phantom"],
  Manakete: ["Manakete (Morva)"],

  Revenant: ["Revenant"],
  Entombed: ["Entombed"],
  Bonewalker: ["Bonewalker (Sword)"],
  Wight: ["Wight (Sword)"],
  Bael: ["Bael"],
  ElderBael: ["Elder Bael"],
  Cyclops: ["Cyclops"],
  MautheDoog: ["Mauthedoog"],
  Gwyllgi: ["Gwyllgi"],
  Tarvos: ["Tarvos"],
  Maelduin: ["Maelduin"],
  Mogall: ["Mogall"],
  ArchMogall: ["Arch Mogall"],
  GorgonEgg: ["Gorgon Egg"],
  Gorgon: ["Gorgon"],
  Gargoyle: ["Gargoyle"],
  Deathgoyle: ["Deathgoyle"],
  DracoZombie: ["Draco Zombie"],
  DemonKing: ["Demon King"]
};

// ==========================================
// LOADING AND RECOLORING
// ==========================================

let ready = false;
let loading = null;
let baseImage = null;      // ImageData of the whole sheet
let palettes = null;       // name -> [[r, g, b] x 16]
const sheets = new Map();  // palette name -> canvas, built on first use

const colorKey = ([r, g, b]) => (r << 16) | (g << 8) | b;

function readPalette(row) {
  const { data, width } = baseImage;
  const y = LEGEND.y + LEGEND.rowStep * row + 4;
  const colors = [];

  for (let i = 0; i < LEGEND.count; i++) {
    const offset = (y * width + LEGEND.x + LEGEND.step * i + 4) * 4;

    colors.push([data[offset], data[offset + 1], data[offset + 2]]);
  }

  return colors;
}

// A copy of the sheet drawn in another palette, background transparent.
function buildSheet(name) {
  const { data, width, height } = baseImage;
  const from = palettes.ally;
  const to = palettes[name] ?? from;

  const lookup = new Map();

  from.forEach((color, index) => {
    if (index > 0) lookup.set(colorKey(color), to[index]);
  });

  const transparent = colorKey(from[0]);
  const pixels = new Uint8ClampedArray(data);

  for (let i = 0; i < pixels.length; i += 4) {
    const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];

    if (key === transparent) {
      pixels[i + 3] = 0;
      continue;
    }

    const swap = lookup.get(key);

    if (swap) {
      pixels[i] = swap[0];
      pixels[i + 1] = swap[1];
      pixels[i + 2] = swap[2];
    }
  }

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").putImageData(new ImageData(pixels, width, height), 0, 0);

  return canvas;
}

function getSheet(name) {
  if (!sheets.has(name)) sheets.set(name, buildSheet(name));

  return sheets.get(name);
}

// Resolves true when the sprites are usable, false if the sheet is missing
// (the game then keeps drawing the text icons).
export function loadSprites() {
  if (ready) return Promise.resolve(true);
  if (loading) return loading;

  loading = (async () => {
    try {
      const response = await fetch(SPRITESHEET_SRC);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const bitmap = await createImageBitmap(await response.blob(), {
        premultiplyAlpha: "none",
        colorSpaceConversion: "none"
      });

      const canvas = document.createElement("canvas");

      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      ctx.drawImage(bitmap, 0, 0);
      baseImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

      palettes = {};

      for (const [name, row] of Object.entries(PALETTE_ROWS)) {
        palettes[name] = readPalette(row);
      }
      // Team 4 has no row on the sheet: the ally colours with red and green
  	// swapped into purple.
  	palettes.purple = palettes.ally.map(([r, g, b]) => [b, r, b]);

      ready = true;
      checkMapping();

      return true;
    } catch (error) {
      console.warn(`Sprite sheet not loaded (${SPRITESHEET_SRC}):`, error);

      return false;
    }
  })();

  return loading;
}

export function spritesReady() {
  return ready;
}

// Warns about class entries that point at a name missing from the sheet data.
function checkMapping() {
  for (const [className, names] of Object.entries(CLASS_SPRITES)) {
    for (const name of names) {
      if (!SPRITES[name]) console.warn(`No sprite "${name}" for ${className}.`);
    }
  }
}

// ==========================================
// CHOOSING A SPRITE
// ==========================================

function getSprite(unit) {
  const names = CLASS_SPRITES[unit.className];

  if (!names) return null;

  return SPRITES[names[0]] ?? null;
}

export function hasSprite(unit) {
  return Boolean(unit && CLASS_SPRITES[unit.className]);
}

function getPaletteName(unit) {
  return appearsUsed(unit) ? "used" : (TEAM_PALETTE[unit.team] ?? "ally");
}

// ==========================================
// WALKING ALONG A PATH
// ==========================================

// The unit itself is moved at once by the game logic. This only makes it
// look like it walks there.
const walks = new WeakMap();
let lastWalkEnd = 0;

// from: { x, y }. path: the result of findPath (or null).
export function startMoveAnimation(unit, from, path) {
  const steps = path?.points ?? [];
  const perTile = animMs(MOVE_MS_PER_TILE);

  if (!unit || steps.length === 0 || perTile <= 0) {
    if (unit) walks.delete(unit);
    return;
  }

  const start = performance.now();

  walks.set(unit, {
    points: [{ x: from.x, y: from.y }, ...steps],
    perTile,
    start
  });

  lastWalkEnd = Math.max(lastWalkEnd, start + perTile * steps.length);
}

// Resolves once every walk in progress has finished.
export function waitForMoves() {
  const remaining = lastWalkEnd - performance.now();

  return remaining > 0 ? sleep(remaining + 30) : Promise.resolve();
}

// Where the unit is drawn right now, or null if it is not walking.
// (x, y) is the tile the unit really stands on (the end of its path); a
// walk is dropped if the unit is no longer there, for example after BACK.
function getWalk(unit, x, y, now) {
  const walk = walks.get(unit);

  if (!walk) return null;

  const count = walk.points.length - 1;
  const last = walk.points[count];
  const progress = (now - walk.start) / walk.perTile;

  if (last.x !== x || last.y !== y || progress >= count) {
    walks.delete(unit);
    return null;
  }

  const index = Math.floor(progress);
  const fraction = progress - index;
  const a = walk.points[index];
  const b = walk.points[index + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  return {
    x: a.x + dx * fraction,
    y: a.y + dy * fraction,
    elapsed: now - walk.start,
    direction: dx < 0 ? "left" : dx > 0 ? "right" : dy > 0 ? "down" : "up"
  };
}

// ==========================================
// DRAWING
// ==========================================

const SCALE = SPRITE_SCALE;

// True while the cursor is on the tile, or the unit is selected.
function isHighlighted(unit, x, y) {
  if (unit.team !== side) return false;
    if ((unit.hasMoved 
      || isImmobile(unit)) 
      && !SELECT_ANIM_ON_USED_UNITS) return false;

  return (
    unit.selected === true ||
    (gameCursor?.x === x && gameCursor?.y === y)
  );
}

// pingPong: a, b, c, b, a, b, c, b ... instead of a, b, c, a, b, c.
function pickFrame(sprite, anim, clock, frameMs, pingPong = false) {
  const frames = sprite[anim]?.length ? sprite[anim] : sprite.stand;

  if (!frames?.length) return null;

  const tick = Math.floor(clock / frameMs);

  if (!pingPong || frames.length < 3) return frames[tick % frames.length];

  const cycle = frames.length * 2 - 2;
  const step = tick % cycle;

  return frames[step < frames.length ? step : cycle - step];
}

// Draws the unit's sprite on tile (x, y), plus an optional pixel offset
// (used by the attack lunge). Returns false if there is no sprite, so the
// caller can draw its text icon instead.
export function drawUnitSprite(ctx, unit, x, y, offsetX = 0, offsetY = 0) {
  if (!ready) return false;

  const sprite = getSprite(unit);

  if (!sprite) return false;

  const now = performance.now();
  const walk = getWalk(unit, x, y, now);

  let frame;
  let mirror = false;
  let tileX = x;
  let tileY = y;

  if (walk) {
    tileX = walk.x;
    tileY = walk.y;

    mirror = walk.direction === "right";   // right is the left walk flipped
    frame = pickFrame(
      sprite,
      mirror ? "left" : walk.direction,
      walk.elapsed,
      WALK_MS
    );
  } else if (isHighlighted(unit, x, y)) {
    frame = pickFrame(sprite, "select", now, SELECT_MS, true);
  } else {
    frame = pickFrame(sprite, "stand", now, STAND_MS, true);
  }

  if (!frame) return false;

  const [fx, fy, fw, fh, ax, ay] = frame;
  const sheet = getSheet(getPaletteName(unit));

  // The anchor (the unit's feet) goes at the bottom centre of the tile.
  const cx = Math.round(tileX * TILE_SIZE + TILE_SIZE / 2 + offsetX + SPRITE_OFFSET_X);
  const cy = Math.round(tileY * TILE_SIZE + TILE_SIZE + offsetY + SPRITE_OFFSET_Y);

  const width = Math.round(fw * SCALE);
  const height = Math.round(fh * SCALE);
  const top = Math.round(cy - ay * SCALE);

  ctx.imageSmoothingEnabled = false;

  if (mirror) {
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, fx, fy, fw, fh, Math.round(-ax * SCALE), top, width, height);
    ctx.restore();
  } else {
    ctx.drawImage(sheet, fx, fy, fw, fh, Math.round(cx - ax * SCALE), top, width, height);
  }

  return true;
}
