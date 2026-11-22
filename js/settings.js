// ==========================================
// SETTINGS (themes only, for now)
// ==========================================

export const THEMES = [
  { id: "classic", label: "Classic" },
  { id: "forest", label: "Forest" },
  { id: "royal", label: "Royal" },
  { id: "dark", label: "Dark" }
];

const STORAGE_KEY = "waterMarks.theme";

export function getTheme() {
  return document.documentElement.dataset.theme || "classic";
}

export function setTheme(id) {
  if (!THEMES.some(theme => theme.id === id)) return false;

  document.documentElement.dataset.theme = id;

  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage can be blocked (private mode); the theme still applies.
  }

  return true;
}

// Call once at startup so the title screen already uses the saved theme.
export function applySavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (THEMES.some(theme => theme.id === saved)) {
      document.documentElement.dataset.theme = saved;
    }
  } catch {
    // Ignore blocked storage.
  }
}

// ==========================================
// SPEED
// ==========================================

// scale multiplies every duration: 0.5 = twice as fast, 0 = no waiting.
export const SPEED_LEVELS = [
  { id: "slow", label: "Slow", scale: 1.5 },
  { id: "normal", label: "Normal", scale: 1 },
  { id: "2x", label: "2x", scale: 0.5 },
  { id: "4x", label: "4x", scale: 0.25 },
  { id: "instant", label: "Instant", scale: 0 }
];

export const SPEED_SETTINGS = [
  {
    key: "anim",
    label: "Animation",
    hint: "Combat, HP bars, EXP and level-ups on your turn."
  },
  {
    key: "cpuStep",
    label: "CPU Step",
    hint: "Pause between CPU moves and actions."
  },
  {
    key: "cpuAnim",
    label: "CPU Anim",
    hint: "Combat, HP bars and EXP during CPU turns."
  }
];

const SPEED_STORAGE_KEY = "waterMarks.speed";

const speeds = Object.fromEntries(
  SPEED_SETTINGS.map(setting => [setting.key, "normal"])
);

function loadSpeeds() {
  try {
    const saved = JSON.parse(localStorage.getItem(SPEED_STORAGE_KEY) ?? "{}");

    for (const key of Object.keys(speeds)) {
      if (SPEED_LEVELS.some(level => level.id === saved?.[key])) {
        speeds[key] = saved[key];
      }
    }
  } catch {
    // Blocked or damaged storage: keep the defaults.
  }
}

loadSpeeds();

export function getSpeedLevel(key) {
  return SPEED_LEVELS.find(level => level.id === speeds[key]) ?? SPEED_LEVELS[1];
}

// Moves a setting to its next level and returns it.
export function cycleSpeed(key) {
  if (!Object.hasOwn(speeds, key)) return null;

  const index = SPEED_LEVELS.indexOf(getSpeedLevel(key));
  const next = SPEED_LEVELS[(index + 1) % SPEED_LEVELS.length];

  speeds[key] = next.id;

  try {
    localStorage.setItem(SPEED_STORAGE_KEY, JSON.stringify(speeds));
  } catch {
    // Storage can be blocked; the speed still applies this session.
  }

  return next;
}

// Set by the CPU while it plays, so animations pick the CPU speed.
let cpuActing = false;

export function setCpuActing(active) {
  cpuActing = Boolean(active);
}

// Scales an animation duration in ms.
export function animMs(ms) {
  return ms * getSpeedLevel(cpuActing ? "cpuAnim" : "anim").scale;
}

// Scales a CPU pause in ms.
export function stepMs(ms) {
  return ms * getSpeedLevel("cpuStep").scale;
}
