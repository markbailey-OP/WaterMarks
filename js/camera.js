import { gameGrid, gameCursor } from "./gameState.js";
import { TILE_SIZE } from "./map.js";

// ==========================================
// SETTINGS (tweak these)
// ==========================================

// The canvas is always this many tiles across at x1 (20 x 40 = 800 px).
export const VIEW_TILES = 20;
export const VIEW_SIZE = VIEW_TILES * TILE_SIZE;

// The cursor stays at least this many tiles from the screen edge,
// unless the map itself ends there.
export const SCROLL_MARGIN = 3;

export const ZOOM_LEVELS = [
  { id: "0.25", label: "x0.25", scale: 0.25 },
  { id: "0.5", label: "x0.5", scale: 0.5 },
  { id: "0.75", label: "x0.75", scale: 0.75 },
  { id: "1", label: "x1", scale: 1 },
  { id: "1.25", label: "x1.25", scale: 1.25 },
  { id: "1.5", label: "x1.5", scale: 1.5 },
  { id: "2", label: "x2", scale: 2 }
];

const STORAGE_KEY = "waterMarks.zoom";

// ==========================================
// STATE
// ==========================================

let zoomIndex = 1;
let camX = 0;   // top-left visible tile, in tiles (negative = centred small map)
let camY = 0;
let lastX = null;   // cursor tile the camera last followed
let lastY = null;

function loadZoom() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const index = ZOOM_LEVELS.findIndex(level => level.id === saved);

    if (index !== -1) zoomIndex = index;
  } catch {
    // Blocked storage: keep the default.
  }
}

loadZoom();

export const getZoomLevel = () => ZOOM_LEVELS[zoomIndex];
export const getScale = () => ZOOM_LEVELS[zoomIndex].scale;

// Tiles visible across (and down) at the current zoom: 40, 20, 10 or 5.
export const viewTiles = () => VIEW_SIZE / (TILE_SIZE * getScale());

function mapSize() {
  let cols = 0;

  for (const row of gameGrid) cols = Math.max(cols, row.length);

  return { cols, rows: gameGrid.length };
}

// ==========================================
// CAMERA MATH
// ==========================================

// Keeps the view on the map. A map smaller than the view is centred.
function clampAxis(cam, view, total) {
  if (total <= view) return -(view - total) / 2;

  return Math.max(0, Math.min(cam, total - view));
}

function followAxis(cam, pos, view, total) {
  if (total <= view) return clampAxis(cam, view, total);

  let c = Math.max(0, Math.min(Math.round(cam), total - view));

  if (pos < c || pos > c + view - 1) {
    c = pos - Math.floor(view / 2);                  // jumped off screen: centre
  } else if (pos - c < SCROLL_MARGIN) {
    c = pos - SCROLL_MARGIN;
  } else if (pos - c > view - 1 - SCROLL_MARGIN) {
    c = pos - (view - 1 - SCROLL_MARGIN);
  }

  return clampAxis(c, view, total);
}

// Call every frame. Only does work when the cursor changed tiles.
export function followCursor(cursor) {
  if (!cursor || (cursor.x === lastX && cursor.y === lastY)) return;

  lastX = cursor.x;
  lastY = cursor.y;

  const view = viewTiles();
  const { cols, rows } = mapSize();

  camX = followAxis(camX, cursor.x, view, cols);
  camY = followAxis(camY, cursor.y, view, rows);
}

// A tap put the cursor on a visible tile: don't scroll for it.
export function acknowledgeCursor(x, y) {
  lastX = x;
  lastY = y;
}

export function resetCamera() {
  camX = 0;
  camY = 0;
  lastX = null;
  lastY = null;
}

function recenter() {
  const view = viewTiles();
  const { cols, rows } = mapSize();
  const pos = gameCursor ?? { x: 0, y: 0 };

  camX = clampAxis(pos.x - Math.floor(view / 2), view, cols);
  camY = clampAxis(pos.y - Math.floor(view / 2), view, rows);
  lastX = pos.x;
  lastY = pos.y;
}

// ==========================================
// ZOOM
// ==========================================

export function setZoom(id) {
  const index = ZOOM_LEVELS.findIndex(level => level.id === id);

  if (index === -1) return false;

  zoomIndex = index;
  recenter();

  try {
    localStorage.setItem(STORAGE_KEY, ZOOM_LEVELS[index].id);
  } catch {
    // Storage can be blocked; the zoom still applies this session.
  }

  return true;
}

export function cycleZoom() {
  const next = ZOOM_LEVELS[(zoomIndex + 1) % ZOOM_LEVELS.length];

  setZoom(next.id);

  return next;
}

// ==========================================
// DRAWING AND HIT-TESTING
// ==========================================

// After this, drawing in world pixels (TILE_SIZE per tile) lands on screen.
export function applyCamera(ctx) {
  const s = getScale();

  ctx.setTransform(s, 0, 0, s, -camX * TILE_SIZE * s, -camY * TILE_SIZE * s);
}

// Top-left of a tile in canvas pixels, plus its on-screen size.
export function tileToScreen(x, y) {
  const size = TILE_SIZE * getScale();

  return { x: (x - camX) * size, y: (y - camY) * size, size };
}

// Canvas pixels to a tile. May be off the map; the caller checks bounds.
export function screenToTile(px, py) {
  const size = TILE_SIZE * getScale();

  return {
    x: Math.floor(px / size + camX),
    y: Math.floor(py / size + camY)
  };
}