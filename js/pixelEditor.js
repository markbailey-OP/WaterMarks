import { mergePngWithInfo } from "./pngMerge.js";
// ==========================================
// PIXEL EDITOR
// ==========================================

const $ = id => document.getElementById(id);

const scroller = $("scroller");
const spacer = $("spacer");
const view = $("view");
const vctx = view.getContext("2d");

const ZOOMS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64];

const PNG_TYPE = {
  description: "PNG image",
  accept: { "image/png": [".png"] }
};

// ------------------------------------------
// State
// ------------------------------------------

let sheet = null;          // offscreen canvas holding the image
let sctx = null;
let W = 0;
let H = 0;

let zoom = 8;
let showGrid = true;
let mode = "select";       // "select" or "paint"

let hover = null;
let selected = null;
let color = { r: 255, g: 0, b: 0, a: 255 };

let undoStack = [];        // { px: [{x, y, old, new}], merge? }
let redoStack = [];
let mergeKey = null;       // consecutive palette edits of one pixel merge
let mergeCounter = 0;

let stroke = null;         // Map of pixels changed during a paint drag
let lastPaint = null;

let recent = [];
let dirty = false;
let fileName = "sprite.png";
let fileHandle = null;
let frame = 0;

// ------------------------------------------
// Helpers
// ------------------------------------------

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hex2 = v => v.toString(16).padStart(2, "0");

const toHex = c =>
  "#" + hex2(c.r) + hex2(c.g) + hex2(c.b) + (c.a < 255 ? hex2(c.a) : "");

const toArray = c => [c.r, c.g, c.b, c.a];
const fromArray = a => ({ r: a[0], g: a[1], b: a[2], a: a[3] });
const sameArray = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];

// Accepts #rgb, #rgba, #rrggbb, #rrggbbaa, "r,g,b", "r g b a", "rgb(r,g,b)".
function parseColor(text) {
  text = String(text).trim().toLowerCase();

  let m = text.match(/^#([0-9a-f]{3,4})$/);

  if (m) {
    const d = [...m[1]].map(ch => parseInt(ch + ch, 16));
    return { r: d[0], g: d[1], b: d[2], a: d[3] ?? 255 };
  }

  m = text.match(/^#?([0-9a-f]{6}|[0-9a-f]{8})$/);

  if (m) {
    const h = m[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255
    };
  }

  m = text.match(/^(?:rgba?\()?\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,]+(\d{1,3}))?\s*\)?$/);

  if (m) {
    const v = [m[1], m[2], m[3], m[4] ?? "255"].map(Number);

    if (v.every(n => n >= 0 && n <= 255)) {
      return { r: v[0], g: v[1], b: v[2], a: v[3] };
    }
  }

  return null;
}

function status(text) {
  $("status").textContent = text;
  clearTimeout(status.timer);
  status.timer = setTimeout(() => { $("status").textContent = ""; }, 3500);
}

function markDirty(on = true) {
  dirty = on;
  document.title = (dirty ? "* " : "") + "Pixel Editor - " + fileName;
}

// ------------------------------------------
// Pixels
// ------------------------------------------

function getPixel(x, y) {
  const d = sctx.getImageData(x, y, 1, 1).data;

  return [d[0], d[1], d[2], d[3]];
}

function setPixel(x, y, c) {
  const data = sctx.createImageData(1, 1);

  data.data.set(c);
  sctx.putImageData(data, x, y);
}

// ------------------------------------------
// Drawing
// ------------------------------------------

const checker = (() => {
  const c = document.createElement("canvas");

  c.width = c.height = 16;

  const g = c.getContext("2d");

  g.fillStyle = "#9a9a9a";
  g.fillRect(0, 0, 16, 16);
  g.fillStyle = "#6e6e6e";
  g.fillRect(0, 0, 8, 8);
  g.fillRect(8, 8, 8, 8);

  return vctx.createPattern(c, "repeat");
})();

function requestDraw() {
  if (!frame) frame = requestAnimationFrame(draw);
}

const scrollLeft = () => Math.round(scroller.scrollLeft);
const scrollTop = () => Math.round(scroller.scrollTop);

function outline(p, style) {
  if (!p) return;

  const lw = zoom >= 6 ? 2 : 1;
  const x = p.x * zoom - scrollLeft();
  const y = p.y * zoom - scrollTop();

  if (x + zoom < 0 || y + zoom < 0 || x > view.width || y > view.height) return;

  vctx.strokeStyle = style;
  vctx.lineWidth = lw;
  vctx.strokeRect(x + lw / 2, y + lw / 2, zoom - lw, zoom - lw);
}

function draw() {
  frame = 0;

  vctx.imageSmoothingEnabled = false;
  vctx.fillStyle = "#222";
  vctx.fillRect(0, 0, view.width, view.height);

  if (!sheet) return;

  const left = scrollLeft();
  const top = scrollTop();

  const x0 = Math.floor(left / zoom);
  const y0 = Math.floor(top / zoom);
  const x1 = Math.min(W, Math.ceil((left + view.width) / zoom));
  const y1 = Math.min(H, Math.ceil((top + view.height) / zoom));

  const w = x1 - x0;
  const h = y1 - y0;

  if (w <= 0 || h <= 0) return;

  const dx = x0 * zoom - left;
  const dy = y0 * zoom - top;

  vctx.fillStyle = checker;
  vctx.fillRect(dx, dy, w * zoom, h * zoom);

  vctx.drawImage(sheet, x0, y0, w, h, dx, dy, w * zoom, h * zoom);

  if (showGrid && zoom >= 6) {
    vctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    vctx.lineWidth = 1;
    vctx.beginPath();

    for (let i = 0; i <= w; i++) {
      vctx.moveTo(dx + i * zoom + 0.5, dy);
      vctx.lineTo(dx + i * zoom + 0.5, dy + h * zoom);
    }

    for (let j = 0; j <= h; j++) {
      vctx.moveTo(dx, dy + j * zoom + 0.5);
      vctx.lineTo(dx + w * zoom, dy + j * zoom + 0.5);
    }

    vctx.stroke();
  }

  outline(hover, "#ffdf55");
  outline(selected, "#ff3030");
}

function resizeView() {
  view.width = Math.max(1, scroller.clientWidth);
  view.height = Math.max(1, scroller.clientHeight);
  requestDraw();
}

function updateSpacer() {
  spacer.style.width = W * zoom + "px";
  spacer.style.height = H * zoom + "px";
  $("zoomLabel").textContent = zoom + "x";
}

// ------------------------------------------
// Zoom and navigation
// ------------------------------------------

function setZoom(next, clientX, clientY) {
  if (!sheet || next === zoom) return;

  const rect = scroller.getBoundingClientRect();
  const mx = clientX === undefined ? scroller.clientWidth / 2 : clientX - rect.left;
  const my = clientY === undefined ? scroller.clientHeight / 2 : clientY - rect.top;

  const px = (mx + scroller.scrollLeft) / zoom;
  const py = (my + scroller.scrollTop) / zoom;

  zoom = next;
  updateSpacer();

  scroller.scrollLeft = px * zoom - mx;
  scroller.scrollTop = py * zoom - my;

  requestDraw();
}

function stepZoom(step, clientX, clientY) {
  const index = clamp(ZOOMS.indexOf(zoom) + step, 0, ZOOMS.length - 1);

  setZoom(ZOOMS[index], clientX, clientY);
}

function centerOn(x, y) {
  scroller.scrollLeft = (x + 0.5) * zoom - scroller.clientWidth / 2;
  scroller.scrollTop = (y + 0.5) * zoom - scroller.clientHeight / 2;
  requestDraw();
}

function ensureVisible(x, y) {
  const left = x * zoom;
  const top = y * zoom;
  const margin = zoom * 2;

  if (left - margin < scroller.scrollLeft) {
    scroller.scrollLeft = left - margin;
  } else if (left + zoom + margin > scroller.scrollLeft + scroller.clientWidth) {
    scroller.scrollLeft = left + zoom + margin - scroller.clientWidth;
  }

  if (top - margin < scroller.scrollTop) {
    scroller.scrollTop = top - margin;
  } else if (top + zoom + margin > scroller.scrollTop + scroller.clientHeight) {
    scroller.scrollTop = top + zoom + margin - scroller.clientHeight;
  }
}

function pixelAt(event) {
  const rect = scroller.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;

  // Ignore clicks on the scrollbars.
  if (mx < 0 || my < 0 || mx >= scroller.clientWidth || my >= scroller.clientHeight) {
    return null;
  }

  const x = Math.floor((mx + scrollLeft()) / zoom);
  const y = Math.floor((my + scrollTop()) / zoom);

  return x >= 0 && y >= 0 && x < W && y < H ? { x, y } : null;
}

// ------------------------------------------
// Readout and palette
// ------------------------------------------

function describe(label, p) {
  if (!p || !sheet) return "";

  const c = fromArray(getPixel(p.x, p.y));

  return `${label} [${p.x}, ${p.y}]  cell [${p.x >> 4}, ${p.y >> 4}]  ${toHex(c)}  rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

function updateReadout() {
  if (!sheet) return;

  const parts = [describe("Hover", hover), describe("Selected", selected)];

  $("readout").textContent =
    `${fileName}  ${W}x${H}\n` + parts.filter(Boolean).join("      ");
}

function updateHint() {
  $("hint").textContent =
    mode === "paint"
      ? "Paint: click or drag to paint. Alt-click or right-click picks a color."
      : selected
        ? `Editing pixel [${selected.x}, ${selected.y}]. Changes apply right away. Shift-click another pixel to stamp this color on it.`
        : "Select a pixel to edit it.";
}

const channels = [
  ["r", $("rIn"), $("rRange")],
  ["g", $("gIn"), $("gRange")],
  ["b", $("bIn"), $("bRange")],
  ["a", $("aIn"), $("aRange")]
];

// Fills every palette control except the one being typed in.
function setColor(c, from = null) {
  color = { ...c };

  if (from !== $("colorPicker")) {
    $("colorPicker").value = "#" + hex2(color.r) + hex2(color.g) + hex2(color.b);
  }

  if (from !== $("hexIn")) $("hexIn").value = toHex(color);

  for (const [key, number, range] of channels) {
    if (from !== number) number.value = color[key];
    if (from !== range) range.value = color[key];
  }

  $("swatch").style.background =
    `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
}

// A color chosen through the palette: also edits the selected pixel
// when in Select mode.
function userColor(c, from) {
  setColor(c, from);

  if (mode !== "select") return;

  if (!selected) {
    status("Click a pixel first, then change the color.");
    return;
  }

  applyColorToSelection();
}

function renderSwatches(container, colors) {
  container.innerHTML = "";

  for (const c of colors) {
    const button = document.createElement("button");

    button.type = "button";
    button.title = toHex(c);
    button.dataset.c = toArray(c).join(",");
    button.style.background = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;

    container.appendChild(button);
  }
}

function addRecent(c) {
  const key = toHex(c);

  recent = [{ ...c }, ...recent.filter(entry => toHex(entry) !== key)].slice(0, 16);
  renderSwatches($("recent"), recent);
}

function scanSheet() {
  if (!sheet) return;

  const data = sctx.getImageData(0, 0, W, H).data;
  const counts = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const key = (
      (data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3]
    ) >>> 0;

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 64)
    .map(([key]) => ({
      r: key >>> 24,
      g: (key >>> 16) & 255,
      b: (key >>> 8) & 255,
      a: key & 255
    }));

  renderSwatches($("sheetColors"), top);
  status(`${counts.size} distinct colors in the sheet.`);
}

// ------------------------------------------
// Selection and editing
// ------------------------------------------

function select(p) {
  selected = p;
  mergeKey = null;

  if (p && mode === "select") setColor(fromArray(getPixel(p.x, p.y)));

  updateHint();
  updateReadout();
  requestDraw();
}

function pushUndo(entry) {
  undoStack.push(entry);
  if (undoStack.length > 500) undoStack.shift();

  redoStack = [];
  markDirty();
}

function applyColorToSelection() {
  if (!selected) return;

  const { x, y } = selected;
  const current = getPixel(x, y);
  const next = toArray(color);

  if (sameArray(current, next)) return;

  const last = undoStack[undoStack.length - 1];

  if (mergeKey && last?.merge === mergeKey) {
    last.px[0].new = next;
  } else {
    mergeKey = `${x},${y},${++mergeCounter}`;
    pushUndo({ merge: mergeKey, px: [{ x, y, old: current, new: next }] });
  }

  redoStack = [];
  setPixel(x, y, next);
  markDirty();
  updateReadout();
  requestDraw();
}

// ---- painting ----

function paintPixel(x, y) {
  const next = toArray(color);
  const key = x + "," + y;
  const current = getPixel(x, y);

  if (sameArray(current, next)) return;

  if (!stroke.has(key)) stroke.set(key, { x, y, old: current, new: next });
  else stroke.get(key).new = next;

  setPixel(x, y, next);
}

function line(x0, y0, x1, y1, fn) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    fn(x0, y0);

    if (x0 === x1 && y0 === y1) break;

    const e2 = 2 * err;

    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function startStroke(p) {
  stroke = new Map();
  lastPaint = p;
  mergeKey = null;

  paintPixel(p.x, p.y);
  selected = p;
  requestDraw();
}

function continueStroke(p) {
  if (!stroke || !p) return;

  line(lastPaint.x, lastPaint.y, p.x, p.y, paintPixel);

  lastPaint = p;
  selected = p;
  requestDraw();
}

function endStroke() {
  if (!stroke) return;

  if (stroke.size > 0) {
    pushUndo({ px: [...stroke.values()] });
    addRecent(color);
  }

  stroke = null;
  lastPaint = null;

  updateHint();
  updateReadout();
}

// ---- undo / redo ----

function applyEntry(entry, useNew) {
  for (const pixel of entry.px) {
    setPixel(pixel.x, pixel.y, useNew ? pixel.new : pixel.old);
  }

  const last = entry.px[entry.px.length - 1];

  select({ x: last.x, y: last.y });
  ensureVisible(last.x, last.y);

  markDirty();
}

function undo() {
  const entry = undoStack.pop();

  if (!entry) return;

  redoStack.push(entry);
  applyEntry(entry, false);
}

function redo() {
  const entry = redoStack.pop();

  if (!entry) return;

  undoStack.push(entry);
  applyEntry(entry, true);
}

// ------------------------------------------
// Clipboard
// ------------------------------------------

async function copyColor() {
  const text = toHex(color);

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const box = document.createElement("textarea");

    box.value = text;
    document.body.appendChild(box);
    box.select();
    document.execCommand("copy");
    box.remove();
  }

  status(`Copied ${text}`);
}

async function pasteColor() {
  let text = "";

  try {
    text = await navigator.clipboard.readText();
  } catch {
    status("Clipboard blocked. Paste into the hex box instead.");
    return;
  }

  const parsed = parseColor(text);

  if (!parsed) {
    status("The clipboard doesn't hold a color.");
    return;
  }

  userColor(parsed, null);
  addRecent(parsed);
}

// ------------------------------------------
// Files
// ------------------------------------------

function setSheet(drawable, w, h, name, handle = null) {
  sheet = document.createElement("canvas");
  sheet.width = W = w;
  sheet.height = H = h;

  sctx = sheet.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(drawable, 0, 0);

  fileName = name;
  fileHandle = handle;

  undoStack = [];
  redoStack = [];
  hover = null;
  selected = null;
  mergeKey = null;

  updateSpacer();
  scroller.scrollLeft = 0;
  scroller.scrollTop = 0;

  markDirty(false);
  updateHint();
  updateReadout();
  resizeView();
}

function confirmDiscard() {
  return !dirty || confirm("Discard unsaved changes?");
}

async function loadFile(file, handle = null) {
  const bitmap = await createImageBitmap(file, {
    premultiplyAlpha: "none",
    colorSpaceConversion: "none"
  });

  setSheet(bitmap, bitmap.width, bitmap.height, file.name, handle);
}

// Adds a PNG to the open sheet. With a pixel selected it goes in the empty
// space to the right of it, else below it; otherwise below or right of the sheet.
async function mergeFile(file) {
  if (!sheet) {
    status("Open a PNG first.");
    return;
  }

  if (undoStack.length > 0 && !confirm("Merging clears the undo history. Continue?")) {
    return;
  }

  try {
    const anchor = selected ? { x: selected.x, y: selected.y } : null;
    const base = await new Promise(resolve => sheet.toBlob(resolve, "image/png"));

    if (!base) throw new Error("Could not read the open sheet.");

    const { file: merged, plan } = await mergePngWithInfo(file, base, fileName, anchor);

    const bitmap = await createImageBitmap(merged, {
      premultiplyAlpha: "none",
      colorSpaceConversion: "none"
    });

    // No file handle: Save opens a dialog, so the original file is not overwritten.
    setSheet(bitmap, bitmap.width, bitmap.height, fileName, null);
    markDirty(true);

    centerOn(plan.x, plan.y);

    const note = plan.blocked
      ? "The space right of and below the pixel is taken, so it went "
      : "Added ";

    status(
      `${note}${plan.side} at [${plan.x}, ${plan.y}]. ` +
      `Sheet is now ${W}x${H}.`
    );
  } catch (error) {
    status(error?.message || "Could not merge that file.");
  }
}

async function openFile() {
  if (!confirmDiscard()) return;

  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({ types: [PNG_TYPE] });

      await loadFile(await handle.getFile(), handle);
    } catch (error) {
      if (error?.name !== "AbortError") status(error?.message || "Could not open that file.");
    }

    return;
  }

  $("fileInput").click();
}

function loadFromUrl(url) {
  const img = new Image();

  img.onload = () => {
    const name = decodeURIComponent(url.split("/").pop().split("?")[0]) || "sprite.png";

    setSheet(img, img.naturalWidth, img.naturalHeight, name);
  };

  img.onerror = () => {
    $("readout").textContent = `Could not load ${url}`;
  };

  img.src = url;
}

async function writeBlob(handle, blob) {
  const writable = await handle.createWritable();

  await writable.write(blob);
  await writable.close();
}

async function save(saveAs = false) {
  if (!sheet) return;

  const blob = await new Promise(resolve => sheet.toBlob(resolve, "image/png"));

  if (!blob) {
    status("Saving failed.");
    return;
  }

  try {
    if (fileHandle && !saveAs) {
      await writeBlob(fileHandle, blob);
    } else if (window.showSaveFilePicker) {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [PNG_TYPE]
      });

      fileName = fileHandle.name;
      await writeBlob(fileHandle, blob);
    } else {
      // Fallback (Firefox, Safari): a normal download.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    markDirty(false);
    updateReadout();
    status("Saved " + fileName);
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("Save failed:", error);
      status("Saving failed.");
    }
  }
}

// ------------------------------------------
// Modes
// ------------------------------------------

function setMode(next) {
  mode = next;

  $("modeSelect").classList.toggle("active", mode === "select");
  $("modePaint").classList.toggle("active", mode === "paint");
  scroller.classList.toggle("paint", mode === "paint");

  mergeKey = null;
  updateHint();
}

// ------------------------------------------
// Events: canvas
// ------------------------------------------

scroller.addEventListener("scroll", requestDraw);

new ResizeObserver(resizeView).observe(scroller);

scroller.addEventListener("pointermove", event => {
  const p = pixelAt(event);

  if (stroke) {
    continueStroke(p);
  } else if (p?.x !== hover?.x || p?.y !== hover?.y) {
    hover = p;
    updateReadout();
    requestDraw();
  }
});

scroller.addEventListener("pointerleave", () => {
  if (!hover) return;

  hover = null;
  updateReadout();
  requestDraw();
});

scroller.addEventListener("pointerdown", event => {
  if (!sheet || mode !== "paint") return;

  const p = pixelAt(event);

  if (!p) return;

  // Alt-click or right-click picks the color under the cursor.
  if (event.altKey || event.button === 2) {
    setColor(fromArray(getPixel(p.x, p.y)));
    selected = p;
    updateReadout();
    requestDraw();
    return;
  }

  if (event.button !== 0) return;

  scroller.setPointerCapture(event.pointerId);
  startStroke(p);
});

scroller.addEventListener("pointerup", endStroke);
scroller.addEventListener("pointercancel", endStroke);

scroller.addEventListener("click", event => {
  if (!sheet || mode !== "select") return;

  const p = pixelAt(event);

  if (!p) return;

  // Shift-click: put the palette color on this pixel.
  if (event.shiftKey) {
    const keep = { ...color };

    select(p);
    setColor(keep);
    mergeKey = null;
    applyColorToSelection();
    return;
  }

  select(p);
});

scroller.addEventListener("contextmenu", event => {
  if (mode === "paint") event.preventDefault();
});

scroller.addEventListener("wheel", event => {
  if (!event.ctrlKey) return;

  event.preventDefault();
  stepZoom(event.deltaY < 0 ? 1 : -1, event.clientX, event.clientY);
}, { passive: false });

// ------------------------------------------
// Events: toolbar and palette
// ------------------------------------------

$("openBtn").addEventListener("click", openFile);
$("saveBtn").addEventListener("click", () => save(false));
$("saveAsBtn").addEventListener("click", () => save(true));
$("modeSelect").addEventListener("click", () => setMode("select"));
$("modePaint").addEventListener("click", () => setMode("paint"));
$("undoBtn").addEventListener("click", undo);
$("redoBtn").addEventListener("click", redo);
$("zoomIn").addEventListener("click", () => stepZoom(1));
$("zoomOut").addEventListener("click", () => stepZoom(-1));

$("mergeBtn").addEventListener("click", () => {
  if (!sheet) {
    status("Open a PNG first.");
    return;
  }

  $("mergeInput").click();
});

$("mergeInput").addEventListener("change", async event => {
  const file = event.target.files?.[0];

  event.target.value = "";

  if (file) await mergeFile(file);
});

$("gridBtn").addEventListener("click", () => {
  showGrid = !showGrid;
  $("gridBtn").classList.toggle("active", showGrid);
  requestDraw();
});

$("gotoBtn").addEventListener("click", () => {
  if (!sheet) return;

  const x = clamp(Math.floor(Number($("gotoX").value) || 0), 0, W - 1);
  const y = clamp(Math.floor(Number($("gotoY").value) || 0), 0, H - 1);

  centerOn(x, y);
  select({ x, y });
});

$("applyBtn").addEventListener("click", () => {
  if (!selected) {
    status("Click a pixel first.");
    return;
  }

  mergeKey = null;
  applyColorToSelection();
  status(`Applied ${toHex(color)} to [${selected.x}, ${selected.y}]`);
});

$("copyBtn").addEventListener("click", copyColor);
$("pasteBtn").addEventListener("click", pasteColor);
$("scanBtn").addEventListener("click", scanSheet);

$("fileInput").addEventListener("change", async event => {
  const file = event.target.files?.[0];

  event.target.value = "";

  if (file) {
    try {
      await loadFile(file);
    } catch (error) {
      status(error?.message || "Could not open that file.");
    }
  }
});

$("colorPicker").addEventListener("input", event => {
  const c = parseColor(event.target.value);

  if (c) userColor({ ...c, a: color.a }, event.target);
});

$("colorPicker").addEventListener("change", () => addRecent(color));

$("hexIn").addEventListener("input", event => {
  // Only apply live once it is a complete 6 or 8 digit value.
  if (!/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i.test(event.target.value.trim())) return;

  const c = parseColor(event.target.value);

  if (c) userColor(c, event.target);
});

$("hexIn").addEventListener("change", event => {
  const c = parseColor(event.target.value);

  if (c) {
    userColor(c, null);
    addRecent(c);
  }
});

for (const [key, number, range] of channels) {
  for (const input of [number, range]) {
    input.addEventListener("input", () => {
      const value = clamp(Math.round(Number(input.value) || 0), 0, 255);

      userColor({ ...color, [key]: value }, input);
    });

    input.addEventListener("change", () => addRecent(color));
  }
}

for (const id of ["recent", "sheetColors"]) {
  $(id).addEventListener("click", event => {
    const button = event.target.closest("button[data-c]");

    if (!button) return;

    mergeKey = null;
    userColor(fromArray(button.dataset.c.split(",").map(Number)), null);
  });
}

// Drag a PNG onto the page to open it.
window.addEventListener("dragover", event => event.preventDefault());

window.addEventListener("drop", async event => {
  event.preventDefault();

  const file = event.dataTransfer?.files?.[0];

  if (!file || !confirmDiscard()) return;

  try {
    await loadFile(file);
  } catch (error) {
    status(error?.message || "Could not open that file.");
  }
});

window.addEventListener("beforeunload", event => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

// ------------------------------------------
// Events: keyboard
// ------------------------------------------

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;

  if (ctrl && key === "s") {
    event.preventDefault();
    save(false);
    return;
  }

  // Let text fields keep their own editing keys.
  const target = event.target;
  const typing =
    target.tagName === "TEXTAREA" ||
    (target.tagName === "INPUT" && target.type !== "color" && target.type !== "range");

  if (typing || !sheet) return;

  if (ctrl && key === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  } else if (ctrl && key === "y") {
    event.preventDefault();
    redo();
  } else if (ctrl && key === "c") {
    event.preventDefault();
    copyColor();
  } else if (ctrl && key === "v") {
    event.preventDefault();
    pasteColor();
  } else if (!ctrl && key === "v") {
    setMode("select");
  } else if (!ctrl && key === "b") {
    setMode("paint");
  } else if (!ctrl && key === "g") {
    $("gridBtn").click();
  } else if (key === "escape") {
    select(null);
  } else if (key.startsWith("arrow")) {
    const from = selected ?? hover ?? { x: 0, y: 0 };

    const next = {
      x: clamp(from.x + (key === "arrowright") - (key === "arrowleft"), 0, W - 1),
      y: clamp(from.y + (key === "arrowdown") - (key === "arrowup"), 0, H - 1)
    };

    event.preventDefault();
    select(next);
    ensureVisible(next.x, next.y);
  }
});

// ------------------------------------------
// Start
// ------------------------------------------

setColor(color);
renderSwatches($("recent"), recent);
resizeView();

const startUrl = new URLSearchParams(location.search).get("src");

if (startUrl) loadFromUrl(startUrl);
