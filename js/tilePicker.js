import { TILESET_SRC, SOURCE_TILE } from "./tileset.js";

const ZOOM = 3;                    // on-screen pixels per sheet pixel
const CELL = SOURCE_TILE * ZOOM;

const canvas = document.getElementById("sheet");
const readout = document.getElementById("readout");
const ctx = canvas.getContext("2d");

let image = null;
let hover = null;
let locked = null;

function cellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    col: Math.floor((event.clientX - rect.left) / CELL),
    row: Math.floor((event.clientY - rect.top) / CELL)
  };
}

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Grid lines.
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x <= canvas.width; x += CELL) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
  }

  for (let y = 0; y <= canvas.height; y += CELL) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
  }

  ctx.stroke();

  for (const [cell, color] of [[hover, "#ffdf55"], [locked, "#ff3030"]]) {
    if (!cell) continue;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(cell.col * CELL + 1, cell.row * CELL + 1, CELL - 2, CELL - 2);
  }
}

function show(cell) {
  readout.textContent = cell
    ? `[${cell.col}, ${cell.row}]   (pixel ${cell.col * SOURCE_TILE}, ${cell.row * SOURCE_TILE})`
    : "Hover a tile. Click to lock it.";
}

const img = new Image();

img.onload = () => {
  image = img;
  canvas.width = img.width * ZOOM;
  canvas.height = img.height * ZOOM;

  canvas.addEventListener("mousemove", event => {
    hover = cellFromEvent(event);
    if (!locked) show(hover);
    draw();
  });

  canvas.addEventListener("click", event => {
    locked = cellFromEvent(event);
    show(locked);
    draw();
  });

  draw();
};

img.onerror = () => {
  readout.textContent = `Could not load ${TILESET_SRC}`;
};

img.src = TILESET_SRC;