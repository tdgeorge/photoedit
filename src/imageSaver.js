/**
 * Image Saver Module
 * Handles cross-browser image saving functionality
 */

export class ImageSaver {
  static saveImage(canvas, showStatusMessage) {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `edited-photo-${timestamp}.png`;
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      // Detect browser type
      const isIOSChrome = /CriOS/.test(navigator.userAgent) && /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isMobileSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
      const isDesktop = !/iPhone|iPad|iPod|Android/.test(navigator.userAgent);
      
      if (isIOSChrome) {
        this.handleIOSChromeSave(dataUrl, filename, showStatusMessage);
      } else if (isMobileSafari || isDesktop) {
        this.handleStandardSave(dataUrl, filename, showStatusMessage);
      } else {
        try {
          this.handleStandardSave(dataUrl, filename, showStatusMessage);
        } catch (error) {
          this.handleIOSChromeSave(dataUrl, filename, showStatusMessage);
        }
      }
      
    } catch (error) {
      console.error('Error saving image:', error);
      showStatusMessage('Failed to save image. Please try again.', 'error');
    }
  }

  static handleStandardSave(dataUrl, filename, showStatusMessage) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    
    setTimeout(() => {
      link.click();
      document.body.removeChild(link);
      showStatusMessage('Image saved successfully!', 'success');
    }, 100);
  }

  static handleIOSChromeSave(dataUrl, filename, showStatusMessage) {
    try {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Save Your Edited Photo</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                text-align: center;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                margin: 20px 0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .instructions {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #2196f3;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📸 Your Edited Photo</h1>
              <img src="${dataUrl}" alt="Edited photo">
              <div class="instructions">
                <h3>📱 How to save on iOS Chrome:</h3>
                <ol style="text-align: left;">
                  <li>Long press on the image above</li>
                  <li>Select "Save to Photos" or "Download Image"</li>
                  <li>The image will be saved to your Photos app</li>
                </ol>
              </div>
              <button onclick="window.close()" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;">
                Close This Tab
              </button>
            </div>
          </body>
          </html>
        `);
        newWindow.document.close();
        showStatusMessage('Image opened in new tab. Follow instructions to save.', 'info');
      } else {
        this.handleStandardSave(dataUrl, filename, showStatusMessage);
      }
    } catch (error) {
      console.error('Error opening save window:', error);
      this.handleStandardSave(dataUrl, filename, showStatusMessage);
    }
  }
}
