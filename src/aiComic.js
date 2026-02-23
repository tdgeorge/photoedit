/**
 * AiComic — applies an AI-generated comic-book effect via the OpenAI image edit API.
 */

export class AiComic {
  constructor(bgCanvas, onStatus, onProgress, onResult) {
    this.bgCanvas = bgCanvas;
    this.onStatus = onStatus;
    this.onProgress = onProgress || (() => {});
    this.onResult = onResult || (() => {});
  }

  async applyAiComicEffect(apiKey) {
    const bgCanvas = this.bgCanvas;
    const log = (msg) => console.log('[AI Comic]', msg);

    const origW = bgCanvas.width;
    const origH = bgCanvas.height;

    // Sample original image center pixel for comparison
    try {
      const origCtx = bgCanvas.getContext('2d');
      const origPx = origCtx.getImageData(Math.floor(origW/2), Math.floor(origH/2), 1, 1).data;
      log(`Step 0: Original center pixel RGBA = (${origPx[0]}, ${origPx[1]}, ${origPx[2]}, ${origPx[3]})`);
    } catch (e) {
      log('Step 0: Could not sample original pixel: ' + e.message);
    }

    // Step 1: Downscale
    const MAX_W = 1920;
    const MAX_H = 1080;
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

    // Step 2b: Generate full-white mask (all pixels editable)
    log('Step 2b: Generating full-white mask...');
    this.onProgress('Step 2b/7: Generating mask...');
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = thumbW;
    maskCanvas.height = thumbH;
    const maskCtx = maskCanvas.getContext('2d');
    // AFTER (correct — transparent alpha=0 = edit everything):
    maskCtx.clearRect(0, 0, thumbW, thumbH);
    const maskBlob = await new Promise((resolve, reject) => {
      maskCanvas.toBlob(b => {
        if (b) resolve(b);
        else reject(new Error('Failed to generate mask blob'));
      }, 'image/png');
    });
    log(`Step 2b complete: mask blob size = ${(maskBlob.size / 1024).toFixed(1)} KB`);

    // Step 3: Build request
    const size = '1024x1024';
    log(`Step 3: Building FormData (model=dall-e-2, size=${size})`);
    this.onProgress('Step 3/7: Building API request...');
    const formData = new FormData();
    formData.append('model', 'dall-e-2');
    formData.append('image', blob, 'image.png');
    formData.append('mask', maskBlob, 'mask.png');
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

    // Debug: log full response structure
    log(`Step 5 debug: Response top-level keys: ${JSON.stringify(Object.keys(json || {}))}`);
    if (json?.data?.[0]) {
      log(`Step 5 debug: data[0] keys: ${JSON.stringify(Object.keys(json.data[0]))}`);
      if (json.data[0].url) {
        log(`Step 5 debug: Response contains URL (not b64_json): ${json.data[0].url.substring(0, 80)}...`);
      }
    }
    if (json?.created) {
      log(`Step 5 debug: Response created timestamp: ${json.created}`);
    }

    let b64 = json?.data?.[0]?.b64_json;

    // Fallback: if API returned a URL instead of b64_json, fetch it and convert
    if (!b64 && json?.data?.[0]?.url) {
      log('Step 5: No b64_json found, but URL present. Fetching image from URL...');
      this.onProgress('Step 5b/7: Fetching image from URL...');
      try {
        const imgResp = await fetch(json.data[0].url);
        const imgBlob = await imgResp.blob();
        b64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(imgBlob);
        });
        log(`Step 5b complete: fetched and converted URL image to b64, length = ${b64.length} chars`);
      } catch (fetchErr) {
        console.error('[AI Comic] Failed to fetch image from URL:', fetchErr.message || fetchErr);
        throw fetchErr;
      }
    }

    if (!b64) {
      const msg = 'API response did not contain image data (neither b64_json nor url). Response keys: ' + JSON.stringify(Object.keys(json || {}));
      console.error('[AI Comic]', msg);
      throw new Error(msg);
    }
    log(`Step 5 complete: b64 data length = ${b64.length} chars, first 60 chars: ${b64.substring(0, 60)}`);

    // Step 6: Load result image
    log('Step 6: Loading result image from base64...');
    this.onProgress('Step 6/7: Upscaling result...');
    const resultImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        log(`Step 6: Result image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
        // Sample a pixel from the center to confirm image content
        try {
          const sampleCanvas = document.createElement('canvas');
          sampleCanvas.width = 4;
          sampleCanvas.height = 4;
          const sCtx = sampleCanvas.getContext('2d');
          sCtx.drawImage(img, Math.floor(img.naturalWidth/2), Math.floor(img.naturalHeight/2), 4, 4, 0, 0, 4, 4);
          const px = sCtx.getImageData(0, 0, 1, 1).data;
          log(`Step 6 debug: Center pixel sample RGBA = (${px[0]}, ${px[1]}, ${px[2]}, ${px[3]})`);
        } catch (e) {
          log('Step 6 debug: Could not sample pixel (possible taint): ' + e.message);
        }
        resolve(img);
      };
      img.onerror = (e) => {
        console.error('[AI Comic] Failed to load result image', e);
        reject(new Error('Failed to load result image from base64'));
      };
      img.src = `data:image/png;base64,${b64}`;
    });

    // Call onResult with the base64 data before drawing to bgCanvas
    this.onResult(b64);

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
