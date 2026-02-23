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
    const SATURATION_BOOST_FACTOR = 1.8;
    const CONTRAST_BOOST_FACTOR = 1.4;
    const EDGE_THRESHOLD_RATIO = 0.2; // pixels above this fraction of max edge magnitude are drawn as ink

    try {
      const ctx = this.bgCanvas.getContext('2d');
      const { width, height } = this.bgCanvas;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Step 1: Boost saturation and contrast in-place
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] / 255;
        let g = data[i + 1] / 255;
        let b = data[i + 2] / 255;

        // Saturation boost via HSL conversion
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        const delta = max - min;

        if (delta > 0) {
          const s = delta / (1 - Math.abs(2 * l - 1));
          const sBoosted = Math.min(s * SATURATION_BOOST_FACTOR, 1);
          const scale = sBoosted / s;

          r = l + (r - l) * scale;
          g = l + (g - l) * scale;
          b = l + (b - l) * scale;

          r = Math.max(0, Math.min(1, r));
          g = Math.max(0, Math.min(1, g));
          b = Math.max(0, Math.min(1, b));
        }

        // Contrast boost (centered on 0.5)
        r = Math.max(0, Math.min(1, (r - 0.5) * CONTRAST_BOOST_FACTOR + 0.5));
        g = Math.max(0, Math.min(1, (g - 0.5) * CONTRAST_BOOST_FACTOR + 0.5));
        b = Math.max(0, Math.min(1, (b - 0.5) * CONTRAST_BOOST_FACTOR + 0.5));

        data[i]     = r * 255;
        data[i + 1] = g * 255;
        data[i + 2] = b * 255;
      }

      ctx.putImageData(imageData, 0, 0);

      // Step 2: Build grayscale copy for Sobel edge detection
      const grey = new Float32Array(width * height);
      for (let i = 0; i < data.length; i += 4) {
        const px = i / 4;
        grey[px] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      // Sobel convolution — produces edge magnitude per pixel
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

      // Step 3: Overlay ink edges onto the colour image
      const out = ctx.getImageData(0, 0, width, height);
      const outData = out.data;
      const threshold = maxEdge * EDGE_THRESHOLD_RATIO;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const px = y * width + x;
          const mag = edges[px];
          if (mag > threshold) {
            // Blend towards dark ink proportionally to edge strength
            const t = Math.min((mag - threshold) / (maxEdge - threshold), 1);
            const i = px * 4;
            outData[i]     = Math.round(outData[i]     * (1 - t));
            outData[i + 1] = Math.round(outData[i + 1] * (1 - t));
            outData[i + 2] = Math.round(outData[i + 2] * (1 - t));
          }
        }
      }

      ctx.putImageData(out, 0, 0);

      return true;
    } catch (err) {
      this.onStatus(`Comic effect failed: ${err.message || err}`, 'error');
      return false;
    }
  }
}
