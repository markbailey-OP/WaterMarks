import { gameGrid } from "./gameState.js";
import { River, SnagBridge, Plain, Floor } from "./terrain.js";

const DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

// Swaps a tile while keeping any unit standing on it
// (for example, a flier hovering over a river).
function replaceTile(x, y, newTile) {
  const oldTile = gameGrid[y]?.[x];

  if (!oldTile) return;

  newTile.unit = oldTile.unit;
  gameGrid[y][x] = newTile;
}

// Transforms a destroyed terrain tile.
// Returns the coordinates of every tile that changed.
export function destroyTerrain(x, y) {
  const tile = gameGrid[y]?.[x];

  if (!tile) return [];

  switch (tile.name) {
    case "WeakWall":
      replaceTile(x, y, new Floor());
      return [{ x, y }];

    case "Snag": {
      const changed = [{ x, y }];

      replaceTile(x, y, new Plain());

      // Clearing the snag opens a crossing on adjacent river tiles.
      for (const dir of DIRECTIONS) {
        const nx = x + dir.x;
        const ny = y + dir.y;

        if (gameGrid[ny]?.[nx]?.name === "River") {
          replaceTile(nx, ny, new SnagBridge());
          changed.push({ x: nx, y: ny });
        }
      }

      return changed;
    }

    default:
      return [];
  }
}