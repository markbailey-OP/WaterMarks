import { awardClassExp, awardWeaponExp } from "../exp.js";
import { consumeWeaponUse } from "../inventory.js";
import { sleep } from "../utils.js";
import {
  BATTLE_TIMING,
  createBattleStatus,
  clearBattleStatus,
  animateHpChange,
  orderTeams
} from "./combatAnimation.js";
import { animateExpAward } from "./levelUpMenu.js";
import { getHealAmount } from "./targeting.js";
import { recordUnitLevel, recordWeaponExp } from "../strongholds.js";
import { rollPromotionShop } from "../cpu.js";
import { setAlert } from "../gameArea.js";
import { animMs } from "../settings.js";
import { applyStatus, cureStatus, statusAlert } from "../status.js";

// Spends a use and awards weapon and class EXP.
async function finishStaffUse(user, staff) {
  const startingExp = user.exp ?? 0;

  const broke = consumeWeaponUse(user, staff);
  awardWeaponExp(user, staff, { weaponBroke: broke });

  const result = awardClassExp(user, staff.exp ?? 0);

  recordUnitLevel(user);

  if (result.levelsGained > 0) {
    recordWeaponExp(user);
    rollPromotionShop(user);
  }

  await animateExpAward(user, result, startingExp);
}

// Restore (cures every status) and Sleep-type staves (inflict one).
async function useStatusStaff(user, staff, target) {
  createBattleStatus(user, target);
  await sleep(BATTLE_TIMING.beforeFirstStrike);

  if (staff.cures) {
    cureStatus(target);
    setAlert([{ text: "CURED", unit: target, color: "#7fffa0" }]);
  } else {
    applyStatus(target, staff.inflicts);
    setAlert([{ ...statusAlert(staff.inflicts), unit: target }]);
  }

  await sleep(animMs(700));
  setAlert(null);
  clearBattleStatus();

  await finishStaffUse(user, staff);
}

// Heals one ally, cures one, or puts an enemy under a status.
export async function useHealingStaff(user, staff, target) {
  if (staff.cures || staff.inflicts) {
    return useStatusStaff(user, staff, target);
  }

  const amount = getHealAmount(user, staff, target);

  const [teamOne, teamTwo] = orderTeams(user, target);

  createBattleStatus(user, target);
  await sleep(BATTLE_TIMING.beforeFirstStrike);
  await animateHpChange(target, amount, teamOne, teamTwo);
  await sleep(BATTLE_TIMING.resultPause);
  clearBattleStatus();

  await finishStaffUse(user, staff);
}