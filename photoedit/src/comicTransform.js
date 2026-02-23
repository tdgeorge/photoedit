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
    const BILATERAL_RADIUS = 6;
    const SIGMA_SPACE = 10;
    const SIGMA_COLOR = 25;
    const EDGE_THRESHOLD_RATIO = 0.15;
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

      // Step 1: Convert to greyscale from original pixel data
      const grey = new Float32Array(width * height);
      for (let i = 0; i < data.length; i += 4) {
        grey[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      // Step 2: Full 2D bilateral filter on greyscale
      // Pre-compute spatial Gaussian weights to avoid exp() inside the inner loop
      const r = BILATERAL_RADIUS;
      const diam = 2 * r + 1;
      const spatialWeights = new Float32Array(diam * diam);
      const twoSigmaSpaceSq = 2 * SIGMA_SPACE * SIGMA_SPACE;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          spatialWeights[(dy + r) * diam + (dx + r)] =
            Math.exp(-(dx * dx + dy * dy) / twoSigmaSpaceSq);
        }
      }

      const twoSigmaColorSq = 2 * SIGMA_COLOR * SIGMA_COLOR;
      const bilat = new Float32Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const centerVal = grey[y * width + x];
          let weightSum = 0;
          let valueSum = 0;
          for (let dy = -r; dy <= r; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -r; dx <= r; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              const neighborVal = grey[ny * width + nx];
              const intensityDiff = neighborVal - centerVal;
              const intensityWeight = Math.exp(
                -(intensityDiff * intensityDiff) / twoSigmaColorSq
              );
              const w = spatialWeights[(dy + r) * diam + (dx + r)] * intensityWeight;
              weightSum += w;
              valueSum += w * neighborVal;
            }
          }
          bilat[y * width + x] = valueSum / weightSum;
        }
      }

      // Step 3: Sobel edge detection on the bilaterally-filtered greyscale
      const edges = new Float32Array(width * height);
      let maxEdge = 0;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const tl = bilat[(y - 1) * width + (x - 1)];
          const tm = bilat[(y - 1) * width + x];
          const tr = bilat[(y - 1) * width + (x + 1)];
          const ml = bilat[y * width + (x - 1)];
          const mr = bilat[y * width + (x + 1)];
          const bl = bilat[(y + 1) * width + (x - 1)];
          const bm = bilat[(y + 1) * width + x];
          const br = bilat[(y + 1) * width + (x + 1)];

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

      // Step 5: Posterise using bilateral-smoothed luma for clean flat zones
      for (let i = 0; i < data.length; i += 4) {
        const px = i / 4;
        const v = posterise(bilat[px]);
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
