import {
  sel,
  side,
  turn,
  TEAM_NAMES,
  endCurrentSide,
  resetUnitsForNewSide,
  updateGoldDisplay
} from "../gameState.js";
import {
  getActiveAttack,
  getPendingMove
} from "./attackState.js";
import {
  tickThrones,
  spawnReinforcements,
  setCpuQueues
} from "../strongholds.js";
import { 
  isCpuSide, 
  runCpuTurn } 
from "../cpu.js";
import { 
  tickSleep, 
  applyPoison, 
  decayTempRes 
} from "../status.js";
import { isGameOver } from "../victory.js";


// ==========================================
// TURN MANAGEMENT
// ==========================================

export function endTurn() {
	if (isGameOver()) return;
  // Do not end the turn while a unit is selected, a move is
  // waiting for confirmation, or an attack is in progress.
  if (sel.bool || getPendingMove() || getActiveAttack()) return;

  tickThrones(side);          // the side that is ending
  tickSleep(side);            // its sleepers count down
  resetUnitsForNewSide();
  endCurrentSide();

  // CPU forts choose their queue before reinforcements spawn.
  if (isCpuSide(side)) setCpuQueues(side);
  spawnReinforcements(side);  // the side that is starting
  applyPoison(side);          // its poisoned units lose HP
  decayTempRes(side);         // its Pure Water bonuses drop by 1

  document.getElementById("turnCounter").textContent =
    `Turn: ${turn}`;

  document.getElementById("sideCounter").textContent =
    `Side: ${TEAM_NAMES[side]}`;

  updateGoldDisplay();

  // The CPU plays its units, then ends its own turn.
  if (isCpuSide(side)) {
    runCpuTurn(side).finally(endTurn);
  }
}