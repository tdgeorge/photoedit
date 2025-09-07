/**
 * Color Adjustments Module
 * Handles RGB color manipulation
 */

export class ColorAdjustments {
  constructor() {
    this.adjustments = { red: 100, green: 100, blue: 100 };
  }

  setAdjustment(color, value) {
    this.adjustments[color] = parseInt(value, 10);
  }

  getAdjustments() {
    return { ...this.adjustments };
  }

  resetAdjustments() {
    this.adjustments = { red: 100, green: 100, blue: 100 };
  }

  applyToImageData(originalImageData, bgCtx) {
    const { red, green, blue } = this.adjustments;
    const rScale = red / 100;
    const gScale = green / 100;
    const bScale = blue / 100;
    
    // Create new image data with color adjustments
    const adjustedData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    
    // Apply color scaling
    for (let i = 0; i < adjustedData.data.length; i += 4) {
      adjustedData.data[i] = Math.min(255, Math.max(0, Math.round(adjustedData.data[i] * rScale)));
      adjustedData.data[i + 1] = Math.min(255, Math.max(0, Math.round(adjustedData.data[i + 1] * gScale)));
      adjustedData.data[i + 2] = Math.min(255, Math.max(0, Math.round(adjustedData.data[i + 2] * bScale)));
    }
    
    // Update background canvas
    bgCtx.putImageData(adjustedData, 0, 0);
    
    return bgCtx.getImageData(0, 0, adjustedData.width, adjustedData.height);
  }
}
