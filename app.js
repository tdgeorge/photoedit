/**
 * Modern Photo Editor Application
 * Enhanced for cross-browser compatibility (Chrome, Safari, Firefox, Edge)
 * Features: Image upload, rotate, crop, color adjustments, save
 */

class PhotoEditor {
  constructor() {
    // Initialize DOM elements
    this.initializeElements();
    
    // Initialize canvases
    this.initializeCanvases();
    
    // Initialize state
    this.initializeState();
    
    // Bind event listeners
    this.bindEvents();
    
    // Set initial UI state
    this.updateUI();
    
    console.log('Photo Editor initialized successfully');
  }

  initializeElements() {
    this.elements = {
      imageLoader: document.getElementById('imageLoader'),
      canvas: document.getElementById('imageCanvas'),
      rotateBtn: document.getElementById('rotateBtn'),
      cropBtn: document.getElementById('cropBtn'),
      resetBtn: document.getElementById('resetBtn'),
      saveBtn: document.getElementById('saveBtn'),
      fftBtn: document.getElementById('fftBtn'), // New FFT button
      redSlider: document.getElementById('redSlider'),
      greenSlider: document.getElementById('greenSlider'),
      blueSlider: document.getElementById('blueSlider'),
      redValue: document.getElementById('redValue'),
      greenValue: document.getElementById('greenValue'),
      blueValue: document.getElementById('blueValue'),
      statusMessage: document.getElementById('status-message'),
      cropOverlay: document.getElementById('crop-overlay')
    };

    // Validate required elements
    const requiredElements = ['imageLoader', 'canvas', 'rotateBtn', 'cropBtn', 'saveBtn', 'fftBtn'];
    const missingElements = requiredElements.filter(id => !this.elements[id]);
    
    if (missingElements.length > 0) {
      throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
    }
  }

  initializeCanvases() {
    this.ctx = this.elements.canvas.getContext('2d');
    
    // Background canvas for full-resolution processing
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d');
    
    // Enable image smoothing for better quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.bgCtx.imageSmoothingEnabled = true;
    this.bgCtx.imageSmoothingQuality = 'high';
  }

  initializeState() {
    this.state = {
      originalImage: null,
      currentImageData: null,
      originalImageData: null,
      isImageLoaded: false,
      isCropping: false,
      cropStart: null,
      cropEnd: null,
      colorAdjustments: { red: 100, green: 100, blue: 100 }
    };
  }

  bindEvents() {
    // File upload
    this.elements.imageLoader.addEventListener('change', (e) => this.handleFileUpload(e));
    
    // Tool buttons
    this.elements.rotateBtn.addEventListener('click', () => this.rotateImage());
    this.elements.cropBtn.addEventListener('click', () => this.applyCrop());
    this.elements.resetBtn?.addEventListener('click', () => this.resetImage());
    this.elements.saveBtn.addEventListener('click', () => this.saveImage());
    this.elements.fftBtn.addEventListener('click', () => this.computeFFT()); // New FFT handler
    
    // Color sliders
    ['red', 'green', 'blue'].forEach(color => {
      const slider = this.elements[`${color}Slider`];
      if (slider) {
        slider.addEventListener('input', () => this.handleColorAdjustment(color, slider.value));
        slider.addEventListener('change', () => this.handleColorAdjustment(color, slider.value));
      }
    });
    
    // Canvas events for cropping
    this.bindCanvasEvents();
    
    // Window resize
    window.addEventListener('resize', () => this.debounce(() => this.scaleCanvasView(), 250));
  }

  bindCanvasEvents() {
    const canvas = this.elements.canvas;
    
    // Mouse events
    canvas.addEventListener('mousedown', (e) => this.handleCropStart(e));
    canvas.addEventListener('mousemove', (e) => this.handleCropMove(e));
    canvas.addEventListener('mouseup', (e) => this.handleCropEnd(e));
    
    // Touch events (with preventDefault for Safari compatibility)
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleCropStart(e);
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.handleCropMove(e);
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleCropEnd(e);
    }, { passive: false });
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showStatusMessage('Please select a valid image file.', 'error');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showStatusMessage('Image file is too large. Please select a file under 10MB.', 'error');
      return;
    }

    try {
      this.showStatusMessage('Loading image...', 'info');
      await this.loadImage(file);
      this.showStatusMessage('Image loaded successfully!', 'success');
    } catch (error) {
      console.error('Error loading image:', error);
      this.showStatusMessage('Failed to load image. Please try again.', 'error');
    }
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            this.processLoadedImage(img);
            resolve();
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
    // Store original image
    this.state.originalImage = img;
    
    // Set canvas dimensions
    this.bgCanvas.width = img.width;
    this.bgCanvas.height = img.height;
    this.elements.canvas.width = img.width;
    this.elements.canvas.height = img.height;
    
    // Draw image to background canvas
    this.bgCtx.drawImage(img, 0, 0);
    
    // Store original image data
    this.state.originalImageData = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
    this.state.currentImageData = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
    
    // Update display
    this.redrawCanvas();
    this.scaleCanvasView();
    
    // Reset sliders
    this.resetColorSliders();
    
    // Update state
    this.state.isImageLoaded = true;
    this.updateUI();
  }

  rotateImage() {
    if (!this.state.isImageLoaded) {
      this.showStatusMessage('Please load an image first.', 'warning');
      return;
    }

    try {
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
      this.elements.canvas.width = this.bgCanvas.width;
      this.elements.canvas.height = this.bgCanvas.height;
      
      // Update image data
      this.state.currentImageData = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
      this.state.originalImageData = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
      
      // Redraw and scale
      this.applyColorAdjustments();
      this.scaleCanvasView();
      
      this.showStatusMessage('Image rotated successfully!', 'success');
    } catch (error) {
      console.error('Error rotating image:', error);
      this.showStatusMessage('Failed to rotate image.', 'error');
    }
  }

  handleCropStart(event) {
    if (!this.state.isImageLoaded) return;
    
    this.state.isCropping = true;
    this.state.cropStart = this.getEventPosition(event);
    this.elements.canvas.style.cursor = 'crosshair';
  }

  handleCropMove(event) {
    if (!this.state.isCropping || !this.state.cropStart) return;
    
    this.state.cropEnd = this.getEventPosition(event);
    this.drawCropOverlay();
  }

  handleCropEnd(event) {
    if (!this.state.isCropping) return;
    
    this.state.isCropping = false;
    this.state.cropEnd = this.getEventPosition(event);
    this.elements.canvas.style.cursor = 'default';
    
    // Show crop button state if valid crop area
    if (this.isValidCropArea()) {
      this.elements.cropBtn.style.background = '#48bb78';
      this.elements.cropBtn.style.borderColor = '#48bb78';
    }
  }

  applyCrop() {
    if (!this.state.isImageLoaded || !this.isValidCropArea()) {
      this.showStatusMessage('Please select a crop area first.', 'warning');
      return;
    }

    try {
      const { x, y, width, height } = this.getCropDimensions();
      
      // Validate crop dimensions
      if (width < 10 || height < 10) {
        this.showStatusMessage('Crop area is too small.', 'warning');
        return;
      }
      
      // Extract cropped image data
      const croppedData = this.bgCtx.getImageData(x, y, width, height);
      
      // Update canvas dimensions
      this.bgCanvas.width = width;
      this.bgCanvas.height = height;
      this.elements.canvas.width = width;
      this.elements.canvas.height = height;
      
      // Apply cropped data
      this.bgCtx.putImageData(croppedData, 0, 0);
      
      // Reset crop state
      this.state.cropStart = null;
      this.state.cropEnd = null;
      
      // Update image data
      this.state.currentImageData = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
      this.state.originalImageData = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
      
      // Redraw and scale
      this.applyColorAdjustments();
      this.scaleCanvasView();
      this.clearCropOverlay();
      
      // Reset crop button style
      this.elements.cropBtn.style.background = '';
      this.elements.cropBtn.style.borderColor = '';
      
      this.showStatusMessage('Image cropped successfully!', 'success');
    } catch (error) {
      console.error('Error cropping image:', error);
      this.showStatusMessage('Failed to crop image.', 'error');
    }
  }

  resetImage() {
    if (!this.state.originalImage) {
      this.showStatusMessage('No image to reset.', 'warning');
      return;
    }

    try {
      // Reload original image
      this.processLoadedImage(this.state.originalImage);
      this.showStatusMessage('Image reset to original.', 'success');
    } catch (error) {
      console.error('Error resetting image:', error);
      this.showStatusMessage('Failed to reset image.', 'error');
    }
  }

  saveImage() {
    if (!this.state.isImageLoaded) {
      this.showStatusMessage('No image to save.', 'warning');
      return;
    }

    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `edited-photo-${timestamp}.png`;
      
      // Get high-quality image data
      const dataUrl = this.bgCanvas.toDataURL('image/png', 1.0);
      
      // Detect iOS Chrome specifically
      const isIOSChrome = /CriOS/.test(navigator.userAgent) && /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isMobileSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
      const isDesktop = !/iPhone|iPad|iPod|Android/.test(navigator.userAgent);
      
      if (isIOSChrome) {
        // iOS Chrome: Open image in new tab for user to save manually
        this.handleIOSChromeSave(dataUrl, filename);
      } else if (isMobileSafari) {
        // iOS Safari: Use the standard download approach
        this.handleStandardSave(dataUrl, filename);
      } else if (isDesktop) {
        // Desktop browsers: Standard download
        this.handleStandardSave(dataUrl, filename);
      } else {
        // Other mobile browsers: Try standard first, fallback to new tab
        try {
          this.handleStandardSave(dataUrl, filename);
        } catch (error) {
          this.handleIOSChromeSave(dataUrl, filename);
        }
      }
      
    } catch (error) {
      console.error('Error saving image:', error);
      this.showStatusMessage('Failed to save image. Please try again.', 'error');
    }
  }

  handleStandardSave(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.style.display = 'none';
    
    // Add to DOM, click, and remove
    document.body.appendChild(link);
    
    // Use setTimeout to ensure the element is in the DOM
    setTimeout(() => {
      link.click();
      document.body.removeChild(link);
      this.showStatusMessage('Image saved successfully!', 'success');
    }, 100);
  }

  handleIOSChromeSave(dataUrl, filename) {
    // For iOS Chrome, we need to open in a new window/tab
    // and provide instructions to the user
    try {
      // Try to open in new tab
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Save Your Edited Photo</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                text-align: center;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                margin: 20px 0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .instructions {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #2196f3;
              }
              .filename {
                font-family: monospace;
                background: #f5f5f5;
                padding: 8px;
                border-radius: 4px;
                display: inline-block;
                margin: 10px 0;
              }
              button {
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                margin: 10px;
              }
              button:hover {
                background: #5a67d8;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📸 Your Edited Photo</h1>
              <img src="${dataUrl}" alt="Edited photo">
              
              <div class="instructions">
                <h3>📱 How to save on iOS Chrome:</h3>
                <ol style="text-align: left;">
                  <li>Long press on the image above</li>
                  <li>Select "Save to Photos" or "Download Image"</li>
                  <li>The image will be saved to your Photos app</li>
                </ol>
              </div>
              
              <div class="filename">
                Suggested filename: ${filename}
              </div>
              
              <button onclick="window.close()">Close This Tab</button>
            </div>
          </body>
          </html>
        `);
        newWindow.document.close();
        
        this.showStatusMessage('Image opened in new tab. Follow instructions to save.', 'info');
      } else {
        // Fallback: try to trigger download anyway
        this.handleStandardSave(dataUrl, filename);
      }
    } catch (error) {
      console.error('Error opening save window:', error);
      // Final fallback: show the data URL directly
      this.showDataUrlFallback(dataUrl, filename);
    }
  }

  showDataUrlFallback(dataUrl, filename) {
    // Create a modal-like overlay with the image
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    overlay.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 12px; max-width: 90%; max-height: 90%; overflow: auto; text-align: center;">
        <h3>📸 Your Edited Photo</h3>
        <img src="${dataUrl}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0;" alt="Edited photo">
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left;">
          <strong>📱 To save this image:</strong>
          <br>1. Long press on the image above
          <br>2. Select "Save to Photos" or "Download Image"
          <br>3. The image will be saved to your device
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;">
          Close
        </button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    this.showStatusMessage('Long press the image to save it to your photos.', 'info');
  }

  handleColorAdjustment(color, value) {
    const numValue = parseInt(value, 10);
    this.state.colorAdjustments[color] = numValue;
    
    // Update display value
    const valueElement = this.elements[`${color}Value`];
    if (valueElement) {
      valueElement.textContent = numValue;
    }
    
    // Update slider aria-valuenow for accessibility
    const slider = this.elements[`${color}Slider`];
    if (slider) {
      slider.setAttribute('aria-valuenow', numValue);
    }
    
    // Apply color adjustments
    this.applyColorAdjustments();
  }

  applyColorAdjustments() {
    if (!this.state.originalImageData) return;
    
    const { red, green, blue } = this.state.colorAdjustments;
    const rScale = red / 100;
    const gScale = green / 100;
    const bScale = blue / 100;
    
    // Create new image data with color adjustments
    const adjustedData = new ImageData(
      new Uint8ClampedArray(this.state.originalImageData.data),
      this.state.originalImageData.width,
      this.state.originalImageData.height
    );
    
    // Apply color scaling
    for (let i = 0; i < adjustedData.data.length; i += 4) {
      adjustedData.data[i] = Math.min(255, Math.max(0, Math.round(adjustedData.data[i] * rScale)));
      adjustedData.data[i + 1] = Math.min(255, Math.max(0, Math.round(adjustedData.data[i + 1] * gScale)));
      adjustedData.data[i + 2] = Math.min(255, Math.max(0, Math.round(adjustedData.data[i + 2] * bScale)));
    }
    
    // Update background canvas
    this.bgCtx.putImageData(adjustedData, 0, 0);
    
    // Update current image data
    this.state.currentImageData = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
    
    // Redraw display canvas
    this.redrawCanvas();
  }

  getEventPosition(event) {
    const rect = this.elements.canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if (event.type.startsWith('touch')) {
      const touch = event.touches[0] || event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    // Calculate relative position within the displayed canvas
    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;
    
    // Convert to background canvas coordinates
    return {
      x: Math.round(relativeX * this.bgCanvas.width),
      y: Math.round(relativeY * this.bgCanvas.height)
    };
  }

  isValidCropArea() {
    return this.state.cropStart && this.state.cropEnd &&
           Math.abs(this.state.cropEnd.x - this.state.cropStart.x) > 5 &&
           Math.abs(this.state.cropEnd.y - this.state.cropStart.y) > 5;
  }

  getCropDimensions() {
    if (!this.isValidCropArea()) return null;
    
    const x = Math.min(this.state.cropStart.x, this.state.cropEnd.x);
    const y = Math.min(this.state.cropStart.y, this.state.cropEnd.y);
    const width = Math.abs(this.state.cropEnd.x - this.state.cropStart.x);
    const height = Math.abs(this.state.cropEnd.y - this.state.cropStart.y);
    
    return { x, y, width, height };
  }

  drawCropOverlay() {
    if (!this.isValidCropArea()) return;
    
    this.redrawCanvas();
    
    // Calculate relative positions (0 to 1) based on background canvas
    const relativeStartX = this.state.cropStart.x / this.bgCanvas.width;
    const relativeStartY = this.state.cropStart.y / this.bgCanvas.height;
    const relativeEndX = this.state.cropEnd.x / this.bgCanvas.width;
    const relativeEndY = this.state.cropEnd.y / this.bgCanvas.height;
    
    // Convert to display canvas coordinates
    const x = relativeStartX * this.elements.canvas.width;
    const y = relativeStartY * this.elements.canvas.height;
    const width = (relativeEndX - relativeStartX) * this.elements.canvas.width;
    const height = (relativeEndY - relativeStartY) * this.elements.canvas.height;
    
    this.ctx.save();
    this.ctx.strokeStyle = '#667eea';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]);
    
    this.ctx.strokeRect(x, y, width, height);
    
    // Add semi-transparent overlay
    this.ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
    this.ctx.fillRect(x, y, width, height);
    
    this.ctx.restore();
  }

  clearCropOverlay() {
    this.redrawCanvas();
  }

  redrawCanvas() {
    this.ctx.clearRect(0, 0, this.elements.canvas.width, this.elements.canvas.height);
    this.ctx.drawImage(this.bgCanvas, 0, 0, this.elements.canvas.width, this.elements.canvas.height);
  }

  scaleCanvasView() {
    if (!this.state.isImageLoaded) return;
    
    const container = this.elements.canvas.parentElement;
    const maxWidth = container.clientWidth - 40; // Account for padding
    const maxHeight = container.clientHeight - 40;
    
    const aspectRatio = this.bgCanvas.width / this.bgCanvas.height;
    let newWidth = this.bgCanvas.width;
    let newHeight = this.bgCanvas.height;
    
    // Scale down if too large
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }
    
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }
    
    // Apply styles
    this.elements.canvas.style.width = `${newWidth}px`;
    this.elements.canvas.style.height = `${newHeight}px`;
    
    this.redrawCanvas();
  }

  resetColorSliders() {
    ['red', 'green', 'blue'].forEach(color => {
      const slider = this.elements[`${color}Slider`];
      const valueElement = this.elements[`${color}Value`];
      
      if (slider) {
        slider.value = 100;
        slider.setAttribute('aria-valuenow', '100');
      }
      
      if (valueElement) {
        valueElement.textContent = '100';
      }
      
      this.state.colorAdjustments[color] = 100;
    });
  }

  updateUI() {
    const hasImage = this.state.isImageLoaded;
    
    // Enable/disable buttons
    this.elements.rotateBtn.disabled = !hasImage;
    this.elements.cropBtn.disabled = !hasImage;
    this.elements.saveBtn.disabled = !hasImage;
    this.elements.fftBtn.disabled = !hasImage; // Enable/disable FFT button
    
    if (this.elements.resetBtn) {
      this.elements.resetBtn.disabled = !hasImage;
    }
    
    // Update button styles
    [this.elements.rotateBtn, this.elements.cropBtn, this.elements.saveBtn, this.elements.fftBtn].forEach(btn => {
      if (btn) {
        btn.style.opacity = hasImage ? '1' : '0.5';
        btn.style.cursor = hasImage ? 'pointer' : 'not-allowed';
      }
    });
  }

  showStatusMessage(message, type = 'info') {
    if (!this.elements.statusMessage) return;
    
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.className = `status-message ${type}`;
    
    // Clear message after 3 seconds
    setTimeout(() => {
      if (this.elements.statusMessage.textContent === message) {
        this.elements.statusMessage.textContent = '';
        this.elements.statusMessage.className = 'status-message';
      }
    }, 3000);
  }

  // FFT and frequency analysis methods
  computeFFT() {
    if (!this.state.isImageLoaded) {
      this.showStatusMessage('Please load an image first.', 'warning');
      return;
    }

    try {
      this.showStatusMessage('Computing FFT...', 'info');
      
      // Get image data and convert to grayscale
      const imageData = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
      const width = imageData.width;
      const height = imageData.height;
      
      // Convert to grayscale and normalize to 0-1
      const grayscale = new Float32Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        grayscale[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }
      
      // Compute 2D FFT
      const fftResult = this.fft2D(grayscale, width, height);
      
      // Convert FFT result to magnitude spectrum for visualization
      const magnitude = new Float32Array(width * height);
      let maxMag = 0;
      
      for (let i = 0; i < width * height; i++) {
        const real = fftResult.real[i];
        const imag = fftResult.imag[i];
        magnitude[i] = Math.sqrt(real * real + imag * imag);
        if (magnitude[i] > maxMag) maxMag = magnitude[i];
      }
      
      // Create visualization
      this.visualizeFFT(magnitude, width, height, maxMag);
      
      this.showStatusMessage('FFT computed and displayed!', 'success');
    } catch (error) {
      console.error('Error computing FFT:', error);
      this.showStatusMessage('Failed to compute FFT.', 'error');
    }
  }

  fft2D(data, width, height) {
    // Simple 2D FFT implementation using separable 1D FFTs
    const result = {
      real: new Float32Array(width * height),
      imag: new Float32Array(width * height)
    };
    
    // Copy input data to real part
    for (let i = 0; i < width * height; i++) {
      result.real[i] = data[i];
      result.imag[i] = 0;
    }
    
    // FFT along rows
    for (let y = 0; y < height; y++) {
      const rowReal = new Float32Array(width);
      const rowImag = new Float32Array(width);
      
      for (let x = 0; x < width; x++) {
        rowReal[x] = result.real[y * width + x];
        rowImag[x] = result.imag[y * width + x];
      }
      
      const rowFFT = this.fft1D(rowReal, rowImag);
      
      for (let x = 0; x < width; x++) {
        result.real[y * width + x] = rowFFT.real[x];
        result.imag[y * width + x] = rowFFT.imag[x];
      }
    }
    
    // FFT along columns
    for (let x = 0; x < width; x++) {
      const colReal = new Float32Array(height);
      const colImag = new Float32Array(height);
      
      for (let y = 0; y < height; y++) {
        colReal[y] = result.real[y * width + x];
        colImag[y] = result.imag[y * width + x];
      }
      
      const colFFT = this.fft1D(colReal, colImag);
      
      for (let y = 0; y < height; y++) {
        result.real[y * width + x] = colFFT.real[y];
        result.imag[y * width + x] = colFFT.imag[y];
      }
    }
    
    return result;
  }

  fft1D(real, imag) {
    const N = real.length;
    if (N <= 1) return { real, imag };
    
    // Bit-reverse permutation
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) {
        j ^= bit;
      }
      j ^= bit;
      
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    
    // Cooley-Tukey FFT
    for (let len = 2; len <= N; len <<= 1) {
      const angle = -2 * Math.PI / len;
      const wlen_real = Math.cos(angle);
      const wlen_imag = Math.sin(angle);
      
      for (let i = 0; i < N; i += len) {
        let w_real = 1;
        let w_imag = 0;
        
        for (let j = 0; j < len / 2; j++) {
          const u_real = real[i + j];
          const u_imag = imag[i + j];
          const v_real = real[i + j + len / 2] * w_real - imag[i + j + len / 2] * w_imag;
          const v_imag = real[i + j + len / 2] * w_imag + imag[i + j + len / 2] * w_real;
          
          real[i + j] = u_real + v_real;
          imag[i + j] = u_imag + v_imag;
          real[i + j + len / 2] = u_real - v_real;
          imag[i + j + len / 2] = u_imag - v_imag;
          
          const next_w_real = w_real * wlen_real - w_imag * wlen_imag;
          w_imag = w_real * wlen_imag + w_imag * wlen_real;
          w_real = next_w_real;
        }
      }
    }
    
    return { real: new Float32Array(real), imag: new Float32Array(imag) };
  }

  visualizeFFT(magnitude, width, height, maxMag) {
    // Create a new window to display the FFT result
    const fftWindow = window.open('', '_blank', 'width=800,height=600');
    
    fftWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FFT Frequency Domain</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            text-align: center;
          }
          .container {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            display: inline-block;
          }
          canvas {
            border: 2px solid #ddd;
            border-radius: 8px;
            margin: 10px;
          }
          .info {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔬 FFT Frequency Domain Analysis</h1>
          <canvas id="fftCanvas" width="${width}" height="${height}"></canvas>
          <div class="info">
            <strong>📊 What you're seeing:</strong>
            <br>• Bright areas = high frequency components
            <br>• Dark areas = low frequency components  
            <br>• Center = DC component (average brightness)
            <br>• Edges = high frequency details
            <br>• Image size: ${width} × ${height} pixels
          </div>
          <button onclick="window.close()" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;">
            Close
          </button>
        </div>
      </body>
      </html>
    `);
    
    fftWindow.document.close();
    
    // Wait for the window to load, then draw the FFT
    fftWindow.addEventListener('load', () => {
      const fftCanvas = fftWindow.document.getElementById('fftCanvas');
      const fftCtx = fftCanvas.getContext('2d');
      
      // Create image data for FFT visualization
      const fftImageData = fftCtx.createImageData(width, height);
      
      // Apply log scaling and shift zero frequency to center
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Shift coordinates to center zero frequency
          const shiftedX = (x + width / 2) % width;
          const shiftedY = (y + height / 2) % height;
          const i = shiftedY * width + shiftedX;
          const originalI = y * width + x;
          
          // Apply logarithmic scaling for better visualization
          const logMag = Math.log(1 + magnitude[i] / maxMag);
          const intensity = Math.floor(logMag * 255 / Math.log(2));
          
          fftImageData.data[originalI * 4] = intensity;     // R
          fftImageData.data[originalI * 4 + 1] = intensity; // G
          fftImageData.data[originalI * 4 + 2] = intensity; // B
          fftImageData.data[originalI * 4 + 3] = 255;       // A
        }
      }
      
      fftCtx.putImageData(fftImageData, 0, 0);
      
      // Scale canvas for better visibility
      fftCanvas.style.width = Math.min(600, width * 2) + 'px';
      fftCanvas.style.height = Math.min(400, height * 2) + 'px';
    });
  }

  // Utility function for debouncing
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize the photo editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.photoEditor = new PhotoEditor();
  } catch (error) {
    console.error('Failed to initialize Photo Editor:', error);
    
    // Show error message to user
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
      statusElement.textContent = 'Failed to initialize editor. Please refresh the page.';
      statusElement.className = 'status-message error';
    }
  }
});

// Add error handling for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});