import {
  River,
  Snag,
  Wall,
  WeakWall,
  Plain,
  Sand,
  Floor,
  Bridge,
  Desert,
  Ruins,
  Lake,
  Forest,
  Mountain,
  Peak,
  Fort,
  Cave,
  Throne,
  ThroneBack,
  Shop
} from "./terrain.js";

import { gameGrid } from "./gameState.js";
import * as TerrainTypes from "./terrain.js";
import { MAPS } from "../maps/index.js";
import * as Items from "./items/index.js";

export let BALLISTAS = [];
export let HUMAN_TEAMS = [1, 2];

function createBallistaItem(name = "Ballista") {
  if (name === "Iron Ballista") return new Items.IronBallista();
  if (name === "Killer Ballista") return new Items.KillerBallista();
  return new Items.Ballista();
}

// Builds a fresh tile from its class name (used when loading a save).
export function createTerrainByName(name) {
  const TerrainClass = TerrainTypes[name];

  if (name === "Terrain" || typeof TerrainClass !== "function") {
    return new Plain();
  }

  return new TerrainClass();
}

export const TILE_SIZE = 40;

function createMapLayout(mapText) {
  return mapText
    .trim()
    .split("\n")
    .map(row => row.trim().split(/\s+/).join(""));
}

export let MAP_LAYOUT = [];
export let STRONGHOLD_OWNERS = [];
export let STARTING_UNITS = [];

export function getMapList() {
  return MAPS.map(({ id, name }) => ({ id, name }));
}

// Loads one map file into the three exports above.
export async function loadMap(id) {
  const entry = MAPS.find(map => map.id === id);

  if (!entry) throw new Error(`Unknown map: ${id}`);

  let data;

  try {
    data = await entry.load();
  } catch (error) {
    console.error("Map load failed:", error);
    throw new Error(`Could not load the map "${entry.name}".`);
  }

  for (const key of ["MAP_LAYOUT", "STRONGHOLD_OWNERS", "STARTING_UNITS"]) {
    if (!data[key]) throw new Error(`Map "${entry.name}" is missing ${key}.`);
  }

  MAP_LAYOUT = createMapLayout(data.MAP_LAYOUT);
  STRONGHOLD_OWNERS = data.STRONGHOLD_OWNERS;
  STARTING_UNITS = data.STARTING_UNITS;
  BALLISTAS = Array.isArray(data.BALLISTAS) ? data.BALLISTAS : [];
  HUMAN_TEAMS = Array.isArray(data.HUMAN_TEAMS) ? data.HUMAN_TEAMS : [1, 2];

  const widths = new Set(MAP_LAYOUT.map(row => row.length));
  if (widths.size > 1) throw new Error(`Map "${entry.name}" has uneven rows.`);

  const inside = (x, y) => MAP_LAYOUT[y]?.[x] !== undefined;
  for (const s of [...STRONGHOLD_OWNERS, ...STARTING_UNITS, ...BALLISTAS]) {
    if (!inside(s.x, s.y)) {
      throw new Error(`Map "${entry.name}": (${s.x}, ${s.y}) is outside the map.`);
    }
  }
}

export function createTerrain(symbol) {
  switch (symbol) {
    case "~": return new River();
    case "D": return new Desert();
    case "#": return new Wall();
    case "G": return new Snag();
    case "W": return new WeakWall();
    case ".": return new Plain();
    case "S": return new Sand();
    case "F": return new Floor();
    case "B": return new Bridge();
    case "R": return new Ruins();
    case "L": return new Lake();
    case "T": return new Forest();
    case "M": return new Mountain();
    case "P": return new Peak();
    case "C": return new Cave();
    case "O": return new Fort();
    case "H": return new Throne();
    case "h": return new ThroneBack();
    case "$": return new Shop();
    default: return new Plain();
  }
}

export function buildMap() {
  if (MAP_LAYOUT.length === 0) throw new Error("No map has been loaded.");

  gameGrid.length = 0;

  for (let y = 0; y < MAP_LAYOUT.length; y++) {
    gameGrid[y] = [];

    for (let x = 0; x < MAP_LAYOUT[y].length; x++) {
      gameGrid[y][x] = createTerrain(MAP_LAYOUT[y][x]);
    }
  }

  for (const { x, y, team } of STRONGHOLD_OWNERS) {
    const tile = gameGrid[y]?.[x];

    if (tile && "owner" in tile) tile.owner = team;
  }

  for (const entry of BALLISTAS) {
    const tile = gameGrid[entry.y]?.[entry.x];
    if (!tile) continue;
    tile.ballista = createBallistaItem(entry.type || entry.name || "Ballista");
  }
}
