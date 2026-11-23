import { getPromotionPreview } from "../promotion.js";
import { escapeHtml } from "../utils.js";

// ==========================================
// PROMOTION PREVIEW
// ==========================================

// Class buttons on the left, the preview panel on the right.
export function promotionLayoutHtml(buttonsHtml) {
  return `
    <div class="promotion-layout">
      <div class="promotion-choices">${buttonsHtml}</div>
      <div class="promotion-preview"></div>
    </div>`;
}

// One "label  old -> new" line. Written without line breaks so no
// stray spaces appear around the arrow.
function row(label, from, to, tone = "") {
  return (
    `<div class="promo-row"><strong>${escapeHtml(label)}</strong>` +
    `<span>${escapeHtml(from)}<span class="promo-arrow">→</span>` +
    `<span class="${tone}">${escapeHtml(to)}</span></span></div>`
  );
}

function previewHtml(preview) {
  const stats = preview.stats.map(stat => {
    const tone = stat.capped
      ? "promo-cap"
      : stat.to > stat.from
        ? "promo-up"
        : stat.to < stat.from
          ? "promo-down"
          : "";

    return row(stat.label, stat.from, stat.to, tone);
  }).join("");

  return `
    <div class="promo-class">
      <span>${escapeHtml(preview.fromClass)}</span>
      <span class="promo-arrow">→</span>
      <strong>${escapeHtml(preview.toClass)}</strong>
    </div>

    <div class="promo-grid">
      ${row("Lvl", preview.fromLevel, preview.toLevel)}
      ${stats}
    </div>`;
}

// Fills the preview panel inside `root` for the highlighted button.
// Does nothing when the menu has no preview panel (every other menu).
export function syncPromotionPreview(root, unit, button) {
  const panel = root?.querySelector(".promotion-preview");

  if (!panel || !unit) return;

  const className = button?.dataset.class;
  const preview = className ? getPromotionPreview(unit, className) : null;

  panel.innerHTML = preview ? previewHtml(preview) : "";
}