// ==========================================
// STAFF TARGET STATE
// ==========================================

export let staffTargets = [];
export let selectedStaffTarget = null;
export let staffRange = [];

let activeStaffUser = null;
let activeStaff = null;

export function startStaffTargeting(unit, staff, targets, rangeTiles = []) {
  activeStaffUser = unit;
  activeStaff = staff;
  staffTargets = [...targets];
  selectedStaffTarget = staffTargets[0] ?? null;
  staffRange = [...rangeTiles];
  return selectedStaffTarget;
}

export function cycleStaffTarget(step) {
  if (staffTargets.length === 0) return null;

  let index = staffTargets.indexOf(selectedStaffTarget);
  if (index === -1 && selectedStaffTarget) {
    index = staffTargets.findIndex(
      t => t.x === selectedStaffTarget.x && t.y === selectedStaffTarget.y
    );
  }
  const startingIndex = index === -1 ? 0 : index;
  selectedStaffTarget =
    staffTargets[(startingIndex + step + staffTargets.length) % staffTargets.length];

  return selectedStaffTarget;
}

export function setSelectedStaffTarget(target) {
  selectedStaffTarget = target;
}

export const getActiveStaffUser = () => activeStaffUser;
export const getActiveStaff = () => activeStaff;
export const getActiveStaffRange = () => staffRange;
export const isChoosingStaffTarget = () => activeStaff !== null;

export function clearStaffTargeting() {
  staffTargets = [];
  selectedStaffTarget = null;
  staffRange = [];
  activeStaffUser = null;
  activeStaff = null;
}
