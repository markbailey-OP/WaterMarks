
// Base item class and consumable items
export * from "./items.js";

// Physical weapons
export * from "./swords.js";
export * from "./axes.js";
export * from "./lances.js";
export * from "./bows.js";

// Magic weapons
export * from "./anima.js";
export * from "./light.js";
export * from "./dark.js";

// Staves
export * from "./staves.js";

// Monster weapons
export * from "./monster.js";

// Resolve the duplicate Torch export:
// Torch from items.js is the consumable.
// Torch from staves.js is the staff.
export { Torch } from "./items.js";
export { Torch as StaffTorch } from "./staves.js";
