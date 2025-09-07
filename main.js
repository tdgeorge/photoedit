/**
 * Modern Photo Editor Application - Main Entry Point
 * Using ES6 Modules for clean code organization
 */

import { ImageProcessor } from './src/imageProcessor.js';
import { CropTool } from './src/cropTool.js';
import { ColorAdjustments } from './src/colorAdjustments.js';
import { ImageSaver } from './src/imageSaver.js';
import { FFTAnalyzer } from './src/fftAnalyzer.js';

class PhotoEditor {
  constructor() {
    this.initializeElements();
    this.initializeModules();
    this.initializeState();
    this.bindEvents();
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
      fftBtn: document.getElementById('fftBtn'),
      redSlider: document.getElementById('redSlider'),
      greenSlider: document.getElementById('greenSlider'),
      blueSlider: document.getElementById('blueSlider'),
      redValue: document.getElementById('redValue'),
      greenValue: document.getElementById('greenValue'),
      blueValue: document.getElementById('blueValue'),
      statusMessage: document.getElementById('status-message')
    };

    const requiredElements = ['imageLoader', 'canvas', 'rotateBtn', 'cropBtn', 'saveBtn'];
    const missingElements = requiredElements.filter(id => !this.elements[id]);
    
    if (missingElements.length > 0) {
      throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
    }
  }

  initializeModules() {
    // Create background canvas for processing
    this.bgCanvas = document.createElement('canvas');
    
    // Initialize modules
    this.imageProcessor = new ImageProcessor(this.elements.canvas, this.bgCanvas);
    this.cropTool = new CropTool(this.elements.canvas, this.bgCanvas);
    this.colorAdjustments = new ColorAdjustments();
    this.fftAnalyzer = new FFTAnalyzer(this.bgCanvas, (msg, type) => this.showStatusMessage(msg, type));
  }

  initializeState() {
    this.state = {
      originalImage: null,
      currentImageData: null,
      originalImageData: null,
      isImageLoaded: false
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
    this.elements.fftBtn?.addEventListener('click', () => this.computeFFT());
    
    // Color sliders
    ['red', 'green', 'blue'].forEach(color => {
      const slider = this.elements[`${color}Slider`];
      if (slider) {
        slider.addEventListener('input', () => this.handleColorAdjustment(color, slider.value));
      }
    });
    
    // Window resize
    window.addEventListener('resize', this.debounce(() => {
      if (this.state.isImageLoaded) {
        this.imageProcessor.scaleCanvasView();
      }
    }, 250));
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.showStatusMessage('Loading image...', 'info');
      
      const img = await this.imageProcessor.loadImage(file);
      const imageData = this.imageProcessor.processLoadedImage(img);
      
      this.state.originalImage = img;
      this.state.originalImageData = imageData.originalImageData;
      this.state.currentImageData = imageData.currentImageData;
      this.state.isImageLoaded = true;
      
      this.imageProcessor.redrawCanvas();
      this.imageProcessor.scaleCanvasView();
      this.resetColorSliders();
      this.updateUI();
      
      this.showStatusMessage('Image loaded successfully!', 'success');
    } catch (error) {
      console.error('Error loading image:', error);
      this.showStatusMessage(error.message || 'Failed to load image. Please try again.', 'error');
    }
  }

  rotateImage() {
    if (!this.state.isImageLoaded) {
      this.showStatusMessage('Please load an image first.', 'warning');
      return;
    }

    try {
      const newImageData = this.imageProcessor.rotateImage();
      this.state.originalImageData = newImageData;
      this.state.currentImageData = newImageData;
      
      this.applyColorAdjustments();
      this.imageProcessor.scaleCanvasView();
      
      this.showStatusMessage('Image rotated successfully!', 'success');
    } catch (error) {
      console.error('Error rotating image:', error);
      this.showStatusMessage('Failed to rotate image.', 'error');
    }
  }

  applyCrop() {
    if (!this.state.isImageLoaded) {
      this.showStatusMessage('Please load an image first.', 'warning');
      return;
    }

    try {
      const newImageData = this.cropTool.applyCrop();
      this.state.originalImageData = newImageData;
      this.state.currentImageData = newImageData;
      
      this.applyColorAdjustments();
      this.imageProcessor.scaleCanvasView();
      this.cropTool.clearCropOverlay();
      
      // Reset crop button style
      this.elements.cropBtn.style.background = '';
      this.elements.cropBtn.style.borderColor = '';
      
      this.showStatusMessage('Image cropped successfully!', 'success');
    } catch (error) {
      console.error('Error cropping image:', error);
      this.showStatusMessage(error.message || 'Failed to crop image.', 'error');
    }
  }

  resetImage() {
    if (!this.state.originalImage) {
      this.showStatusMessage('No image to reset.', 'warning');
      return;
    }

    try {
      const imageData = this.imageProcessor.processLoadedImage(this.state.originalImage);
      this.state.originalImageData = imageData.originalImageData;
      this.state.currentImageData = imageData.currentImageData;
      
      this.resetColorSliders();
      this.imageProcessor.redrawCanvas();
      this.imageProcessor.scaleCanvasView();
      
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

    ImageSaver.saveImage(this.bgCanvas, (msg, type) => this.showStatusMessage(msg, type));
  }

  computeFFT() {
    if (!this.state.isImageLoaded) {
      this.showStatusMessage('Please load an image first.', 'warning');
      return;
    }

    this.fftAnalyzer.computeFFT();
  }

  handleColorAdjustment(color, value) {
    this.colorAdjustments.setAdjustment(color, value);
    
    // Update display value
    const valueElement = this.elements[`${color}Value`];
    if (valueElement) {
      valueElement.textContent = value;
    }
    
    // Update slider accessibility
    const slider = this.elements[`${color}Slider`];
    if (slider) {
      slider.setAttribute('aria-valuenow', value);
    }
    
    this.applyColorAdjustments();
  }

  applyColorAdjustments() {
    if (!this.state.originalImageData) return;
    
    this.state.currentImageData = this.colorAdjustments.applyToImageData(
      this.state.originalImageData, 
      this.bgCanvas.getContext('2d')
    );
    
    this.imageProcessor.redrawCanvas();
  }

  resetColorSliders() {
    this.colorAdjustments.resetAdjustments();
    
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
    });
  }

  updateUI() {
    const hasImage = this.state.isImageLoaded;
    
    [this.elements.rotateBtn, this.elements.cropBtn, this.elements.saveBtn, this.elements.fftBtn].forEach(btn => {
      if (btn) {
        btn.disabled = !hasImage;
        btn.style.opacity = hasImage ? '1' : '0.5';
        btn.style.cursor = hasImage ? 'pointer' : 'not-allowed';
      }
    });

    if (this.elements.resetBtn) {
      this.elements.resetBtn.disabled = !hasImage;
    }
  }

  showStatusMessage(message, type = 'info') {
    if (!this.elements.statusMessage) return;
    
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.className = `status-message ${type}`;
    
    setTimeout(() => {
      if (this.elements.statusMessage.textContent === message) {
        this.elements.statusMessage.textContent = '';
        this.elements.statusMessage.className = 'status-message';
      }
    }, 3000);
  }

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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.photoEditor = new PhotoEditor();
  } catch (error) {
    console.error('Failed to initialize Photo Editor:', error);
    
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
      statusElement.textContent = 'Failed to initialize editor. Please refresh the page.';
      statusElement.className = 'status-message error';
    }
  }
});

// Error handling
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
