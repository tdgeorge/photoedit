/**
 * Crop Tool Module
 * Handles interactive cropping functionality
 */

export class CropTool {
  constructor(canvas, bgCanvas) {
    this.canvas = canvas;
    this.bgCanvas = bgCanvas;
    this.bgCtx = bgCanvas.getContext('2d');
    this.ctx = canvas.getContext('2d');
    
    this.isCropping = false;
    this.cropStart = null;
    this.cropEnd = null;
    
    this.bindCanvasEvents();
  }

  bindCanvasEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleCropStart(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCropMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleCropEnd(e));
    
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleCropStart(e);
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.handleCropMove(e);
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleCropEnd(e);
    }, { passive: false });
  }

  handleCropStart(event) {
    this.isCropping = true;
    this.cropStart = this.getEventPosition(event);
    this.canvas.style.cursor = 'crosshair';
  }

  handleCropMove(event) {
    if (!this.isCropping || !this.cropStart) return;
    
    this.cropEnd = this.getEventPosition(event);
    this.drawCropOverlay();
  }

  handleCropEnd(event) {
    if (!this.isCropping) return;
    
    this.isCropping = false;
    this.cropEnd = this.getEventPosition(event);
    this.canvas.style.cursor = 'default';
    
    return this.isValidCropArea();
  }

  applyCrop() {
    if (!this.isValidCropArea()) {
      throw new Error('Please select a crop area first.');
    }

    const { x, y, width, height } = this.getCropDimensions();
    
    if (width < 10 || height < 10) {
      throw new Error('Crop area is too small.');
    }
    
    // Extract cropped image data
    const croppedData = this.bgCtx.getImageData(x, y, width, height);
    
    // Update canvas dimensions
    this.bgCanvas.width = width;
    this.bgCanvas.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Apply cropped data
    this.bgCtx.putImageData(croppedData, 0, 0);
    
    // Reset crop state
    this.cropStart = null;
    this.cropEnd = null;
    
    return this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
  }

  getEventPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if (event.type.startsWith('touch')) {
      const touch = event.touches[0] || event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;
    
    return {
      x: Math.round(relativeX * this.bgCanvas.width),
      y: Math.round(relativeY * this.bgCanvas.height)
    };
  }

  isValidCropArea() {
    return this.cropStart && this.cropEnd &&
           Math.abs(this.cropEnd.x - this.cropStart.x) > 5 &&
           Math.abs(this.cropEnd.y - this.cropStart.y) > 5;
  }

  getCropDimensions() {
    if (!this.isValidCropArea()) return null;
    
    const x = Math.min(this.cropStart.x, this.cropEnd.x);
    const y = Math.min(this.cropStart.y, this.cropEnd.y);
    const width = Math.abs(this.cropEnd.x - this.cropStart.x);
    const height = Math.abs(this.cropEnd.y - this.cropStart.y);
    
    return { x, y, width, height };
  }

  drawCropOverlay() {
    if (!this.isValidCropArea()) return;
    
    // Redraw canvas first
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.bgCanvas, 0, 0, this.canvas.width, this.canvas.height);
    
    // Calculate overlay position
    const relativeStartX = this.cropStart.x / this.bgCanvas.width;
    const relativeStartY = this.cropStart.y / this.bgCanvas.height;
    const relativeEndX = this.cropEnd.x / this.bgCanvas.width;
    const relativeEndY = this.cropEnd.y / this.bgCanvas.height;
    
    const x = relativeStartX * this.canvas.width;
    const y = relativeStartY * this.canvas.height;
    const width = (relativeEndX - relativeStartX) * this.canvas.width;
    const height = (relativeEndY - relativeStartY) * this.canvas.height;
    
    this.ctx.save();
    this.ctx.strokeStyle = '#667eea';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]);
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
    this.ctx.fillRect(x, y, width, height);
    this.ctx.restore();
  }

  clearCropOverlay() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.bgCanvas, 0, 0, this.canvas.width, this.canvas.height);
  }
}
