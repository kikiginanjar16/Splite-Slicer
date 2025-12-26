
import { SpriteRect, GridSettings } from '../types';

/**
 * Detects sprites by scanning non-transparent pixels and finding connected components.
 * Uses a Stack-based DFS for better performance than BFS shift().
 */
export const detectSprites = (
  canvas: HTMLCanvasElement,
  minSize: number = 2,
  padding: number = 0
): SpriteRect[] => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const visited = new Uint8Array(width * height);
  const rects: SpriteRect[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // Alpha threshold: pixels with alpha > 10 are considered part of a sprite
      const alpha = data[idx * 4 + 3];

      if (alpha > 10 && !visited[idx]) {
        let minX = x, maxX = x, minY = y, maxY = y;
        const stack: [number, number][] = [[x, y]];
        visited[idx] = 1;

        while (stack.length > 0) {
          const [currX, currY] = stack.pop()!;
          
          if (currX < minX) minX = currX;
          if (currX > maxX) maxX = currX;
          if (currY < minY) minY = currY;
          if (currY > maxY) maxY = currY;

          // Check 4-connectivity
          const neighbors = [
            [currX + 1, currY],
            [currX - 1, currY],
            [currX, currY + 1],
            [currX, currY - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (data[nIdx * 4 + 3] > 10 && !visited[nIdx]) {
                visited[nIdx] = 1;
                stack.push([nx, ny]);
              }
            }
          }
        }

        const w = (maxX - minX) + 1;
        const h = (maxY - minY) + 1;

        if (w >= minSize && h >= minSize) {
          rects.push({
            id: crypto.randomUUID(),
            x: Math.max(0, minX - padding),
            y: Math.max(0, minY - padding),
            width: Math.min(width - minX, w + padding * 2),
            height: Math.min(height - minY, h + padding * 2),
            name: `sprite_${rects.length + 1}`
          });
        }
      }
    }
  }

  return rects;
};

/**
 * Generates sprite rectangles based on a grid.
 */
export const generateGridRects = (
  width: number,
  height: number,
  settings: GridSettings
): SpriteRect[] => {
  const rects: SpriteRect[] = [];
  const { columns, rows, cellWidth, cellHeight, padding, margin } = settings;

  // Use cellWidth/Height if provided, otherwise calculate from columns/rows
  const actualW = cellWidth > 0 ? cellWidth : (width - margin * 2) / columns;
  const actualH = cellHeight > 0 ? cellHeight : (height - margin * 2) / rows;
  const actualCols = cellWidth > 0 ? Math.floor((width - margin * 2) / cellWidth) : columns;
  const actualRows = cellHeight > 0 ? Math.floor((height - margin * 2) / cellHeight) : rows;

  for (let r = 0; r < actualRows; r++) {
    for (let c = 0; c < actualCols; c++) {
      rects.push({
        id: crypto.randomUUID(),
        x: margin + (c * actualW) + padding,
        y: margin + (r * actualH) + padding,
        width: actualW - (padding * 2),
        height: actualH - (padding * 2),
        name: `sprite_${r}_${c}`
      });
    }
  }

  return rects;
};

export const sliceToBlob = async (
  canvas: HTMLCanvasElement, 
  rect: SpriteRect
): Promise<Blob | null> => {
  const offscreen = document.createElement('canvas');
  offscreen.width = rect.width;
  offscreen.height = rect.height;
  const octx = offscreen.getContext('2d');
  if (!octx) return null;

  octx.drawImage(
    canvas,
    rect.x, rect.y, rect.width, rect.height,
    0, 0, rect.width, rect.height
  );

  return new Promise((resolve) => {
    offscreen.toBlob((blob) => resolve(blob), 'image/png');
  });
};
