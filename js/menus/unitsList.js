import {
  gameGrid,
  gameCursor,
  TEAM_COLORS,
  TEAM_NAMES,
  getUnitPosition
} from "../gameState.js";

import { pushInputContext, popInputContext } from "../input.js";
import { escapeHtml, levelLabel } from "../utils.js";
import { getHomeLabel } from "../unitInfo.js";

// ==========================================
// COLUMNS
// ==========================================

const RANK_VALUE = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };

const WEAPON_TYPES = [
  ["sword", "Sword"],
  ["lance", "Lance"],
  ["axe", "Axe"],
  ["bow", "Bow"],
  ["anima", "Anima"],
  ["light", "Light"],
  ["dark", "Dark"],
  ["staff", "Staff"]
];

const className = unit => unit.className ?? unit.name;
const mainStat = unit => unit.mag ?? unit.str ?? 0;

// Throne first, then fort numbers, then units with no home.
function fortValue(unit) {
  if (!unit.home) return Infinity;   // fort 0 sorts last

  const label = getHomeLabel(unit);

  if (label === "Throne") return 0;

  const number = Number(label);

  return Number.isFinite(number) ? number : Infinity;
}

// text: true = sorts A-Z first; false = sorts highest first.
const COLUMNS = {
  class: {
    label: "Class", text: true,
    sort: u => className(u),
    show: u => className(u)
  },
  lvl: {
    label: "Lvl",
    sort: u => u.lvl + (u.priorLevel ?? 0) / 100,
    show: u => levelLabel(u)
  },
  exp: {
    label: "Exp",
    sort: u => u.exp ?? 0,
    show: u => u.exp ?? 0
  },
  fort: {
    label: "Fort",
    sort: fortValue,
    show: u => getHomeLabel(u)
  },
  hp: {
    label: "HP",
    sort: u => u.hp,
    show: u => `${u.hp}/${u.maxHp}`
  },
  stat: {
    label: "Str/Mag",
    sort: mainStat,
    show: mainStat
  },
  skl: { label: "Skl", sort: u => u.skl ?? 0, show: u => u.skl ?? 0 },
  spd: { label: "Spd", sort: u => u.spd ?? 0, show: u => u.spd ?? 0 },
  lck: { label: "Lck", sort: u => u.lck ?? 0, show: u => u.lck ?? 0 },
  def: { label: "Def", sort: u => u.def ?? 0, show: u => u.def ?? 0 },
  res: { label: "Res", sort: u => u.res ?? 0, show: u => u.res ?? 0 },
  con: { label: "Con", sort: u => u.con ?? 0, show: u => u.con ?? 0 },
  move: { label: "Mov", sort: u => u.move ?? 0, show: u => u.move ?? 0 }
};

for (const [type, label] of WEAPON_TYPES) {
  COLUMNS[type] = {
    label,
    sort: u => RANK_VALUE[u.weaponRanks?.[type]] ?? -1,
    show: u => u.weaponRanks?.[type] ?? "---"
  };
}

// Class stays first on every page so rows are always identifiable.
const PAGES = [
  {
    title: "General",
    keys: ["class", "lvl", "exp", "fort"]
  },
  {
    title: "Stats",
    keys: ["class", "hp", "stat", "skl", "spd", "lck", "def", "res", "con", "move"]
  },
  {
    title: "Weapon Ranks",
    keys: ["class", ...WEAPON_TYPES.map(([type]) => type)]
  }
];

// ==========================================
// STATE
// ==========================================

let panel = null;
let inputContext = null;

let listTeam = 1;
let entries = [];          // { unit, x, y }
let onBackCallback = null;

let page = 0;
let mode = "rows";         // "rows" or "header"
let rowIndex = 0;
let colIndex = 0;

let sortKey = "class";
let sortDir = 1;           // 1 = ascending, -1 = descending

const currentColumns = () => PAGES[page].keys.map(key => ({ key, ...COLUMNS[key] }));

// ==========================================
// DATA
// ==========================================

function collectEntries(team) {
  const list = [];

  for (let y = 0; y < gameGrid.length; y++) {
    for (let x = 0; x < gameGrid[y].length; x++) {
      const unit = gameGrid[y][x]?.unit;

      if (unit && unit.team === team) list.push({ unit, x, y });
    }
  }

  return list;
}

function compare(a, b) {
  return (a > b) - (a < b);
}

function sortEntries() {
  const column = COLUMNS[sortKey];

  entries.sort((a, b) => {
    const result =
      compare(column.sort(a.unit), column.sort(b.unit)) * sortDir;

    return (
      result ||
      className(a.unit).localeCompare(className(b.unit)) ||
      a.y - b.y ||
      a.x - b.x
    );
  });
}

function sortBy(key) {
  if (sortKey === key) {
    sortDir = -sortDir;
  } else {
    sortKey = key;
    sortDir = COLUMNS[key].text ? 1 : -1;
  }

  sortEntries();
  rowIndex = 0;
  render();
}

// ==========================================
// RENDERING
// ==========================================

function getPanel() {
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "unitsList";
  panel.style.display = "none";

  panel.innerHTML = `
    <h3 class="ul-title"></h3>
    <p class="ul-pager"></p>
    <div class="ul-scroll"></div>
  `;

    // Inside the canvas area, not the page, so it can't outgrow the map.
  (document.getElementById("gameArea") ?? document.body).appendChild(panel);

  panel.addEventListener("click", event => {
    const header = event.target.closest("th[data-col]");

    if (header) {
      mode = "header";
      colIndex = Number(header.dataset.col);
      sortBy(currentColumns()[colIndex].key);
      return;
    }

    const row = event.target.closest("tr[data-row]");

    if (row) {
      mode = "rows";
      rowIndex = Number(row.dataset.row);
      goToUnit();
    }
  });

  return panel;
}

function render() {
  const element = getPanel();
  const columns = currentColumns();

  colIndex = Math.max(0, Math.min(colIndex, columns.length - 1));
  rowIndex = Math.max(0, Math.min(rowIndex, entries.length - 1));

  const title = element.querySelector(".ul-title");
  title.textContent = `${TEAM_NAMES[listTeam]} Units (${entries.length})`;
  title.style.color = TEAM_COLORS[listTeam] ?? "inherit";

  element.querySelector(".ul-pager").textContent =
    `Page ${page + 1}/${PAGES.length}: ${PAGES[page].title}  (LT / RT)`;

  const head = columns.map((column, index) => {
    const classes = [];

    if (column.key === sortKey) classes.push("ul-sorted");
    if (mode === "header" && index === colIndex) classes.push("ul-selected");

    const arrow = column.key === sortKey
      ? (sortDir > 0 ? " ▲" : " ▼")
      : "";

    return `
      <th data-col="${index}" class="${classes.join(" ")}">
        ${escapeHtml(column.label)}${arrow}
      </th>`;
  }).join("");

  const body = entries.length === 0
    ? `<tr><td colspan="${columns.length}">No units.</td></tr>`
    : entries.map((entry, index) => {
        const selected = mode === "rows" && index === rowIndex;

        const cells = columns.map(column =>
          `<td>${escapeHtml(column.show(entry.unit))}</td>`
        ).join("");

        return `
          <tr data-row="${index}"
              class="${selected ? "ul-selected" : ""}">
            ${cells}
          </tr>`;
      }).join("");

  element.querySelector(".ul-scroll").innerHTML = `
    <table class="units-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;

    // Keep the highlighted row visible by scrolling only the list box.
  const scroll = element.querySelector(".ul-scroll");
  const selected = scroll.querySelector("tr.ul-selected");

  if (selected) {
    const headHeight = scroll.querySelector("thead")?.offsetHeight ?? 0;
    const boxRect = scroll.getBoundingClientRect();
    const rowRect = selected.getBoundingClientRect();

    const top = rowRect.top - boxRect.top + scroll.scrollTop;
    const bottom = top + rowRect.height;

    if (top - headHeight < scroll.scrollTop) {
      scroll.scrollTop = top - headHeight;
    } else if (bottom > scroll.scrollTop + scroll.clientHeight) {
      scroll.scrollTop = bottom - scroll.clientHeight;
    }
  }
}

// ==========================================
// INPUT
// ==========================================

function moveRow(step) {
  // Up or down from the headers drops back to the unit rows.
  if (mode === "header") {
    mode = "rows";
  } else {
    rowIndex += step;
  }

  render();
}

function moveColumn(step) {
  const columns = currentColumns();

  if (mode === "rows") {
    // Start on the column the list is sorted by.
    mode = "header";
    colIndex = Math.max(0, columns.findIndex(column => column.key === sortKey));
  }

  colIndex += step;
  render();
}

function selectOption() {
  if (mode === "header") {
    sortBy(currentColumns()[colIndex].key);
    return;
  }

  goToUnit();
}

function changePage(step) {
  page = (page + step + PAGES.length) % PAGES.length;
  render();
}

const handlers = {
  up: () => moveRow(-1),
  down: () => moveRow(1),
  left: () => moveColumn(-1),
  right: () => moveColumn(1),
  select: () => selectOption(),
  back: () => {
    const callback = onBackCallback;

    closeUnitsList();
    callback?.();
  },
  lt: () => changePage(-1),
  rt: () => changePage(1)
};

// ==========================================
// OPEN / CLOSE
// ==========================================

function goToUnit() {
  const entry = entries[rowIndex];

  if (!entry) return;

  const position = getUnitPosition(entry.unit) ?? entry;

  closeUnitsList();
  gameCursor?.moveToTarget(position);
}

// team: whose units to list. onBack: called when the player backs out.
export function openUnitsList(team, onBack = null) {
  listTeam = team;
  entries = collectEntries(team);
  onBackCallback = onBack;

  page = 0;
  mode = "rows";
  rowIndex = 0;
  colIndex = 0;

  sortKey = "class";
  sortDir = 1;
  sortEntries();

  getPanel().style.display = "flex";
  render();

  if (inputContext) popInputContext(inputContext);
  inputContext = pushInputContext(handlers);
}

export function closeUnitsList() {
  if (inputContext) {
    popInputContext(inputContext);
    inputContext = null;
  }

  if (panel) panel.style.display = "none";

  entries = [];
  onBackCallback = null;
}