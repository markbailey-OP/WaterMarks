import { gameGrid, TEAM_COLORS } from "./gameState.js";
import { escapeHtml, levelLabel } from "./utils.js";
import { currentStatus } from "./status.js";

let lastKey = null;

// The fort number of the unit's home, "Throne" for a lord's throne,
// "0" for a unit with no home, or "—" if the home was captured.
export function getHomeLabel(unit) {
  const home = unit.home;

  if (!home) return "0";

  const tile = gameGrid[home.y]?.[home.x];

  if (!tile || tile.owner !== unit.team) return "—";
  if (tile.name === "Throne") return "Throne";

  return tile.index ?? "—";
}

export function updateUnitInfo(cursor) {
  const element = document.getElementById("unitInfo");

  if (!element || !cursor) return;

  const unit = gameGrid[cursor.y]?.[cursor.x]?.unit;
  const status = unit ? currentStatus(unit) : null;

  const key = unit
    ? [
        unit.name, unit.team, unit.lvl, unit.priorLevel ?? "",
        unit.hp, unit.maxHp, unit.exp, getHomeLabel(unit),
        status?.label ?? ""
      ].join("|")
    : "none";

  if (key === lastKey) return;

  lastKey = key;

  if (!unit) {
    element.innerHTML = `
      <h3 class="unit-info-name">Unit</h3>
      <p class="unit-info-empty">No unit</p>
    `;
    return;
  }

  // Status replaces Exp only while a status applies.
  const third = status
    ? `<strong>Status</strong>
       <span class="status-${status.type}">${escapeHtml(status.label)}</span>`
    : `<strong>Exp</strong>
       <span>${escapeHtml(unit.exp ?? 0)}/100</span>`;

  element.innerHTML = `
    <h3 class="unit-info-name"
        style="color:${TEAM_COLORS[unit.team] ?? "inherit"}">
      ${escapeHtml(unit.name)}
    </h3>

    <div class="unit-info-grid">
      <p class="unit-info-row">
        <strong>Lvl</strong>
        <span>${escapeHtml(levelLabel(unit))}</span>
      </p>
      <p class="unit-info-row">
        <strong>HP</strong>
        <span>${escapeHtml(unit.hp)}/${escapeHtml(unit.maxHp)}</span>
      </p>
      <p class="unit-info-row">${third}</p>
      <p class="unit-info-row">
        <strong>Fort</strong>
        <span>${escapeHtml(getHomeLabel(unit))}</span>
      </p>
    </div>
  `;
}