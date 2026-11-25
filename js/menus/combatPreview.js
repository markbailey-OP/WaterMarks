import { gameGrid } from "../gameState.js";
import {
  calculateCombat, canUseWeapon, isBrave,
  cannotBeCountered, drainFraction
} from "../combat.js";
import { 
  isImmobile, 
  IMMOBILE_CAN_COUNTER, 
  getInflictedStatus } 
from "../status.js";
import { getItemRange } from "./targeting.js";
import { getActiveAttack } from "./attackState.js";
import { pushInputContext, popInputContext } from "../input.js";
import { escapeHtml, levelLabel } from "../utils.js";


// ==========================================
// COMBAT PREVIEW INPUT
// ==========================================

let previewInputContext = null;

function closePreviewInput() {
  if (!previewInputContext) return;

  popInputContext(previewInputContext);
  previewInputContext = null;
}

function openPreviewInput(onCancel) {
  closePreviewInput();

  const updateHighlight = () => {
    const button = document.getElementById("confirmCombatAttack");
    if (button) {
      button.classList.add("menu-option-selected");
    }
  };

  previewInputContext = pushInputContext({
    up: () => {},
    left: () => {},
    down: () => {},
    right: () => {},

    select: () => {
      document.getElementById("confirmCombatAttack")?.click();
    },

    back: () => {
      onCancel?.();
    }
  });

  updateHighlight();
}

// ==========================================
// COMBAT PREVIEW
// ==========================================
// Pure calculation: no DOM. Used by the preview screen and the CPU.
// `attack` needs: unit, target, destinationX, destinationY.
export function buildCombatPreview(attack, weapon) {
  const unit = attack.unit;
  const target = attack.target;
  const defender = target.unit;

  const defenderTerrain = gameGrid[target.y][target.x];
  const attackerTerrain = gameGrid[attack.destinationY][attack.destinationX];

  const defenderWeapon =
    defender.equippedWeapon ??
    defender.inventory?.find(item => item.equipped) ??
    null;

  const distance =
    Math.abs(attack.destinationX - target.x) +
    Math.abs(attack.destinationY - target.y);

  const isIndirect = distance > 1;

  const result = calculateCombat(
    unit,
    defender,
    weapon,
    defenderTerrain,
    defenderWeapon,
    isIndirect
  );

  let counterResult = { damage: 0, hit: 0, crit: 0, effective: false };
  let canCounter = false;

  if (defenderWeapon) {
    const counterRange = getItemRange(defenderWeapon);

    canCounter =
      canUseWeapon(defender, defenderWeapon).usable &&
      !cannotBeCountered(weapon) &&
      !cannotBeCountered(defenderWeapon) &&
      !unit.inBallista &&
      !defender.inBallista &&
      (IMMOBILE_CAN_COUNTER || !isImmobile(defender)) &&
      counterRange !== null &&
      distance >= counterRange.min &&
      distance <= counterRange.max;

    if (canCounter) {
      counterResult = calculateCombat(
        defender,
        unit,
        defenderWeapon,
        attackerTerrain,
        weapon,
        isIndirect
      );
    }
  }

    // A follow-up strike needs an attack speed lead of 4 or more.
  const attackerDoubles = result.attackerAS >= result.defenderAS + 4;
  const defenderDoubles =
    canCounter && counterResult.attackerAS >= counterResult.defenderAS + 4;

  const attackerHits = isBrave(weapon) ? 2 : 1;
  const defenderHits = canCounter && isBrave(defenderWeapon) ? 2 : 1;

  return {
    weapon,
    result,
    defenderWeapon,
    counterResult,
    canCounter,
    attackerDoubles,
    defenderDoubles,
    attackerHits,                 // hits per strike (2 for brave)
    defenderHits,
    attackerStrikes: attackerHits * (attackerDoubles ? 2 : 1),
    drain: Math.floor(
      Math.min(result.damage, defender.hp) * drainFraction(weapon)
    ),
    defenderStrikes: canCounter ? defenderHits * (defenderDoubles ? 2 : 1) : 0
  };
}

export function showCombatPreview(
  weapon,
  performAttack,
  showAttackWeapons
) {
  const activeAttack = getActiveAttack();

  if (!activeAttack) return;

  const unit = activeAttack.unit;
  const target = activeAttack.target;

  if (!target || target.type !== "unit") return;

  const defender = target.unit;

  const preview = buildCombatPreview(activeAttack, weapon);
  activeAttack.preview = preview;

      const {
    result, defenderWeapon, 
    counterResult, attackerStrikes, 
    defenderStrikes
  } = preview;

  const options = document.getElementById("attackOptions");
  const previewTitle = document.getElementById("attackMenuTitle");

  options.innerHTML = "";

  previewTitle.style.display = "none";
  document.getElementById("attackPrompt").textContent = "";

  options.innerHTML = `
    <div class="combat-preview">

            <div class="combat-preview-units">

        <div class="combat-preview-unit">
          <h3 class="combat-preview-name attacker-name">
            ${escapeHtml(unit.name)}
          </h3>

          <p>Lv: ${escapeHtml(levelLabel(unit))}</p>
          <p>HP: ${unit.hp}/${unit.maxHp}</p>
          <p>${escapeHtml(weapon.name)}</p>

          <hr>

          <p>Dmg: <strong>${result.damage}</strong>${attackerStrikes > 1 ? ` <strong>x${attackerStrikes}</strong>` : ""}</p>
          <p>Hit: <strong>${result.hit}%</strong></p>
          <p>Crit: <strong>${result.crit}%</strong></p>
        </div>

        <div class="combat-preview-unit">
          <h3 class="combat-preview-name defender-name">
            ${escapeHtml(defender.name)}
          </h3>

          <p>Lv: ${escapeHtml(levelLabel(defender))}</p>
          <p>HP: ${defender.hp}/${defender.maxHp}</p>
          <p>${escapeHtml(defenderWeapon?.name ?? "No weapon")}</p>

          <hr>

          <p>Dmg: <strong>${counterResult.damage}</strong>${defenderStrikes > 1 ? ` <strong>x${defenderStrikes}</strong>` : ""}</p>
          <p>Hit: <strong>${counterResult.hit}%</strong></p>
          <p>Crit: <strong>${counterResult.crit}%</strong></p>
        </div>

      </div>

      ${result.effective
        ? "<p><strong>Effective weapon!</strong></p>"
        : ""
      }
      
     ${preview.drain > 0
        ? `<p><strong>Recovers ${preview.drain} HP per hit</strong></p>`
        : ""
      }

      ${counterResult.effective
        ? "<p><strong>Counter weapon is effective!</strong></p>"
        : ""
      }
      
            ${getInflictedStatus(weapon)
        ? `<p><strong>Inflicts ${escapeHtml(getInflictedStatus(weapon))}!</strong></p>`
        : ""
      }

      <div class="combat-preview-actions">
        <button type="button" id="confirmCombatAttack">
          CONFIRM
        </button>
      </div>

    </div>
  `;

  document.getElementById("confirmCombatAttack")
  .addEventListener("click", () => {
    closePreviewInput();

    // Remove the HTML combat preview.
    options.innerHTML = "";

    // Hide the entire movement and attack menu.
    document.getElementById("attackMenu").style.display = "none";

    performAttack(weapon);
  });

  const cancelPreview = () => {
    closePreviewInput();
    previewTitle.style.display = "";
    showAttackWeapons(target);
  };

  openPreviewInput(cancelPreview);
}