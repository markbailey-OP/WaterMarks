import { stealItem } from "../abilities.js";
import { awardClassExp, isPromoted } from "../exp.js";
import { animateExpAward } from "./levelUpMenu.js";
import { recordUnitLevel, recordWeaponExp } from "../strongholds.js";
import { rollPromotionShop } from "../cpu.js";

// 10 + (target level - thief level), +10 to the target's level if it is
// promoted, minimum 1. awardClassExp applies the EXP multiplier.
export function getStealExp(thief, victim) {
  const victimLevel = (victim.lvl ?? 1) + (isPromoted(victim) ? 10 : 0);

  return Math.max(1, 10 + victimLevel - (thief.lvl ?? 1));
}

// Takes the item, then awards and animates the EXP. Returns the item,
// or null if nothing was taken.
export async function resolveSteal(thief, victim, index) {
  const item = stealItem(thief, victim, index);

  if (!item) return null;

  try {
    const startingExp = thief.exp ?? 0;
    const result = awardClassExp(thief, getStealExp(thief, victim));

    recordUnitLevel(thief);

    if (result.levelsGained > 0) {
      recordWeaponExp(thief);
      rollPromotionShop(thief);
    }

    await animateExpAward(thief, result, startingExp);
  } catch (error) {
    console.error("Steal EXP failed:", error);
  }

  return item;
}