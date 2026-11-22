// ==========================================
// SHARED HELPERS
// ==========================================

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

export function statValue(value) {
  return value ?? "—";
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Markup for one stat value. Shows the capped color at the stat cap,
// and the "new" color for stats listed in options.revealedStats.
export function statMarkup(unit, statName, value, options = {}) {
  const capKey = statName === "maxHp" ? "hp" : statName;
  const cap = unit.maxStats?.[capKey];

  const revealedValue = options.revealedStats?.[statName];
  const displayedValue = revealedValue ?? value;

  const isCapped =
    Number.isFinite(cap) &&
    Number(displayedValue) >= cap;

  let className = "level-old";

  if (isCapped) {
    className = "stat-capped";
  } else if (revealedValue !== undefined) {
    className = "level-new";
  }

  return `<span class="${className}">${escapeHtml(statValue(displayedValue))}</span>`;
}

// "(10) 1" for a promoted unit, plain level otherwise.
export function levelLabel(unit, level = unit.lvl) {
  return unit.priorLevel !== undefined
    ? `(${unit.priorLevel}) ${level}`
    : String(level);
}

// Small message at the bottom of the screen.
export function showToast(message, ms = 2200) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("toast-visible");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(
    () => toast.classList.remove("toast-visible"),
    ms
  );
}
