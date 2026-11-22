// ==========================================
// SHARED MENU STATE
// ==========================================

let pendingMove = null;
let inspectedUnit = null;
let inspectedItemIndex = null;
let activeAttack = null;
let activeUnitView = "stats";

// Pending movement
export function getPendingMove() {
  return pendingMove;
}

export function setPendingMove(move) {
  pendingMove = move;
}

export function clearPendingMove() {
  pendingMove = null;
}

// Inspected unit
export function getInspectedUnit() {
  return inspectedUnit;
}

export function setInspectedUnit(unit) {
  inspectedUnit = unit;
}

// Inspected inventory item
export function getInspectedItemIndex() {
  return inspectedItemIndex;
}

export function setInspectedItemIndex(index) {
  inspectedItemIndex = index;
}

// Active attack
export function getActiveAttack() {
  return activeAttack;
}

export function setActiveAttack(attack) {
  activeAttack = attack;
}

export function clearActiveAttack() {
  activeAttack = null;
}

// Unit menu view
export function getActiveUnitView() {
  return activeUnitView;
}

export function setActiveUnitView(view) {
  activeUnitView = view;
}