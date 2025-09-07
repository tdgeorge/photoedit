/**
 * Image Processing Module
 * Handles image loading, rotation, and basic processing
 */

export class ImageProcessor {
  constructor(canvas, bgCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bgCanvas = bgCanvas;
    this.bgCtx = bgCanvas.getContext('2d');
    
    // Enable image smoothing for better quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.bgCtx.imageSmoothingEnabled = true;
    this.bgCtx.imageSmoothingQuality = 'high';
  }

  async loadImage(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file.');
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Image file is too large. Please select a file under 10MB.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            this.processLoadedImage(img);
            resolve(img);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = event.target.result;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  processLoadedImage(img) {
    // Set canvas dimensions
    this.bgCanvas.width = img.width;
    this.bgCanvas.height = img.height;
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    
    // Draw image to background canvas
    this.bgCtx.drawImage(img, 0, 0);
    
    return {
      originalImageData: this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height),
      currentImageData: this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height)
    };
  }

  rotateImage() {
    // Create temporary canvas for rotation
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Swap dimensions for 90° rotation
    tempCanvas.width = this.bgCanvas.height;
    tempCanvas.height = this.bgCanvas.width;
    
    // Apply rotation transformation
    tempCtx.save();
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(Math.PI / 2);
    tempCtx.drawImage(this.bgCanvas, -this.bgCanvas.width / 2, -this.bgCanvas.height / 2);
    tempCtx.restore();
    
    // Update background canvas
    this.bgCanvas.width = tempCanvas.width;
    this.bgCanvas.height = tempCanvas.height;
    this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
    this.bgCtx.drawImage(tempCanvas, 0, 0);
    
    // Update display canvas
    this.canvas.width = this.bgCanvas.width;
    this.canvas.height = this.bgCanvas.height;
    
    return this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
  }

  redrawCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.bgCanvas, 0, 0, this.canvas.width, this.canvas.height);
  }

  scaleCanvasView() {
    const container = this.canvas.parentElement;
    const maxWidth = container.clientWidth - 40;
    const maxHeight = container.clientHeight - 40;
    
    const aspectRatio = this.bgCanvas.width / this.bgCanvas.height;
    let newWidth = this.bgCanvas.width;
    let newHeight = this.bgCanvas.height;
    
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }
    
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }
    
    this.canvas.style.width = `${newWidth}px`;
    this.canvas.style.height = `${newHeight}px`;
    
    this.redrawCanvas();
  }
}
