/**
 * Modern Photo Editor Application - Main Entry Point
 * Using ES6 Modules for clean code organization
 */

import { ImageProcessor } from './src/imageProcessor.js';
import { AiComic } from './src/aiComic.js';

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
      statusMessage: document.getElementById('status-message'),
      aiComicBtn: document.getElementById('aiComicBtn'),
      geminiApiKey: document.getElementById('geminiApiKey'),
      aiComicPrompt: document.getElementById('aiComicPrompt'),
      aiProgressOverlay: document.getElementById('ai-progress-overlay'),
      aiResultDetails: document.getElementById('ai-result-details'),
      aiResultSection: document.getElementById('ai-result-section'),
      aiResultImg: document.getElementById('ai-result-img'),
      aiResultSaveBtn: document.getElementById('ai-result-save-btn')
    };

    const requiredElements = ['imageLoader', 'canvas', 'aiComicBtn'];
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
    this.aiComic = new AiComic(
      this.bgCanvas,
      (msg, type) => this.showStatusMessage(msg, type),
      (label) => {
        const el = document.querySelector('.ai-progress-label');
        if (el) el.textContent = label;
      },
      (b64) => this._showAiResult(b64)
    );
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
    
    // AI buttons
    this.elements.aiComicBtn?.addEventListener('click', () => this.applyAiComicEffect());
    this.elements.aiResultSaveBtn?.addEventListener('click', () => this._saveAiResult());
    
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
      this.updateUI();
      
      this.showStatusMessage('Image loaded successfully!', 'success');
    } catch (error) {
      console.error('Error loading image:', error);
      this.showStatusMessage(error.message || 'Failed to load image. Please try again.', 'error');
    }
  }

  async applyAiComicEffect() {
    const apiKey = this.elements.geminiApiKey?.value?.trim();
    if (!apiKey) {
      this.showStatusMessage('Please enter your Gemini API key.', 'warning');
      return;
    }
    if (!this.state.isImageLoaded) {
      this.showStatusMessage('Please load an image first.', 'warning');
      return;
    }

    const prompt = this.elements.aiComicPrompt?.value?.trim();
    if (!prompt) {
      this.showStatusMessage('Please enter a prompt for the AI Comic effect.', 'warning');
      return;
    }

    // Show spinner
    if (this.elements.aiProgressOverlay) {
      this.elements.aiProgressOverlay.style.display = 'flex';
      this.elements.aiProgressOverlay.removeAttribute('aria-hidden');
    }
    if (this.elements.aiComicBtn) this.elements.aiComicBtn.disabled = true;

    try {
      this.showStatusMessage('Sending to OpenAI...', 'info');
      await this.aiComic.applyAiComicEffect(apiKey, prompt);

      console.log('[AI Comic] API call complete. Updating state from bgCanvas...');
      const bgCtx = this.bgCanvas.getContext('2d');
      console.log('[AI Comic] bgCanvas dimensions:', this.bgCanvas.width, 'x', this.bgCanvas.height);
      const newImageData = bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
      console.log('[AI Comic] ImageData captured, length:', newImageData.data.length);
      this.state.originalImageData = newImageData;
      this.state.currentImageData = newImageData;
      console.log('[AI Comic] Calling imageProcessor.redrawCanvas()...');
      this.imageProcessor.redrawCanvas();
      console.log('[AI Comic] redrawCanvas() complete. Image viewer should now show result.');
      this.showStatusMessage('AI Comic Book effect applied!', 'success');
    } catch (err) {
      console.error('AI Comic Book failed:', err.message || err);
      this.showStatusMessage('AI Comic Book failed. Check the debug console.', 'error');
    } finally {
      // Hide spinner
      if (this.elements.aiProgressOverlay) {
        this.elements.aiProgressOverlay.style.display = 'none';
        this.elements.aiProgressOverlay.setAttribute('aria-hidden', 'true');
      }
      if (this.elements.aiComicBtn) this.elements.aiComicBtn.disabled = false;
    }
  }

  updateUI() {
    const hasImage = this.state.isImageLoaded;
    
    if (this.elements.aiComicBtn) {
      this.elements.aiComicBtn.disabled = !hasImage;
      this.elements.aiComicBtn.style.opacity = hasImage ? '1' : '0.5';
      this.elements.aiComicBtn.style.cursor = hasImage ? 'pointer' : 'not-allowed';
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

  _showAiResult(b64) {
    const src = `data:image/png;base64,${b64}`;
    if (this.elements.aiResultImg) {
      this.elements.aiResultImg.src = src;
    }
    if (this.elements.aiResultDetails) {
      this.elements.aiResultDetails.open = true;
    }
    console.log('[AI Comic] AI result viewer updated with new image.');
    this._lastAiResultB64 = b64;
  }

  _saveAiResult() {
    if (!this._lastAiResultB64) {
      console.log('[AI Comic] No AI result available to save.');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${this._lastAiResultB64}`;
    a.download = `ai-comic-result-${timestamp}.png`;
    a.click();
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
