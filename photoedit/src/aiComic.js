/**
 * AiComic — applies an AI-generated comic-book effect via the OpenAI image edit API.
 */

export class AiComic {
  constructor(bgCanvas, onStatus, onProgress) {
    this.bgCanvas = bgCanvas;
    this.onStatus = onStatus;
    this.onProgress = onProgress || (() => {});
  }

  async applyAiComicEffect(apiKey) {
    const bgCanvas = this.bgCanvas;
    const log = (msg) => console.log('[AI Comic]', msg);

    // Step 1: Downscale
    const MAX_W = 1920;
    const MAX_H = 1080;
    const origW = bgCanvas.width;
    const origH = bgCanvas.height;
    let thumbW = origW;
    let thumbH = origH;
    if (origW > MAX_W || origH > MAX_H) {
      const scale = Math.min(MAX_W / origW, MAX_H / origH);
      thumbW = Math.round(origW * scale);
      thumbH = Math.round(origH * scale);
    }
    log(`Step 1: Downscaling from ${origW}x${origH} to ${thumbW}x${thumbH}`);
    this.onProgress('Step 1/7: Downscaling image...');

    const thumb = document.createElement('canvas');
    thumb.width = thumbW;
    thumb.height = thumbH;
    const thumbCtx = thumb.getContext('2d');
    thumbCtx.drawImage(bgCanvas, 0, 0, thumbW, thumbH);

    // Step 2: Export to PNG blob
    log('Step 2: Exporting canvas to PNG blob...');
    this.onProgress('Step 2/7: Exporting to PNG...');
    const blob = await new Promise((resolve, reject) => {
      thumb.toBlob(b => {
        if (b) resolve(b);
        else reject(new Error('Failed to export canvas to PNG blob'));
      }, 'image/png');
    });
    log(`Step 2 complete: blob size = ${(blob.size / 1024).toFixed(1)} KB`);

    // Step 3: Build request
    const size = '1024x1024';
    log(`Step 3: Building FormData (model=dall-e-2, size=${size})`);
    this.onProgress('Step 3/7: Building API request...');
    const formData = new FormData();
    formData.append('model', 'dall-e-2');
    formData.append('image', blob, 'image.png');
    formData.append(
      'prompt',
      'Transform this photo into a high-quality comic book illustration. Use bold black ink outlines, flat cel-shaded colors, halftone dot shading in shadow areas, and a classic American comic book art style. Preserve the composition and subjects of the original image.'
    );
    formData.append('n', '1');
    formData.append('size', size);
    formData.append('response_format', 'b64_json');

    // Step 4: POST to OpenAI
    log('Step 4: Sending POST to https://api.openai.com/v1/images/edits ...');
    this.onProgress('Step 4/7: Sending to OpenAI...');
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      });
    } catch (networkErr) {
      console.error('[AI Comic] Step 4 network error:', networkErr.message || networkErr);
      throw networkErr;
    }
    log(`Step 4 complete: HTTP ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        errMsg = errBody?.error?.message || errMsg;
      } catch (_) { /* ignore */ }
      console.error('[AI Comic] API error:', errMsg);
      throw new Error(errMsg);
    }

    // Step 5: Parse response
    log('Step 5: Parsing JSON response...');
    this.onProgress('Step 5/7: Receiving image data...');
    let json;
    try {
      json = await response.json();
    } catch (parseErr) {
      console.error('[AI Comic] Failed to parse API response:', parseErr.message || parseErr);
      throw parseErr;
    }

    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      const msg = 'API response did not contain image data. Keys: ' + JSON.stringify(Object.keys(json || {}));
      console.error('[AI Comic]', msg);
      throw new Error(msg);
    }
    log(`Step 5 complete: b64 data received, length = ${b64.length} chars`);

    // Step 6: Load result image
    log('Step 6: Loading result image from base64...');
    this.onProgress('Step 6/7: Upscaling result...');
    const resultImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        log(`Step 6: Result image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
        resolve(img);
      };
      img.onerror = (e) => {
        console.error('[AI Comic] Failed to load result image', e);
        reject(new Error('Failed to load result image from base64'));
      };
      img.src = `data:image/png;base64,${b64}`;
    });

    // Step 7: Draw result back to bgCanvas at original resolution
    log(`Step 7: Drawing result onto bgCanvas at ${origW}x${origH}...`);
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.imageSmoothingEnabled = true;
    bgCtx.imageSmoothingQuality = 'high';
    bgCtx.clearRect(0, 0, origW, origH);
    bgCtx.drawImage(resultImg, 0, 0, origW, origH);
    log('Step 7 complete: bgCanvas updated successfully.');
  }
}
