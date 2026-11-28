import {
  gameGrid,
  setGameCursor,
  advanceTime,
  time,
  side,
  updateTurnDisplay,
  setRules,
  setTurnState,
  getFirstTeam
} from "./gameState.js";
import { 
  buildMap, 
  loadMap, 
  STARTING_UNITS, 
  TILE_SIZE,
  MAP_RULES
} from "./map.js";
import { 
  myGameArea, 
  setMapDirty } 
from "./gameArea.js";
import { 
  raiseToLevel, 
  WEAPON_RANK_THRESHOLDS } 
from "./exp.js";
import {
  assignHome,
  assignFortIndexes,
  createSpawn,
  recordPromotion,
  recordUnitLevel,
  isSpawner
} from "./strongholds.js";
import { 
  isCpuSide, 
  runCpuTurn,
  rollPromotionShop,
  setControllers
} from "./cpu.js";
import { 
  pickSaveFile, 
  restoreGame } 
from "./saveGame.js";
import {
  showTitleScreen,
  hideTitleScreen
} from "./menus/titleScreen.js";
import {
  staffTargets,
  setSelectedStaffTarget
} from "./menus/staffState.js";
import {
  setBaseInputHandlers,
  handleInput
} from "./input.js";
import {
  resetVictory,
  checkVictory,
  isGameOver
} from "./victory.js";
import {
  followCursor,
  acknowledgeCursor,
  screenToTile
} from "./camera.js";
import * as Units from "./units.js";
import * as Items from "./items/index.js";
import { updateUnitInfo } from "./unitInfo.js";
import { loadTileset } from "./tileset.js";
import { giveLuckyWeapon } from "./luckyWeapon.js";
import { loadSprites } from "./sprites.js";
import { applySavedTheme } from "./settings.js";
import { endTurn } from "./menus/turnMenu.js";
import { equipNextAvailableWeapon } from "./inventory.js";
import { Cursor } from "./cursor.js";
import { updateTileInfo } from "./tileInfo.js";

// Created when a game starts (after the title screen).
let gameCursor = null;
let canvasListenerAttached = false;

// ==========================================
// STARTING UNITS (new game only)
// ==========================================

function setStartingRanks(unit, ranks = {}) {
  for (const [type, rank] of Object.entries(ranks)) {
    unit.weaponRanks[type] = rank;
    unit[type] = rank;
    unit.weaponExp[type] = Math.max(
      unit.weaponExp[type] ?? 0,
      WEAPON_RANK_THRESHOLDS[rank] ?? 0
    );
  }
}

// Replaces the inventory with exactly these item class names.
function setStartingItems(unit, entries) {
  unit.inventory = [];
  unit.equippedWeapon = null;

  for (const entry of entries) {
    const { name, ...props } =
      typeof entry === "string" ? { name: entry } : entry;

    const ItemClass = Items[name];

    if (typeof ItemClass !== "function") {
      console.error(`Unknown item: ${name}`);
      continue;
    }

    const item = new ItemClass();
    Object.assign(item, props);   // e.g. plunder: true
    unit.inventory.push(item);
  }

  equipNextAvailableWeapon(unit);
}

// Place starting units using their class names.
function placeStartingUnits() {
  for (const start of STARTING_UNITS) {
    const {
      x, y, unit, team, exp, hp, level, ai,
      promotedFrom, fromLevel, items, ranks
    } = start;

    const UnitClass = Units[unit];

    if (typeof UnitClass !== "function") {
      console.error(`Unknown unit class: ${unit}`);
      continue;
    }

    if (!gameGrid[y]?.[x]) {
      console.error(`Invalid starting position: (${x}, ${y})`);
      continue;
    }

    if (!gameGrid[y][x].traversable) {
      console.error(`Starting position is impassable: (${x}, ${y})`);
      continue;
    }

    if (gameGrid[y][x].unit) {
      console.error(`Starting position already occupied: (${x}, ${y})`);
      continue;
    }

    // Create the unit.
    let newUnit;

    if (promotedFrom) {
      // Base class at fromLevel, promotion gains, then levelled in the new class.
      newUnit = createSpawn(
        unit, team, level ?? 1,
        { from: promotedFrom, fromLevel }
      );

      if (!newUnit) {
        console.error(`Could not build ${unit} from ${promotedFrom}`);
        continue;
      }
    } else {
      newUnit = new UnitClass(team);
      if (level !== undefined) raiseToLevel(newUnit, level);
    }

    // Ranks before items, so the right weapon gets equipped.
    if (ranks) setStartingRanks(newUnit, ranks);
        if (items) setStartingItems(newUnit, items);
    else giveLuckyWeapon(newUnit);

    if (ai) newUnit.ai = ai;

    if (exp !== undefined) newUnit.exp = exp;

    if (hp !== undefined) {
      newUnit.hp = Math.min(hp, newUnit.maxHp);
    }

    // Place the unit on the map.
    gameGrid[y][x].unit = newUnit;
    assignHome(newUnit, x, y);

	// A starting fort or cave only reinforces its starting unit type.
	const startTile = gameGrid[y][x];
	
	if (isSpawner(startTile)) {
	  startTile.availableUnits = [newUnit.className];
	}

    // Record the promotion and level at the home fort.
    if (promotedFrom) {
      recordPromotion(newUnit, promotedFrom, fromLevel);
      recordUnitLevel(newUnit);
    }
  }
}

// ==========================================
// GAME LOOP
// ==========================================

function updateGameArea() {
  followCursor(gameCursor);
  myGameArea.clear();
  myGameArea.drawMap();
  gameCursor.update(time, myGameArea.context);
  myGameArea.drawUnits();
  updateTileInfo(gameCursor);
  updateUnitInfo(gameCursor);
  advanceTime();
}

// Runs once the map and units exist, whether new or loaded.
function beginPlay(cursorStart = null) {
  resetVictory();   
  gameCursor = new Cursor(cursorStart?.x ?? 5, cursorStart?.y ?? 5);
  setGameCursor(gameCursor);

  hideTitleScreen();
  document.getElementById("gameScreen").style.display = "block";

  myGameArea.start(updateGameArea);
  attachCanvasListener();
  updateTurnDisplay();
  
  checkVictory();

  // A save made on a side that is now CPU-controlled picks up here.
  if (!isGameOver() && isCpuSide(side)) {           // CHANGED
    runCpuTurn(side).finally(endTurn);
  }
}

async function startNewGame(mapId, humanTeams = [1]) {
  await loadMap(mapId);

  setRules(MAP_RULES);               // rosters and win rules from the map
  setControllers(humanTeams);

  buildMap();
  assignFortIndexes();
  placeStartingUnits();

  setTurnState(1, getFirstTeam());   // first team that has anything on the map
  beginPlay();
}

// Resolves quietly if the player cancels the picker; throws on a bad file.
async function loadSavedGame() {
  const data = await pickSaveFile();

  if (!data) return;

  restoreGame(data);
  beginPlay(data.cursor);
}

// ==========================================
// INPUT
// ==========================================

function attachCanvasListener() {
  if (canvasListenerAttached) return;

  const canvas = document.getElementById("gameCanvas");

  if (!canvas) return;

  canvasListenerAttached = true;

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;

    const { x: tileX, y: tileY } = screenToTile(clientX, clientY);

    if (
      tileY < 0 ||
      tileY >= gameGrid.length ||
      tileX < 0 ||
      tileX >= (gameGrid[tileY]?.length ?? 0)
    ) {
      return;
    }

    // If already on this tile, select
    if (gameCursor.x === tileX && gameCursor.y === tileY) {
      handleInput("select");
        } else {
      gameCursor.x = tileX;
      gameCursor.y = tileY;
      gameCursor.pixlX = tileX * TILE_SIZE;
      gameCursor.pixlY = tileY * TILE_SIZE;
      acknowledgeCursor(tileX, tileY);   // a tap never scrolls the map

      if (gameCursor.isChoosingAttackTarget()) {
        handleInput("select");
      } else if (gameCursor.isChoosingStaffTarget()) {
        const target = staffTargets.find(t => t.x === tileX && t.y === tileY);
        if (target) {
          setSelectedStaffTarget(target);
          handleInput("select");
        }
      }
    }
  });
}

// Attached once at startup so the title screen can use the keyboard too.
function attachKeyboard() {
  if (window._feKeyboardAttached) return;

  window._feKeyboardAttached = true;

  window.addEventListener("keydown", (e) => {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
      return;
    }

    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        handleInput("up");
        e.preventDefault();
        break;
      case "ArrowDown":
      case "s":
      case "S":
        handleInput("down");
        e.preventDefault();
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        handleInput("left");
        e.preventDefault();
        break;
      case "ArrowRight":
      case "d":
      case "D":
        handleInput("right");
        e.preventDefault();
        break;
      case " ":
      case "Enter":
        handleInput("select");
        e.preventDefault();
        break;
      case "Escape":
      case "z":
      case "Z":
      case "Backspace":
        handleInput("back");
        e.preventDefault();
        break;
      case "q":
      case "Q":
        handleInput("lt");
        e.preventDefault();
        break;
      case "e":
      case "E":
        handleInput("rt");
        e.preventDefault();
        break;
    }
  });
}

// ==========================================
// BUTTON CLICKS (no inline onclick, so a strict CSP works)
// ==========================================

function attachClickActions() {
  document.addEventListener("click", event => {
    const element = event.target.closest("[data-input]");

    if (!element) return;

    handleInput(element.dataset.input);
  });
}

// ==========================================
// BOOT: THE TITLE SCREEN COMES FIRST
// ==========================================

function boot() {
  loadSprites();
  applySavedTheme();

  setBaseInputHandlers({
    up: () => gameCursor?.move("up"),
    down: () => gameCursor?.move("down"),
    left: () => gameCursor?.move("left"),
    right: () => gameCursor?.move("right"),
    select: () => gameCursor?.select(),
    back: () => gameCursor?.back(),
    lt: () => gameCursor?.jumpToUnit(-1),
    rt: () => gameCursor?.jumpToUnit(1)
  });

  attachKeyboard();
  attachClickActions();
  loadTileset().then(loaded => {
    if (loaded) setMapDirty(true);
  });

  showTitleScreen({
    onNewGame: startNewGame,
    onLoadGame: loadSavedGame
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
