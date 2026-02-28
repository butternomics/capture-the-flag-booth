/* ========================================
   Programmatic Frame Generation
   Generates branded frames on canvas
   Falls back to PNG assets when available
   ======================================== */

const COLORS = {
  green: '#1B3A2D',
  greenDark: '#152E23',
  gold: '#C9A94E',
  goldDim: '#A68B3C',
  text: '#F5F0E8',
  textDim: '#A89E8C',
};

const FORMATS = {
  portrait: { width: 1080, height: 1350 },
  story:    { width: 1080, height: 1920 },
  square:   { width: 1080, height: 1080 },
};

// Photo window insets (pixels from edges at 1080-wide resolution)
const WINDOW_INSETS = {
  portrait: { top: 140, bottom: 180, left: 40, right: 40 },
  story:    { top: 160, bottom: 260, left: 40, right: 40 },
  square:   { top: 120, bottom: 160, left: 40, right: 40 },
};

// Cache generated frames
const frameCache = {};

/**
 * Generate a branded frame overlay for a location + format.
 * Returns a canvas element with transparent photo window.
 */
export function generateFrame(locationConfig, formatName) {
  const cacheKey = `${locationConfig.name}-${formatName}`;
  if (frameCache[cacheKey]) return frameCache[cacheKey];

  const fmt = FORMATS[formatName];
  const inset = WINDOW_INSETS[formatName];
  const canvas = document.createElement('canvas');
  canvas.width = fmt.width;
  canvas.height = fmt.height;
  const ctx = canvas.getContext('2d');

  // Full green background
  ctx.fillStyle = COLORS.green;
  ctx.fillRect(0, 0, fmt.width, fmt.height);

  // Photo window — cut out transparent
  const winX = inset.left;
  const winY = inset.top;
  const winW = fmt.width - inset.left - inset.right;
  const winH = fmt.height - inset.top - inset.bottom;
  ctx.clearRect(winX, winY, winW, winH);

  // Gold border around photo window
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(winX - 1.5, winY - 1.5, winW + 3, winH + 3);

  // Top area — branding
  const topCenter = inset.top / 2;

  // "CAPTURE THE FLAG" header
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CAPTURE THE FLAG', fmt.width / 2, topCenter - 20);

  // Location name + flag
  ctx.fillStyle = COLORS.text;
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif';
  const locText = `${locationConfig.flag}  ${locationConfig.name.toUpperCase()}`;
  ctx.fillText(locText, fmt.width / 2, topCenter + 16);

  // Country pairing (small)
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '16px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif';
  ctx.fillText(`Paired with ${locationConfig.country}`, fmt.width / 2, topCenter + 44);

  // Bottom area — footer branding
  const bottomStart = fmt.height - inset.bottom;
  const bottomCenter = bottomStart + inset.bottom / 2;

  // Location tagline
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'italic 18px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif';
  ctx.fillText(`"${locationConfig.tagline}"`, fmt.width / 2, bottomCenter - 30);

  // "WORLD WELCOME TO ATLANTA"
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif';
  ctx.fillText('WORLD WELCOME TO ATLANTA', fmt.width / 2, bottomCenter + 10);

  // "SHOWCASE ATLANTA" subtitle
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('SHOWCASE ATLANTA  \u2022  2026', fmt.width / 2, bottomCenter + 38);

  // Decorative gold corners on the frame
  const cornerLen = 30;
  const cornerThick = 3;
  ctx.fillStyle = COLORS.gold;

  // Top-left corner
  ctx.fillRect(winX - cornerThick, winY - cornerThick, cornerLen, cornerThick);
  ctx.fillRect(winX - cornerThick, winY - cornerThick, cornerThick, cornerLen);
  // Top-right corner
  ctx.fillRect(winX + winW - cornerLen + cornerThick, winY - cornerThick, cornerLen, cornerThick);
  ctx.fillRect(winX + winW, winY - cornerThick, cornerThick, cornerLen);
  // Bottom-left corner
  ctx.fillRect(winX - cornerThick, winY + winH, cornerLen, cornerThick);
  ctx.fillRect(winX - cornerThick, winY + winH - cornerLen + cornerThick, cornerThick, cornerLen);
  // Bottom-right corner
  ctx.fillRect(winX + winW - cornerLen + cornerThick, winY + winH, cornerLen, cornerThick);
  ctx.fillRect(winX + winW, winY + winH - cornerLen + cornerThick, cornerThick, cornerLen);

  frameCache[cacheKey] = canvas;
  return canvas;
}

/**
 * Get the photo window rectangle for a given format.
 * Returns { x, y, w, h } in canvas pixels.
 */
export function getWindowRect(formatName) {
  const fmt = FORMATS[formatName];
  const inset = WINDOW_INSETS[formatName];
  return {
    x: inset.left,
    y: inset.top,
    w: fmt.width - inset.left - inset.right,
    h: fmt.height - inset.top - inset.bottom,
  };
}

/**
 * Try to load a designer PNG frame, falling back to programmatic.
 * Returns a promise that resolves to a canvas element.
 */
export function loadFrame(locationSlug, formatName, locationConfig) {
  const pngPath = `assets/frames/${locationSlug}-${formatName}.png`;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Process the PNG like the 404 booth does
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d');
      offCtx.drawImage(img, 0, 0);

      const imageData = offCtx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Check for existing transparency
      let hasTransparency = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 10) { hasTransparency = true; break; }
      }

      if (!hasTransparency) {
        // Convert white region to transparent (same approach as 404 booth)
        const cx = Math.floor(w / 2);
        const cy = Math.floor(h / 2);
        let left = cx, right = cx, top = cy, bottom = cy;

        const isWhite = (x, y) => {
          const idx = (y * w + x) * 4;
          return data[idx] >= 240 && data[idx + 1] >= 240 && data[idx + 2] >= 240;
        };

        while (left > 0 && isWhite(left - 1, cy)) left--;
        while (right < w - 1 && isWhite(right + 1, cy)) right++;
        while (top > 0 && isWhite(cx, top - 1)) top--;
        while (bottom < h - 1 && isWhite(cx, bottom + 1)) bottom++;

        for (let y = top; y <= bottom; y++) {
          for (let x = left; x <= right; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx] >= 240 && data[idx + 1] >= 240 && data[idx + 2] >= 240) {
              data[idx + 3] = 0;
            }
          }
        }
        offCtx.putImageData(imageData, 0, 0);
      }

      resolve(offscreen);
    };
    img.onerror = () => {
      // No PNG available — use programmatic frame
      resolve(generateFrame(locationConfig, formatName));
    };
    img.src = pngPath;
  });
}
