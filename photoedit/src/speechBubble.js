/**
 * Speech Bubble Module
 * Overlays draggable, editable SVG speech bubbles on the canvas using SVG.js
 */

export class SpeechBubble {
  constructor(canvasWrapper, onStatus) {
    this.wrapper = canvasWrapper;
    this.onStatus = onStatus;
    this.svgInstance = null;
    this.bubbles = [];
    this._pendingClickHandler = null;
  }

  _ensureSVG() {
    if (this.svgInstance) return true;

    if (typeof window.SVG === 'undefined') {
      this.onStatus('SVG.js is not available.', 'error');
      return false;
    }

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.id = 'speech-bubble-svg';
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;';
    this.wrapper.appendChild(svgEl);
    this.svgInstance = window.SVG(svgEl);
    return true;
  }

  startAddingMode(text, fontSize, color) {
    if (!this._ensureSVG()) return;

    const svgEl = document.getElementById('speech-bubble-svg');
    svgEl.style.pointerEvents = 'all';
    svgEl.style.cursor = 'crosshair';

    // Remove any previous pending handler
    if (this._pendingClickHandler) {
      svgEl.removeEventListener('click', this._pendingClickHandler);
    }

    this._pendingClickHandler = (e) => {
      // Ignore clicks on existing bubble groups
      if (e.target !== svgEl && e.target.closest('g')) return;

      const rect = svgEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._createBubble(x, y, text, parseInt(fontSize, 10) || 18, color);
      this.stopAddingMode();
    };

    svgEl.addEventListener('click', this._pendingClickHandler);
    this.onStatus('Click on the image to place the speech bubble.', 'info');
  }

  stopAddingMode() {
    const svgEl = document.getElementById('speech-bubble-svg');
    if (svgEl) {
      svgEl.style.pointerEvents = 'none';
      svgEl.style.cursor = '';
      if (this._pendingClickHandler) {
        svgEl.removeEventListener('click', this._pendingClickHandler);
        this._pendingClickHandler = null;
      }
    }
  }

  _createBubble(cx, cy, text, fontSize, color) {
    const group = this.svgInstance.group();
    // Minimum width 120px; 0.65 is an approximate character-width-to-font-size ratio;
    // 2.4 gives enough vertical space for comfortable single-line text.
    const rw = Math.max(120, text.length * fontSize * 0.65);
    const rh = fontSize * 2.4;
    const tailH = 22;

    // Draw tail first so ellipse covers its base
    const tailLeft = cx - 10;
    const tailRight = cx + 10;
    const tailBase = cy + rh / 2;
    group.polygon(`${tailLeft},${tailBase} ${tailRight},${tailBase} ${cx - 14},${tailBase + tailH}`)
      .fill('white')
      .stroke({ color: '#333333', width: 2 });

    // Ellipse (drawn on top of tail base)
    group.ellipse(rw, rh)
      .center(cx, cy)
      .fill('white')
      .stroke({ color: '#333333', width: 2 });

    // Text centered in ellipse
    group.text(text)
      .center(cx, cy)
      .font({ size: fontSize, family: 'Arial, sans-serif', anchor: 'middle', leading: '1.3em' })
      .fill(color);

    // Allow pointer events on the bubble and enable drag
    group.node.style.pointerEvents = 'all';
    group.node.style.cursor = 'move';
    this._makeDraggable(group);

    this.bubbles.push(group);
  }

  _makeDraggable(group) {
    let active = false;
    let originX = 0;
    let originY = 0;
    let translateX = 0;
    let translateY = 0;

    const onMouseDown = (e) => {
      active = true;
      originX = e.clientX - translateX;
      originY = e.clientY - translateY;
      e.stopPropagation();
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!active) return;
      translateX = e.clientX - originX;
      translateY = e.clientY - originY;
      group.node.setAttribute('transform', `translate(${translateX},${translateY})`);
    };

    const onMouseUp = () => {
      active = false;
    };

    group.node.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  clearBubbles() {
    this.stopAddingMode();
    this.bubbles.forEach(b => b.remove());
    this.bubbles = [];
  }
}
