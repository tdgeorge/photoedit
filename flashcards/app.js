const imageLoader = document.getElementById('imageLoader');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
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
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
  imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  originalImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyColorScaling();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
});

// Rotate
document.getElementById('rotateBtn').onclick = function() {
  if (!img.src) return;
  // Create a temporary canvas
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.height;
  tempCanvas.height = canvas.width;
  tempCtx.save();
  tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
  tempCtx.rotate(Math.PI / 2);
  tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  tempCtx.restore();
  canvas.width = tempCanvas.width;
  canvas.height = tempCanvas.height;
  ctx.drawImage(tempCanvas, 0, 0);
  imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  originalImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyColorScaling();
};

// Crop
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

document.getElementById('cropBtn').onclick = function() {
  if (!cropStart || !cropEnd) return;
  const x = Math.min(cropStart.x, cropEnd.x);
  const y = Math.min(cropStart.y, cropEnd.y);
  const w = Math.abs(cropEnd.x - cropStart.x);
  const h = Math.abs(cropEnd.y - cropStart.y);
  const cropped = ctx.getImageData(x, y, w, h);
  canvas.width = w;
  canvas.height = h;
  ctx.putImageData(cropped, 0, 0);
  cropStart = cropEnd = null;
  imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  originalImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyColorScaling();
};

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round((e.clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.round((e.clientY - rect.top) * (canvas.height / rect.height))
  };
}
function getTouchPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0] || e.changedTouches[0];
  return {
    x: Math.round((touch.clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.round((touch.clientY - rect.top) * (canvas.height / rect.height))
  };
}
function redraw() {
  ctx.putImageData(imgData, 0, 0);
}
function drawCropRect() {
  if (!cropStart || !cropEnd) return;
  ctx.save();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.setLineDash([6]);
  ctx.strokeRect(
    cropStart.x,
    cropStart.y,
    cropEnd.x - cropStart.x,
    cropEnd.y - cropStart.y
  );
  ctx.restore();
}

// Save
document.getElementById('saveBtn').onclick = function() {
  const link = document.createElement('a');
  link.download = 'edited-image.png';
  link.href = canvas.toDataURL();
  link.click();
};

// Color Scaling Feature
const redSlider = document.getElementById('redSlider');
const greenSlider = document.getElementById('greenSlider');
const blueSlider = document.getElementById('blueSlider');
const redValue = document.getElementById('redValue');
const greenValue = document.getElementById('greenValue');
const blueValue = document.getElementById('blueValue');

function applyColorScaling() {
  if (!originalImgData) return;
  // Get scaling factors
  const rScale = parseInt(redSlider.value, 10) / 100;
  const gScale = parseInt(greenSlider.value, 10) / 100;
  const bScale = parseInt(blueSlider.value, 10) / 100;
  // Copy original image data
  const scaledData = new ImageData(new Uint8ClampedArray(originalImgData.data), originalImgData.width, originalImgData.height);
  for (let i = 0; i < scaledData.data.length; i += 4) {
    scaledData.data[i] = Math.min(255, Math.max(0, Math.round(scaledData.data[i] * rScale)));
    scaledData.data[i + 1] = Math.min(255, Math.max(0, Math.round(scaledData.data[i + 1] * gScale)));
    scaledData.data[i + 2] = Math.min(255, Math.max(0, Math.round(scaledData.data[i + 2] * bScale)));
    // alpha channel unchanged
  }
  ctx.putImageData(scaledData, 0, 0);
  imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function updateSliderDisplays() {
  redValue.textContent = redSlider.value;
  greenValue.textContent = greenSlider.value;
  blueValue.textContent = blueSlider.value;
}

function handleSliderChange() {
  updateSliderDisplays();
  applyColorScaling();
}

redSlider.addEventListener('input', handleSliderChange);
greenSlider.addEventListener('input', handleSliderChange);
blueSlider.addEventListener('input', handleSliderChange);

// When a new image is loaded, reset sliders and show original

// Initialize slider displays on page load
document.addEventListener('DOMContentLoaded', function() {
  redSlider.value = 100;
  greenSlider.value = 100;
  blueSlider.value = 100;
  updateSliderDisplays();
});