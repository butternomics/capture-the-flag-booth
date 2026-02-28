/* ========================================
   Canvas Rendering Engine
   Adapted from 404 Day booth for multi-location frames
   ======================================== */

import { generateFrame, getWindowRect, loadFrame } from './frames.js';

const COLORS = {
  green: '#1B3A2D',
  greenDark: '#152E23',
};

const FORMATS = {
  square:   { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story:    { width: 1080, height: 1920 },
};

let canvas = null;
let ctx = null;
let currentFormat = null;
let currentOverlay = null;
let currentLocationSlug = null;

/**
 * Get the photo window rectangle for the current format.
 * Uses the programmatic window definition (consistent regardless of PNG vs generated).
 */
export function getWindow() {
  if (!currentFormat) {
    return { x: 40, y: 120, w: 1000, h: 800 };
  }
  return getWindowRect(currentFormat);
}

/**
 * Initialize the canvas for a given format and location.
 * Loads the frame overlay (PNG if available, programmatic fallback).
 */
export async function initCanvas(canvasEl, formatName, locationSlug, locationConfig, renderCallback) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  const fmt = FORMATS[formatName];
  canvas.width = fmt.width;
  canvas.height = fmt.height;
  currentFormat = formatName;
  currentLocationSlug = locationSlug;

  // Generate programmatic frame immediately for instant rendering
  currentOverlay = generateFrame(locationConfig, formatName);

  // Render immediately with programmatic frame
  if (renderCallback) renderCallback();

  // Try to load designer PNG (async, will replace programmatic if found)
  try {
    const pngOverlay = await loadFrame(locationSlug, formatName, locationConfig);
    if (currentFormat === formatName && currentLocationSlug === locationSlug) {
      currentOverlay = pngOverlay;
      if (renderCallback) renderCallback();
    }
  } catch {
    // Keep programmatic frame
  }
}

/**
 * Full redraw: background, user photo, frame overlay
 */
export function renderFrame(state) {
  if (!canvas || !ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const win = getWindow();

  // Layer 1: Green background (full canvas)
  ctx.fillStyle = COLORS.green;
  ctx.fillRect(0, 0, w, h);

  // Layer 2: User photo (clipped to window area)
  if (state.photo) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(win.x, win.y, win.w, win.h);
    ctx.clip();

    const scaledW = state.photo.naturalWidth * state.photoScale;
    const scaledH = state.photo.naturalHeight * state.photoScale;
    ctx.drawImage(state.photo, state.photoX, state.photoY, scaledW, scaledH);

    ctx.restore();
  } else {
    // Placeholder: darker interior
    ctx.fillStyle = COLORS.greenDark;
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }

  // Layer 3: Frame overlay
  if (currentOverlay) {
    ctx.drawImage(currentOverlay, 0, 0, w, h);
  }
}

/**
 * Export canvas as a JPEG blob and trigger download
 */
export function exportImage(canvasEl, locationSlug, formatName) {
  return new Promise((resolve) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const filename = `capture-the-flag-${locationSlug}-${formatName}.jpg`;

    canvasEl.toBlob((blob) => {
      const url = URL.createObjectURL(blob);

      if (isIOS) {
        window.open(url, '_blank');
        resolve({ ios: true });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        resolve({ ios: false });
      }
    }, 'image/jpeg', 0.92);
  });
}
