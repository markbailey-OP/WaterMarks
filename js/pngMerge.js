// ==========================================
// PNG MERGE
// ==========================================

// Decodes a File, Blob or URL into raw RGBA pixels, without colour conversion.
async function loadPixels(source) {
  let blob = source;

  if (typeof source === "string") {
    const response = await fetch(source);

    if (!response.ok) throw new Error(`Could not load ${source} (HTTP ${response.status}).`);

    blob = await response.blob();
  }

  const bitmap = await createImageBitmap(blob, {
    premultiplyAlpha: "none",
    colorSpaceConversion: "none"
  });

  const canvas = document.createElement("canvas");

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// True if every pixel in the rectangle is fully transparent. Anything past
// the edge of the image counts as empty.
function isRegionEmpty(image, x0, y0, width, height) {
  const xEnd = Math.min(image.width, x0 + width);
  const yEnd = Math.min(image.height, y0 + height);

  for (let y = Math.max(0, y0); y < yEnd; y++) {
    for (let x = Math.max(0, x0); x < xEnd; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] !== 0) return false;
    }
  }

  return true;
}

// Works out where the added image goes. `base` is the ImageData of the sheet.
//
// With an anchor pixel { x, y }:
//   1. RIGHT of the anchor if that space is empty (no pixels, or only fully
//      transparent ones): the added image's top-left goes at (x + 1, y).
//   2. Otherwise BELOW the anchor if that space is empty: top-left at (x, y + 1).
//   3. If both are taken, it falls back to the no-anchor rules (below), and
//      `blocked` is true.
//
// Without an anchor:
//   base wider than the added image -> BELOW the sheet (top-left of the added
//                                      image under the sheet's bottom-left)
//   otherwise                       -> to the RIGHT of the sheet (top-left after
//                                      the sheet's top-right)
//
// The canvas grows to the right and down to hold the result. Existing pixels
// never move, so sprite coordinates stay valid.
export function planMerge(base, addedWidth, addedHeight, anchor = null) {
  let side = null;
  let x = 0;
  let y = 0;
  let blocked = false;

  if (anchor) {
    if (isRegionEmpty(base, anchor.x + 1, anchor.y, addedWidth, addedHeight)) {
      side = "right of the pixel";
      x = anchor.x + 1;
      y = anchor.y;
    } else if (isRegionEmpty(base, anchor.x, anchor.y + 1, addedWidth, addedHeight)) {
      side = "below the pixel";
      x = anchor.x;
      y = anchor.y + 1;
    } else {
      blocked = true;
    }
  }

  if (!side) {
    const below = base.width > addedWidth;

    side = below ? "below the sheet" : "right of the sheet";
    x = below ? 0 : base.width;
    y = below ? base.height : 0;
  }

  return {
    side,
    blocked,
    x,
    y,
    width: Math.max(base.width, x + addedWidth),
    height: Math.max(base.height, y + addedHeight)
  };
}

// Adds `file` onto `otherFile`. Returns { file, plan }: a single PNG File and
// the placement that was used (see planMerge). `anchor` is an optional
// { x, y } pixel of `otherFile`. Pixels are copied with putImageData, so
// nothing is blended or resampled, and any area neither image covers is
// fully transparent.
// `file` and `otherFile` can each be a File, a Blob or a URL string.
export async function mergePngWithInfo(file, otherFile, name = "merged.png", anchor = null) {
  const [added, base] = await Promise.all([
    loadPixels(file),
    loadPixels(otherFile)
  ]);

  const plan = planMerge(base, added.width, added.height, anchor);

  const canvas = document.createElement("canvas");

  canvas.width = plan.width;
  canvas.height = plan.height;

  const ctx = canvas.getContext("2d");

  ctx.putImageData(base, 0, 0);
  ctx.putImageData(added, plan.x, plan.y);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));

  if (!blob) throw new Error("Could not encode the merged PNG.");

  return {
    file: new File([blob], name, { type: "image/png" }),
    plan
  };
}

// Same as above, returning just the File.
export async function mergePng(file, otherFile, name = "merged.png", anchor = null) {
  return (await mergePngWithInfo(file, otherFile, name, anchor)).file;
}
