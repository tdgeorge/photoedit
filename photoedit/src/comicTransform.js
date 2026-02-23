/**
 * Comic Transform Module
 * Applies cartoon/comic-style effects to the canvas image using the Canvas 2D API.
 * No WebGL or external libraries required.
 */

export class ComicTransform {
  constructor(canvas, bgCanvas, onStatus) {
    this.canvas = canvas;
    this.bgCanvas = bgCanvas;
    this.onStatus = onStatus;
  }

  applyComicEffect() {
    const EDGE_THRESHOLD_RATIO = 0.08;
    const DILATE_RADIUS = 1;

    function posterise(lum) {
      if (lum > 220) return 255;
      if (lum > 170) return 210;
      if (lum > 110) return 155;
      if (lum > 60)  return 90;
      return 30;
    }

    try {
      const ctx = this.bgCanvas.getContext('2d');
      const { width, height } = this.bgCanvas;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Step 1: Convert to greyscale from original pixel data (no contrast yet)
      const grey = new Float32Array(width * height);
      for (let i = 0; i < data.length; i += 4) {
        const px = i / 4;
        grey[px] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      // Step 2: Sobel edge detection on the original greyscale
      const edges = new Float32Array(width * height);
      let maxEdge = 0;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const tl = grey[(y - 1) * width + (x - 1)];
          const tm = grey[(y - 1) * width + x];
          const tr = grey[(y - 1) * width + (x + 1)];
          const ml = grey[y * width + (x - 1)];
          const mr = grey[y * width + (x + 1)];
          const bl = grey[(y + 1) * width + (x - 1)];
          const bm = grey[(y + 1) * width + x];
          const br = grey[(y + 1) * width + (x + 1)];

          const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
          const gy = -tl - 2 * tm - tr + bl + 2 * bm + br;
          const mag = Math.sqrt(gx * gx + gy * gy);
          edges[y * width + x] = mag;
          if (mag > maxEdge) maxEdge = mag;
        }
      }

      // Step 3: Dilate edges by DILATE_RADIUS pixels (morphological dilation)
      const threshold = maxEdge * EDGE_THRESHOLD_RATIO;
      const dilated = new Uint8Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (edges[y * width + x] > threshold) {
            for (let dy = -DILATE_RADIUS; dy <= DILATE_RADIUS; dy++) {
              for (let dx = -DILATE_RADIUS; dx <= DILATE_RADIUS; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                  dilated[ny * width + nx] = 1;
                }
              }
            }
          }
        }
      }

      // Step 4: Posterise greyscale into comic brightness zones
      for (let i = 0; i < data.length; i += 4) {
        const px = i / 4;
        const v = posterise(grey[px]);
        data[i]     = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }

      // Step 5: Composite — posterised base with thick black ink edges on top
      for (let px = 0; px < width * height; px++) {
        if (dilated[px]) {
          const i = px * 4;
          data[i]     = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      return true;
    } catch (err) {
      this.onStatus(`Comic effect failed: ${err.message || err}`, 'error');
      return false;
    }
  }
}
