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
    const EDGE_THRESHOLD_RATIO = 0.12;
    const DILATE_RADIUS = 1;

    function posterise(lum) {
      // Max output is 192 (75% grey) -- no non-edge region should be darker than 64
      if (lum > 220) return 192;   // highlights → 75% grey (not white)
      if (lum > 160) return 160;   // light mid-tones → light grey
      if (lum > 100) return 128;   // mid-tones → 50% grey
      if (lum > 50)  return 96;    // shadows → medium-light grey
      return 64;                    // deep shadows → still clearly grey, NOT near-black
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

      // Step 2: 3x3 box blur for denoising before edge detection
      const blurred = new Float32Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sum = 0, count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy, nx = x + dx;
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                sum += grey[ny * width + nx];
                count++;
              }
            }
          }
          blurred[y * width + x] = sum / count;
        }
      }

      // Step 3: Sobel edge detection on the blurred greyscale
      const edges = new Float32Array(width * height);
      let maxEdge = 0;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const tl = blurred[(y - 1) * width + (x - 1)];
          const tm = blurred[(y - 1) * width + x];
          const tr = blurred[(y - 1) * width + (x + 1)];
          const ml = blurred[y * width + (x - 1)];
          const mr = blurred[y * width + (x + 1)];
          const bl = blurred[(y + 1) * width + (x - 1)];
          const bm = blurred[(y + 1) * width + x];
          const br = blurred[(y + 1) * width + (x + 1)];

          const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
          const gy = -tl - 2 * tm - tr + bl + 2 * bm + br;
          const mag = Math.sqrt(gx * gx + gy * gy);
          edges[y * width + x] = mag;
          if (mag > maxEdge) maxEdge = mag;
        }
      }

      // Step 4: Dilate edges by DILATE_RADIUS pixels (morphological dilation)
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

      // Step 5: Posterise greyscale into comic brightness zones
      for (let i = 0; i < data.length; i += 4) {
        const px = i / 4;
        const v = posterise(grey[px]);
        data[i]     = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }

      // Step 6: Composite -- posterised base with thick black ink edges on top
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
