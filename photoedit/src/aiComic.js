/**
 * AiComic — applies an AI-generated comic-book effect via the Google Gemini 2.5 Flash Image API.
 */

export class AiComic {
  constructor(bgCanvas, onStatus, onProgress, onResult) {
    this.bgCanvas = bgCanvas;
    this.onStatus = onStatus;
    this.onProgress = onProgress || (() => {});
    this.onResult = onResult || (() => {});
  }

  async applyAiComicEffect(apiKey, prompt) {
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

    // Step 1: Resize to 1024x1024 square (stretched to fill)
    const TARGET_SIZE = 1024;
    log(`Step 1: Resizing from ${origW}x${origH} to ${TARGET_SIZE}x${TARGET_SIZE} square (stretched)`);
    this.onProgress('Step 1/5: Resizing to 1024x1024 square...');

    const thumb = document.createElement('canvas');
    thumb.width = TARGET_SIZE;
    thumb.height = TARGET_SIZE;
    const thumbCtx = thumb.getContext('2d');

    // Stretch image to fill exactly 1024x1024
    thumbCtx.drawImage(bgCanvas, 0, 0, TARGET_SIZE, TARGET_SIZE);
    log(`Step 1 complete: image stretched to fill ${TARGET_SIZE}x${TARGET_SIZE} canvas`);

    // Step 2: Export canvas to base64 PNG string
    log('Step 2: Exporting canvas to base64 PNG string...');
    this.onProgress('Step 2/5: Exporting to PNG...');
    const b64Input = thumb.toDataURL('image/png').split(',')[1];
    log(`Step 2 complete: base64 length = ${b64Input.length} chars`);

    // Step 3: Build Gemini API request body
    log('Step 3: Building Gemini API request body...');
    this.onProgress('Step 3/5: Building API request...');
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/png',
                data: b64Input
              }
            }
          ]
        }
      ]
    };

    // Step 4: POST to Gemini
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
    log('Step 4: Sending POST to Gemini generateContent endpoint...');
    this.onProgress('Step 4/5: Sending to Gemini...');
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(requestBody)
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
    log('Step 5: Parsing Gemini JSON response...');
    this.onProgress('Step 5/5: Receiving image data...');
    let json;
    try {
      json = await response.json();
    } catch (parseErr) {
      console.error('[AI Comic] Failed to parse API response:', parseErr.message || parseErr);
      throw parseErr;
    }

    // Debug: log full response structure
    log(`Step 5 debug: Response top-level keys: ${JSON.stringify(Object.keys(json || {}))}`);

    const parts = json?.candidates?.[0]?.content?.parts;
    const imagePart = Array.isArray(parts) ? parts.find(p => p.inlineData) : undefined;
    let b64 = imagePart?.inlineData?.data;
    const mimeType = imagePart?.inlineData?.mimeType || 'image/png';

    if (!b64) {
      const msg = 'Gemini API response did not contain image data. Response keys: ' + JSON.stringify(Object.keys(json || {}));
      console.error('[AI Comic]', msg);
      throw new Error(msg);
    }
    log(`Step 5 complete: b64 data length = ${b64.length} chars, mimeType = ${mimeType}`);

    // Step 6: Load result image
    log('Step 6: Loading result image from base64...');
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
      img.src = `data:${mimeType};base64,${b64}`;
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
