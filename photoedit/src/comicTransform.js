/**
 * Comic Transform Module
 * Applies cartoon/comic-style effects to the canvas image using glfx.js
 */

export class ComicTransform {
  constructor(canvas, bgCanvas, onStatus) {
    this.canvas = canvas;
    this.bgCanvas = bgCanvas;
    this.onStatus = onStatus;
  }

  applyComicEffect() {
    if (typeof window.fx === 'undefined') {
      this.onStatus('Comic effect requires WebGL, which is not available in this browser.', 'error');
      return false;
    }

    try {
      const fxCanvas = window.fx.canvas();
      const texture = fxCanvas.texture(this.bgCanvas);

      fxCanvas.draw(texture)
        .hueSaturation(0, 0.6)
        .brightnessContrast(0, 0.4)
        .ink(0.8)
        .update();

      // Copy the processed result from the WebGL canvas (glfx) back to the 2D bgCanvas,
      // converting from WebGL rendering context to a standard 2D canvas context.
      const ctx = this.bgCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
      ctx.drawImage(fxCanvas, 0, 0, this.bgCanvas.width, this.bgCanvas.height);

      texture.destroy();

      return true;
    } catch (err) {
      this.onStatus(`Comic effect failed: ${err.message || err}`, 'error');
      return false;
    }
  }
}
