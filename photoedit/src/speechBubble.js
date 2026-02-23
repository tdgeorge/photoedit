/**
 * Speech Bubble Module
 * Overlays draggable speech bubbles on the canvas using a plain overlay canvas.
 */

const CHAR_WIDTH_RATIO = 0.65;
const VERTICAL_SPACE_MULTIPLIER = 2.4;

export class SpeechBubble {
  constructor(canvasWrapper, onStatus) {
    this.wrapper = canvasWrapper;
    this.onStatus = onStatus;
    this.bubbles = [];
    this._pendingClickHandler = null;
    this._overlayCanvas = null;
    this._dragging = null;
    this._dragOffsetX = 0;
    this._dragOffsetY = 0;
    this._docListenersAttached = false;

    this._ensureOverlay();
  }

  _ensureOverlay() {
    if (this._overlayCanvas) return;

    this.wrapper.style.position = 'relative';

    const oc = document.createElement('canvas');
    oc.id = 'bubble-overlay-canvas';
    oc.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    this.wrapper.appendChild(oc);
    this._overlayCanvas = oc;

    // Size the overlay to match the image canvas
    const imgCanvas = this.wrapper.querySelector('canvas:not(#bubble-overlay-canvas)');
    if (imgCanvas) {
      oc.width  = imgCanvas.width;
      oc.height = imgCanvas.height;
      oc.style.width  = imgCanvas.style.width  || imgCanvas.width  + 'px';
      oc.style.height = imgCanvas.style.height || imgCanvas.height + 'px';
    }

    oc.addEventListener('mousedown', (e) => this._onMouseDown(e));

    if (!this._docListenersAttached) {
      document.addEventListener('mousemove', (e) => this._onMouseMove(e));
      document.addEventListener('mouseup',   ()  => this._onMouseUp());
      this._docListenersAttached = true;
    }
  }

  startAddingMode(text, fontSize, color) {
    this._ensureOverlay();
    const oc = this._overlayCanvas;
    oc.style.pointerEvents = 'all';
    oc.style.cursor = 'crosshair';

    if (this._pendingClickHandler) {
      oc.removeEventListener('click', this._pendingClickHandler);
    }

    this._pendingClickHandler = (e) => {
      const rect = oc.getBoundingClientRect();
      const scaleX = oc.width  / rect.width;
      const scaleY = oc.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top)  * scaleY;
      this._createBubble(x, y, text, parseInt(fontSize, 10) || 18, color);
      this.stopAddingMode();
    };

    oc.addEventListener('click', this._pendingClickHandler);
    this.onStatus('Click on the image to place the speech bubble.', 'info');
  }

  stopAddingMode() {
    const oc = this._overlayCanvas;
    if (!oc) return;
    oc.style.pointerEvents = 'none';
    oc.style.cursor = '';
    if (this._pendingClickHandler) {
      oc.removeEventListener('click', this._pendingClickHandler);
      this._pendingClickHandler = null;
    }
  }

  _createBubble(cx, cy, text, fontSize, color) {
    const rw = Math.max(120, text.length * fontSize * CHAR_WIDTH_RATIO);
    const rh = fontSize * VERTICAL_SPACE_MULTIPLIER;
    this.bubbles.push({ cx, cy, text, fontSize, color, rw, rh });
    this._redrawBubbles();
  }

  _redrawBubbles() {
    const oc = this._overlayCanvas;
    if (!oc) return;
    const ctx = oc.getContext('2d');
    ctx.clearRect(0, 0, oc.width, oc.height);

    for (const b of this.bubbles) {
      const { cx, cy, text, fontSize, color, rw, rh } = b;
      const tailH = 22;
      const tailBase = cy + rh / 2;

      ctx.save();

      // Tail (triangular, pointing downward-left)
      ctx.beginPath();
      ctx.moveTo(cx - 10, tailBase);
      ctx.lineTo(cx + 10, tailBase);
      ctx.lineTo(cx - 14, tailBase + tailH);
      ctx.closePath();
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ellipse body
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw / 2, rh / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy);

      ctx.restore();
    }
  }

  _hitTest(b, x, y) {
    const dx = (x - b.cx) / (b.rw / 2);
    const dy = (y - b.cy) / (b.rh / 2);
    return dx * dx + dy * dy <= 1;
  }

  _onMouseDown(e) {
    const oc = this._overlayCanvas;
    const rect = oc.getBoundingClientRect();
    const scaleX = oc.width  / rect.width;
    const scaleY = oc.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      if (this._hitTest(this.bubbles[i], x, y)) {
        this._dragging = i;
        this._dragOffsetX = x - this.bubbles[i].cx;
        this._dragOffsetY = y - this.bubbles[i].cy;
        oc.style.cursor = 'move';
        e.preventDefault();
        return;
      }
    }
  }

  _onMouseMove(e) {
    if (this._dragging === null) return;
    const oc = this._overlayCanvas;
    const rect = oc.getBoundingClientRect();
    const scaleX = oc.width  / rect.width;
    const scaleY = oc.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;

    const b = this.bubbles[this._dragging];
    b.cx = x - this._dragOffsetX;
    b.cy = y - this._dragOffsetY;
    this._redrawBubbles();
  }

  _onMouseUp() {
    if (this._dragging !== null) {
      this._overlayCanvas.style.cursor = '';
      this._dragging = null;
    }
  }

  clearBubbles() {
    this.bubbles = [];
    if (this._overlayCanvas) {
      const ctx = this._overlayCanvas.getContext('2d');
      ctx.clearRect(0, 0, this._overlayCanvas.width, this._overlayCanvas.height);
    }
    this.stopAddingMode();
  }
}
