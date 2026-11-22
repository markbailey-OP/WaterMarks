import { gameGrid } from "./gameState.js";
import { escapeHtml } from "./utils.js";
import { TEAM_NAMES } from "./gameState.js";

let lastKey = null;

// "WeakWall" -> "Weak Wall"
function formatName(name) {
  return String(name ?? "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function row(label, value) {
  return `
    <div class="tile-info-row">
      <strong>${label}</strong>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

// Refreshes the control-board tile panel for the tile under the cursor.
// Only touches the DOM when something actually changed.
export function updateTileInfo(cursor) {
  const element = document.getElementById("tileInfo");

  if (!element || !cursor) return;

  const tile = gameGrid[cursor.y]?.[cursor.x];

  if (!tile) return;

  const hasHp = Number.isFinite(tile.hp);
  const isFort = tile.name === "Fort";
  const isStronghold = isFort || tile.name === "Throne";
  const queue = isFort ? (tile.queue ?? []) : [];

  const key = [
    tile.name,
    hasHp ? tile.hp : "",
    hasHp ? tile.maxHp : "",
    tile.avd ?? 0,
    tile.def ?? 0,
    tile.owner ?? "",
    queue.join(",")
  ].join("|");

  if (key === lastKey) return;

  lastKey = key;

  const ownerName = TEAM_NAMES[tile.owner] ?? "None";

  element.innerHTML = `
    <h3 class="tile-info-name">${escapeHtml(formatName(tile.name))}</h3>

    <div class="tile-info-grid">
      ${hasHp ? row("HP", `${tile.hp}/${tile.maxHp ?? tile.hp}`) : ""}
      ${row("Avd", tile.avd ?? 0)}
      ${row("Def", tile.def ?? 0)}
      ${isStronghold ? row("Owner", ownerName) : ""}
      ${isFort ? row("Next", queue[0] ?? "None") : ""}
    </div>
  `;
}