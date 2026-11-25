import { canUseWeapon } from "../combat.js";
import { escapeHtml } from "../utils.js";
import { pushInputContext, popInputContext, NO_INPUT } from "../input.js";
import { gameCursor, getUnitPosition } from "../gameState.js";
import { getHealTargets, getStaffRange, getStaffRangeTiles, isHealingStaff } from "./targeting.js";
import { setInspectedUnit } from "./attackState.js";
import { closeUnitMenu } from "./unitMenu.js";
import { useHealingStaff } from "./staffResolution.js";
import { finishUnitAction } from "./actions.js";
import {
  selectedStaffTarget,
  startStaffTargeting,
  cycleStaffTarget,
  clearStaffTargeting,
  getActiveStaffUser,
  getActiveStaff
} from "./staffState.js";

let staffMenuElement = null;
let staffMenuInputContext = null;
let targetInputContext = null;
let staffMenuUnit = null;
let staffMenuOnBack = null;
let selectedStaffIndex = 0;
let clickListenerAdded = false;

// ---------- helpers ----------

// Only healing staves are implemented so far.
function getUsableStaves(unit) {
  return (unit?.inventory ?? []).filter(item =>
    isHealingStaff(item) && canUseWeapon(unit, item).usable
  );
}

function getStaffMenuElement() {
  if (staffMenuElement) return staffMenuElement;

  const unitMenu = document.getElementById("unitMenu");
  if (!unitMenu) return null;

  staffMenuElement = document.createElement("div");
  staffMenuElement.id = "staffMenu";
  staffMenuElement.style.display = "none";
  unitMenu.appendChild(staffMenuElement);

  return staffMenuElement;
}

// ---------- list navigation ----------

function getVisibleButtons() {
  if (!staffMenuElement) return [];
  return [...staffMenuElement.querySelectorAll("button")].filter(
    b => b.getClientRects().length > 0 && !b.disabled
  );
}

function updateHighlight() {
  const buttons = getVisibleButtons();
  if (buttons.length === 0) return;

  selectedStaffIndex = Math.max(0, Math.min(selectedStaffIndex, buttons.length - 1));

  buttons.forEach((b, i) =>
    b.classList.toggle("menu-option-selected", i === selectedStaffIndex)
  );
}

function moveSelection(step) {
  const buttons = getVisibleButtons();
  if (buttons.length === 0) return;

  selectedStaffIndex =
    (selectedStaffIndex + step + buttons.length) % buttons.length;
  updateHighlight();
}

// ---------- rendering ----------

function renderStaffList() {
  if (!staffMenuElement || !staffMenuUnit) return;

  const unit = staffMenuUnit;
  const position = getUnitPosition(unit);
  const staves = getUsableStaves(unit);

    const list = staves.map((staff, index) => {
    const hasTargets = position &&
      getHealTargets(unit, staff, position.x, position.y).length > 0;

    const tooltip = hasTargets
      ? staff.effect
            : "No valid targets in range.";

    return `
      <button type="button" data-staff-index="${index}"
              title="${escapeHtml(tooltip)}"
              ${hasTargets ? "" : "disabled"}>
        ${escapeHtml(staff.name)}
        (${escapeHtml(staff.uses ?? "?")}/${escapeHtml(staff.maxUses ?? "?")})
      </button>`;
  }).join("");

  staffMenuElement.innerHTML = `
    <h3>STAFF</h3>
    <div class="staff-menu-list">
      ${list}
    </div>
  `;

  selectedStaffIndex = 0;
  updateHighlight();
}

// ---------- target selection ----------

function chooseStaff(unit, staff) {
  const position = getUnitPosition(unit);
  if (!staff || !position) return;

  const targets = getHealTargets(unit, staff, position.x, position.y);
  if (targets.length === 0) return;

  const rangeTiles = getStaffRangeTiles(unit, staff, position.x, position.y);
  startStaffTargeting(unit, staff, targets, rangeTiles);

  // Hide menus but leave their input contexts underneath.
  staffMenuElement.style.display = "none";
  document.getElementById("unitMenu").style.display = "none";

  gameCursor.moveToTarget(targets[0]);

  targetInputContext = pushInputContext({
    up: () => gameCursor.moveToTarget(cycleStaffTarget(-1)),
    left: () => gameCursor.moveToTarget(cycleStaffTarget(-1)),
    down: () => gameCursor.moveToTarget(cycleStaffTarget(1)),
    right: () => gameCursor.moveToTarget(cycleStaffTarget(1)),
    select: confirmTarget,
    back: cancelTargeting
  });
}

function endTargetSelection() {
  if (targetInputContext) {
    popInputContext(targetInputContext);
    targetInputContext = null;
  }
  clearStaffTargeting();
}

export function cancelTargeting() {
  const unit = getActiveStaffUser();
  endTargetSelection();

  // Put the cursor back on the unit so the unit menu is built for the right tile.
  const position = unit && getUnitPosition(unit);
  if (position) gameCursor.moveToTarget(position);

  document.getElementById("unitMenu").style.display = "block";
  staffMenuElement.style.display = "block";
  renderStaffList();
}

export async function confirmTarget() {
  const unit = getActiveStaffUser();
  const staff = getActiveStaff();
  const target = selectedStaffTarget;

  if (!unit || !staff || !target) return;

  endTargetSelection();
  const lock = pushInputContext(NO_INPUT);

  try {
    await useHealingStaff(unit, staff, target.unit);
  } catch (error) {
    console.error("Staff failed:", error);
  } finally {
    popInputContext(lock);
    finishStaffAction(unit);
  }
}

export function chooseStaffTarget(target) {
  if (!target) return;
  setSelectedStaffTarget(target);
  gameCursor.moveToTarget(target);
  return confirmTarget();
}

// ---------- closing ----------

function hideStaffMenu() {
  if (staffMenuInputContext) {
    popInputContext(staffMenuInputContext);
    staffMenuInputContext = null;
  }
  if (staffMenuElement) staffMenuElement.style.display = "none";
  staffMenuUnit = null;
}

// BACK from the staff list.
function closeStaffMenu() {
  const onBack = staffMenuOnBack;
  staffMenuOnBack = null;

  hideStaffMenu();
  onBack?.();
}

// The staff was used: the unit's turn is over.
function finishStaffAction(unit) {
  staffMenuOnBack = null;
  hideStaffMenu();

  finishUnitAction(unit);
  closeUnitMenu();
}

// ---------- opening ----------

function setupClickListener() {
  if (clickListenerAdded || !staffMenuElement) return;

  staffMenuElement.addEventListener("click", event => {
    const staffButton = event.target.closest("[data-staff-index]");

    if (staffButton && !staffButton.disabled) {
      const staff = getUsableStaves(staffMenuUnit)[Number(staffButton.dataset.staffIndex)];
      chooseStaff(staffMenuUnit, staff);
      return;
    }

    if (event.target.closest("[data-staff-back]")) closeStaffMenu();
  });

  clickListenerAdded = true;
}

export function openStaffMenu(unit, onBack) {
  const menu = getStaffMenuElement();
  if (!unit || !menu) return;

  staffMenuUnit = unit;
  staffMenuOnBack = onBack;

  document.getElementById("unitOptions").style.display = "none";
  document.getElementById("unitDetails").style.display = "none";
  const items = document.getElementById("unitItems");
  if (items) items.style.display = "none";

  menu.style.display = "block";

  setupClickListener();
  renderStaffList();

  if (staffMenuInputContext) popInputContext(staffMenuInputContext);

  staffMenuInputContext = pushInputContext({
    up: () => moveSelection(-1),
    left: () => moveSelection(-1),
    down: () => moveSelection(1),
    right: () => moveSelection(1),
    select: () => getVisibleButtons()[selectedStaffIndex]?.click(),
    back: closeStaffMenu
  });
}

// STAFF button on the post-move action menu.
export function beginMovedStaff() {
  const move = getPendingMove();
  if (!move) return;

  setInspectedUnit(move.unit);

  document.getElementById("moveMenu").style.display = "none";
  document.getElementById("unitMenu").style.display = "block";

  openStaffMenu(move.unit, () => {
    setInspectedUnit(null);
    document.getElementById("unitMenu").style.display = "none";
    document.getElementById("moveMenu").style.display = "block";
  });
}
