import { gameGrid, rules, TEAM_NAMES, TEAM_COLORS } from "./gameState.js";
import { pushInputContext, popInputContext } from "./input.js";

// ==========================================
// WIN RULES
// ==========================================
// The rules come from the map (WIN_RULES in a map file, see gameState.js):
//   rules.win.fortPercent    % of all forts and caves a team must hold
//   rules.win.throneCapture  capturing a contender's throne wins
//   rules.win.contenders     the teams that can win

// ==========================================
// STATE
// ==========================================

let gameOver = null;       // { winner, reason, detail } once the game ends
let overlay = null;
let inputContext = null;

export const isGameOver = () => gameOver !== null;
export const getGameResult = () => gameOver;

const isContender = team => rules.win.contenders.includes(team);

export function resetVictory() {
  gameOver = null;

  if (inputContext) {
    popInputContext(inputContext);
    inputContext = null;
  }

  overlay?.remove();
  overlay = null;
}

// ==========================================
// FORT COUNTING
// ==========================================

// { total, counts: { team: forts and caves held } } for the whole map.
// Caves count like forts. A destroyed cave is a Peak, so it drops out of
// the total (and out of its owner's count).
export function countForts() {
  const counts = {};
  let total = 0;

  for (const row of gameGrid) {
    for (const tile of row) {
      if (tile?.name !== "Fort" && tile?.name !== "Cave") continue;

      total++;

      if (tile.owner != null) {
        counts[tile.owner] = (counts[tile.owner] ?? 0) + 1;
      }
    }
  }

  return { total, counts };
}

// ==========================================
// FORT VICTORY
// ==========================================

// Returns a result object, or null. `preferTeam` is checked first, so if a
// low percentage lets several teams qualify, the one who just acted wins.
export function checkFortVictory(preferTeam = null) {
  const percent = rules.win.fortPercent;

  if (!percent) return null;   // this win condition is off for the map

  const { total, counts } = countForts();

  if (total === 0) return null;

  const order = [...rules.win.contenders].sort(
    (a, b) => (b === preferTeam) - (a === preferTeam)
  );

  for (const team of order) {
    const held = counts[team] ?? 0;

    // Integer math, so 10 of 15 at 66% has no rounding trouble.
    if (held * 100 >= total * percent) {
      return {
        winner: team,
        reason: "forts",
        detail: `Holds ${held} of ${total} forts and caves (${percent}% needed).`
      };
    }
  }

  return null;
}

// ==========================================
// THRONE VICTORY
// ==========================================

// A throne changed hands. Only a contender taking another contender's
// throne counts, and only if the map allows it.
export function checkThroneVictory(tile, previousOwner, newOwner) {
  if (!rules.win.throneCapture) return null;
  if (tile?.name !== "Throne") return null;
  if (previousOwner === newOwner) return null;
  if (!isContender(previousOwner) || !isContender(newOwner)) return null;

  return {
    winner: newOwner,
    reason: "throne",
    detail: `Captured the ${TEAM_NAMES[previousOwner]} throne.`
  };
}

// ==========================================
// GAME OVER SCREEN
// ==========================================

function showGameOver(result) {
  overlay = document.createElement("div");
  overlay.id = "victoryScreen";

  const box = document.createElement("div");
  box.className = "victory-box";

  const title = document.createElement("h1");
  title.className = "victory-title";
  title.textContent = `${TEAM_NAMES[result.winner]} wins!`;
  title.style.color = TEAM_COLORS[result.winner] ?? "inherit";

  const detail = document.createElement("p");
  detail.className = "victory-detail";
  detail.textContent = result.detail;

  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.textContent = "MAIN MENU";
  menuButton.addEventListener("click", () => location.reload());

  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.textContent = "VIEW MAP";
  viewButton.addEventListener("click", () => {
    const small = overlay.classList.toggle("victory-minimized");
    viewButton.textContent = small ? "SHOW RESULT" : "VIEW MAP";
  });

  box.append(title, detail, viewButton, menuButton);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Freeze the board. Select returns to the main menu.
  inputContext = pushInputContext({
    up() {}, down() {}, left() {}, right() {}, back() {}, lt() {}, rt() {},
    select: () => menuButton.click()
  });
}

function endGame(result) {
  if (gameOver) return;

  gameOver = result;
  showGameOver(result);
}

// ==========================================
// PUBLIC HOOKS
// ==========================================

// Call after a Fort or Throne changes owner.
export function reportCapture(tile, previousOwner, newOwner) {
  if (gameOver) return gameOver;

  const result =
    checkThroneVictory(tile, previousOwner, newOwner) ??
    checkFortVictory(newOwner);

  if (result) endGame(result);

  return result;
}

// Call after a Cave is destroyed: the total shrinks, which can push a team
// over the line.
export function reportDestroyed(team) {
  if (gameOver) return gameOver;

  const result = checkFortVictory(team);

  if (result) endGame(result);

  return result;
}

// Call after loading a save, in case it is already decided.
export function checkVictory() {
  if (gameOver) return gameOver;

  const result = checkFortVictory();

  if (result) endGame(result);

  return result;
}
