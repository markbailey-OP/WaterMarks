import { gameCursor } from "../gameState.js";
import { pushInputContext, popInputContext } from "../input.js";
import { setSummonTiles } from "../gameArea.js";
import { getSummonTiles, summonPhantom } from "../summon.js";
import { showToast } from "../utils.js";

// ==========================================
// STATE
// ==========================================

let inputContext = null;
let summoner = null;
let origin = null;
let onClose = null;
let tiles = [];
let index = 0;

// ==========================================
// INPUT
// ==========================================

// Tapping the map moves the cursor, so always read the cursor's tile.
function currentIndex() {
  const found = tiles.findIndex(
    tile => tile.x === gameCursor.x && tile.y === gameCursor.y
  );

  return found === -1 ? index : found;
}

function move(step) {
  if (tiles.length === 0) return;

  index = (currentIndex() + step + tiles.length) % tiles.length;
  gameCursor.moveToTarget(tiles[index]);
}

function selectOption() {
  const tile = tiles[currentIndex()];

  if (!tile || tile.x !== gameCursor.x || tile.y !== gameCursor.y) return;

  const phantom = summonPhantom(summoner, tile.x, tile.y);

  if (!phantom) {
    showToast("Can't summon there.");
    return;
  }

  showToast(`Summoned a Phantom (Lv ${phantom.lvl}).`);
  close(true);
}

const handlers = {
  up: () => move(-1),
  left: () => move(-1),
  down: () => move(1),
  right: () => move(1),
  select: () => selectOption(),
  back: () => close(false)
};

// ==========================================
// OPEN / CLOSE
// ==========================================

// The summoner stands at (x, y). done(true) means a phantom was summoned
// (the unit's action is over); done(false) means nothing happened.
// done is always called, including when the menu can't open.
export function openSummon(unit, x, y, done = null) {
  tiles = getSummonTiles(x, y);

  if (tiles.length === 0) {
    showToast("No room to summon.");
    done?.(false);
    return false;
  }

  summoner = unit;
  origin = { x, y };
  onClose = done;
  index = 0;

  setSummonTiles(tiles);
  gameCursor.moveToTarget(tiles[0]);

  if (inputContext) popInputContext(inputContext);
  inputContext = pushInputContext(handlers);

  return true;
}

function close(summoned) {
  if (inputContext) {
    popInputContext(inputContext);
    inputContext = null;
  }

  setSummonTiles([]);

  const callback = onClose;
  const home = origin;

  summoner = null;
  origin = null;
  onClose = null;
  tiles = [];

  if (home) gameCursor.moveToTarget(home);

  callback?.(summoned);
}