/**
 * AiComic — applies an AI-generated comic-book effect via the OpenAI image edit API.
 */

export class AiComic {
  constructor(bgCanvas, onStatus) {
    this.bgCanvas = bgCanvas;
    this.onStatus = onStatus;
  }

  async applyAiComicEffect(apiKey) {
    const bgCanvas = this.bgCanvas;

    // 1. Downscale to 1080p if necessary
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

    const thumb = document.createElement('canvas');
    thumb.width = thumbW;
    thumb.height = thumbH;
    const thumbCtx = thumb.getContext('2d');
    thumbCtx.drawImage(bgCanvas, 0, 0, thumbW, thumbH);

    // 2. Export to PNG blob
    const blob = await new Promise((resolve, reject) => {
      thumb.toBlob(b => {
        if (b) resolve(b);
        else reject(new Error('Failed to export canvas to PNG blob'));
      }, 'image/png');
    });

    // 3. Size parameter — dall-e-2 only supports 256x256, 512x512, 1024x1024
    const size = '1024x1024';

    // 4. Build multipart request
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

    // 5. POST to OpenAI
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      });
    } catch (networkErr) {
      console.error('AI Comic: network error:', networkErr.message || networkErr);
      throw networkErr;
    }

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        errMsg = errBody?.error?.message || errMsg;
      } catch (_) { /* ignore parse errors */ }
      console.error('AI Comic: API error:', errMsg);
      throw new Error(errMsg);
    }

    let json;
    try {
      json = await response.json();
    } catch (parseErr) {
      console.error('AI Comic: failed to parse API response:', parseErr.message || parseErr);
      throw parseErr;
    }

    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      const msg = 'AI Comic: API response did not contain image data';
      console.error(msg);
      throw new Error(msg);
    }

    // 6. Load result and draw back at original resolution
    const resultImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        const msg = 'AI Comic: failed to load result image';
        console.error(msg, e);
        reject(new Error(msg));
      };
      img.src = `data:image/png;base64,${b64}`;
    });

    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.imageSmoothingEnabled = true;
    bgCtx.imageSmoothingQuality = 'high';
    bgCtx.drawImage(resultImg, 0, 0, origW, origH);
  }
}
