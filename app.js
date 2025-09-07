const imageLoader = document.getElementById('imageLoader');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');

// New: background canvas for full-res image
const bgCanvas = document.createElement('canvas');
const bgCtx = bgCanvas.getContext('2d');

let img = new Image();
let imgData = null;
let originalImgData = null;
let cropping = false;
let cropStart = null;
let cropEnd = null;

// Load image
imageLoader.addEventListener('change', function(e) {
  const reader = new FileReader();
  reader.onload = function(event) {
    img.onload = function() {
      // Set both canvases to image's natural size
      canvas.width = img.width;
      canvas.height = img.height;
      bgCanvas.width = img.width;
      bgCanvas.height = img.height;

      // Draw to background canvas
      bgCtx.drawImage(img, 0, 0);

      // Copy to display canvas
      ctx.drawImage(bgCanvas, 0, 0);

      imgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);
      originalImgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);

      applyColorScaling();
      scaleCanvasView();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
});

// Rotate
document.getElementById('rotateBtn').onclick = function() {
  if (!img.src) return;
  // Rotate background canvas
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = bgCanvas.height;
  tempCanvas.height = bgCanvas.width;
  tempCtx.save();
  tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
  tempCtx.rotate(Math.PI / 2);
  tempCtx.drawImage(bgCanvas, -bgCanvas.width / 2, -bgCanvas.height / 2);
  tempCtx.restore();

  // Update background canvas
  bgCanvas.width = tempCanvas.width;
  bgCanvas.height = tempCanvas.height;
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  bgCtx.drawImage(tempCanvas, 0, 0);

  // Update display canvas
  canvas.width = bgCanvas.width;
  canvas.height = bgCanvas.height;
  ctx.drawImage(bgCanvas, 0, 0);

  imgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);
  originalImgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);

  applyColorScaling();
  scaleCanvasView();
};

// Crop
document.getElementById('cropBtn').onclick = function() {
  if (!cropStart || !cropEnd) return;
  const x = Math.min(cropStart.x, cropEnd.x);
  const y = Math.min(cropStart.y, cropEnd.y);
  const w = Math.abs(cropEnd.x - cropStart.x);
  const h = Math.abs(cropEnd.y - cropStart.y);

  // Crop background canvas
  const cropped = bgCtx.getImageData(x, y, w, h);
  bgCanvas.width = w;
  bgCanvas.height = h;
  bgCtx.putImageData(cropped, 0, 0);

  // Update display canvas
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(bgCanvas, 0, 0);

  cropStart = cropEnd = null;
  imgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);
  originalImgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);

  applyColorScaling();
  scaleCanvasView();
};

// Mouse/touch events for cropping (use display canvas for coordinates)
canvas.addEventListener('mousedown', function(e) {
  cropping = true;
  cropStart = getMousePos(e);
});
canvas.addEventListener('mousemove', function(e) {
  if (cropping && cropStart) {
    cropEnd = getMousePos(e);
    redraw();
    drawCropRect();
  }
});
canvas.addEventListener('mouseup', function(e) {
  cropping = false;
  cropEnd = getMousePos(e);
  drawCropRect();
});
canvas.addEventListener('touchstart', function(e) {
  cropping = true;
  cropStart = getTouchPos(e);
});
canvas.addEventListener('touchmove', function(e) {
  if (cropping && cropStart) {
    cropEnd = getTouchPos(e);
    redraw();
    drawCropRect();
  }
});
canvas.addEventListener('touchend', function(e) {
  cropping = false;
  cropEnd = getTouchPos(e);
  drawCropRect();
});

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round((e.clientX - rect.left) * (bgCanvas.width / rect.width)),
    y: Math.round((e.clientY - rect.top) * (bgCanvas.height / rect.height))
  };
}
function getTouchPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0] || e.changedTouches[0];
  return {
    x: Math.round((touch.clientX - rect.left) * (bgCanvas.width / rect.width)),
    y: Math.round((touch.clientY - rect.top) * (bgCanvas.height / rect.height))
  };
}
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgCanvas, 0, 0, canvas.width, canvas.height);
}
function drawCropRect() {
  if (!cropStart || !cropEnd) return;
  ctx.save();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.setLineDash([6]);
  ctx.strokeRect(
    cropStart.x * (canvas.width / bgCanvas.width),
    cropStart.y * (canvas.height / bgCanvas.height),
    (cropEnd.x - cropStart.x) * (canvas.width / bgCanvas.width),
    (cropEnd.y - cropStart.y) * (canvas.height / bgCanvas.height)
  );
  ctx.restore();
}

// Save (use background canvas for full-res image)
document.getElementById('saveBtn').onclick = function() {
  const dataUrl = bgCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'edited-image.png';
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Color Scaling Feature
document.addEventListener('DOMContentLoaded', function() {
  function updateVersionLabel(version) {
    const label = document.getElementById('version-label');
    if (label) label.textContent = 'Photo Editor ' + version;
  }
  updateVersionLabel('v1.1.0'); // <-- Updated version for dual-canvas save

  window.addEventListener('resize', scaleCanvasView);

  function scaleCanvasView() {
    // Scale display canvas to fit window, keep bgCanvas unchanged
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.6;
    const aspect = bgCanvas.width / bgCanvas.height;
    let newWidth = bgCanvas.width;
    let newHeight = bgCanvas.height;
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspect;
    }
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspect;
    }
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
    redraw();
  }

  // Get slider elements after DOM is ready
  const redSlider = document.getElementById('redSlider');
  const greenSlider = document.getElementById('greenSlider');
  const blueSlider = document.getElementById('blueSlider');
  const redValue = document.getElementById('redValue');
  const greenValue = document.getElementById('greenValue');
  const blueValue = document.getElementById('blueValue');

  function updateSliderDisplays() {
    redValue.textContent = redSlider.value;
    greenValue.textContent = greenSlider.value;
    blueValue.textContent = blueSlider.value;
  }

  function applyColorScaling() {
    if (!originalImgData) return;
    const rScale = parseInt(redSlider.value, 10) / 100;
    const gScale = parseInt(greenSlider.value, 10) / 100;
    const bScale = parseInt(blueSlider.value, 10) / 100;
    const scaledData = new ImageData(new Uint8ClampedArray(originalImgData.data), originalImgData.width, originalImgData.height);
    for (let i = 0; i < scaledData.data.length; i += 4) {
      scaledData.data[i] = Math.min(255, Math.max(0, Math.round(scaledData.data[i] * rScale)));
      scaledData.data[i + 1] = Math.min(255, Math.max(0, Math.round(scaledData.data[i + 1] * gScale)));
      scaledData.data[i + 2] = Math.min(255, Math.max(0, Math.round(scaledData.data[i + 2] * bScale)));
    }
    // Update background canvas
    bgCtx.putImageData(scaledData, 0, 0);
    imgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);
    // Copy to display canvas
    redraw();
    scaleCanvasView();
  }

  function handleSliderChange() {
    updateSliderDisplays();
    applyColorScaling();
  }

  redSlider.addEventListener('input', handleSliderChange);
  greenSlider.addEventListener('input', handleSliderChange);
  blueSlider.addEventListener('input', handleSliderChange);

  // Set initial slider values and display
  redSlider.value = 100;
  greenSlider.value = 100;
  blueSlider.value = 100;
  updateSliderDisplays();

  // When a new image is loaded, reset sliders and show original
  imageLoader.addEventListener('change', function() {
    redSlider.value = 100;
    greenSlider.value = 100;
    blueSlider.value = 100;
    updateSliderDisplays();
  });
});