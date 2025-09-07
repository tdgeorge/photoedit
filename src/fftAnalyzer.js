/**
 * FFT Analyzer Module
 * Handles Fast Fourier Transform and frequency analysis
 */

export class FFTAnalyzer {
  constructor(bgCanvas, showStatusMessage) {
    this.bgCanvas = bgCanvas;
    this.bgCtx = bgCanvas.getContext('2d');
    this.showStatusMessage = showStatusMessage;
  }

  computeFFT() {
    try {
      this.showStatusMessage('Computing FFT...', 'info');
      
      const imageData = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
      const width = imageData.width;
      const height = imageData.height;
      
      // Convert to grayscale
      const grayscale = new Float32Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        grayscale[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }
      
      // Compute 2D FFT
      const fftResult = this.fft2D(grayscale, width, height);
      
      // Convert to magnitude spectrum
      const magnitude = new Float32Array(width * height);
      let maxMag = 0;
      
      for (let i = 0; i < width * height; i++) {
        const real = fftResult.real[i];
        const imag = fftResult.imag[i];
        magnitude[i] = Math.sqrt(real * real + imag * imag);
        if (magnitude[i] > maxMag) maxMag = magnitude[i];
      }
      
      this.visualizeFFT(magnitude, width, height, maxMag);
      this.showStatusMessage('FFT computed and displayed!', 'success');
    } catch (error) {
      console.error('Error computing FFT:', error);
      this.showStatusMessage('Failed to compute FFT.', 'error');
    }
  }

  fft2D(data, width, height) {
    const result = {
      real: new Float32Array(width * height),
      imag: new Float32Array(width * height)
    };
    
    // Copy input data
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
    
    // Ensure N is power of 2
    let paddedN = 1;
    while (paddedN < N) paddedN *= 2;
    
    if (paddedN !== N) {
      const paddedReal = new Float32Array(paddedN);
      const paddedImag = new Float32Array(paddedN);
      paddedReal.set(real);
      paddedImag.set(imag);
      real = paddedReal;
      imag = paddedImag;
    }
    
    const len = real.length;
    
    // Bit-reverse permutation
    for (let i = 1, j = 0; i < len; i++) {
      let bit = len >> 1;
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
    for (let size = 2; size <= len; size *= 2) {
      const halfSize = size / 2;
      const angle = -2 * Math.PI / size;
      
      for (let i = 0; i < len; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const k = i + j;
          const l = k + halfSize;
          
          const tReal = real[l] * Math.cos(angle * j) - imag[l] * Math.sin(angle * j);
          const tImag = real[l] * Math.sin(angle * j) + imag[l] * Math.cos(angle * j);
          
          real[l] = real[k] - tReal;
          imag[l] = imag[k] - tImag;
          real[k] = real[k] + tReal;
          imag[k] = imag[k] + tImag;
        }
      }
    }
    
    return { 
      real: N === len ? real : real.slice(0, N), 
      imag: N === len ? imag : imag.slice(0, N) 
    };
  }

  visualizeFFT(magnitude, width, height, maxMag) {
    const fftWindow = window.open('', '_blank', 'width=800,height=600');
    
    fftWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FFT Frequency Domain</title>
        <style>
          body { font-family: system-ui; margin: 0; padding: 20px; background: #f5f5f5; text-align: center; }
          .container { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: inline-block; }
          canvas { border: 2px solid #ddd; border-radius: 8px; margin: 10px; image-rendering: pixelated; }
          .info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; }
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
          </div>
          <button onclick="window.close()" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `);
    
    fftWindow.document.close();
    
    fftWindow.addEventListener('load', () => {
      const fftCanvas = fftWindow.document.getElementById('fftCanvas');
      const fftCtx = fftCanvas.getContext('2d');
      const fftImageData = fftCtx.createImageData(width, height);
      
      // Process and display FFT data
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const shiftedX = (x + Math.floor(width / 2)) % width;
          const shiftedY = (y + Math.floor(height / 2)) % height;
          const i = shiftedY * width + shiftedX;
          const originalI = y * width + x;
          
          const logMag = Math.log(1 + magnitude[i]);
          const maxLogMag = Math.log(1 + maxMag);
          const intensity = Math.floor((logMag / maxLogMag) * 255);
          
          fftImageData.data[originalI * 4] = intensity;
          fftImageData.data[originalI * 4 + 1] = intensity;
          fftImageData.data[originalI * 4 + 2] = intensity;
          fftImageData.data[originalI * 4 + 3] = 255;
        }
      }
      
      fftCtx.putImageData(fftImageData, 0, 0);
      fftCanvas.style.width = Math.min(600, width * 2) + 'px';
      fftCanvas.style.height = Math.min(400, height * 2) + 'px';
    });
  }
}
