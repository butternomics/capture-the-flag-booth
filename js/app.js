/* ========================================
   Capture the Flag ATL — App Controller
   State management, screen transitions,
   user flow, email capture, progress
   ======================================== */

import { initCanvas, renderFrame, exportImage, getWindow } from './canvas.js';
import { initTouch, setMinScale, destroyTouch } from './touch.js';
import { getLocation, getLocationFromURL, getEffectiveLocation, isKnockoutLocation, LOCATIONS, TOTAL_LOCATIONS } from './locations.js';
import { checkin, getCachedVisitor, getCachedProgress, getCachedKnockoutProgress, fetchProgress, fetchLeaderboard, fetchConfig, getCachedConfig, uploadPhoto, submitForReview } from './api.js';
import { t, toggleLang, getLang } from './i18n.js';

// ---- Format Definitions ----
const FORMATS = {
  square:   { width: 1080, height: 1080, label: 'Square (1:1)' },
  portrait: { width: 1080, height: 1350, label: 'Portrait (4:5)' },
  story:    { width: 1080, height: 1920, label: 'Story (9:16)' },
};

// ---- App State ----
const state = {
  screen: 'landing',
  locationSlug: null,
  location: null,
  format: null,
  formatName: null,
  photo: null,
  photoX: 0,
  photoY: 0,
  photoScale: 1,
  phase: 'group_stage',
  overrides: [],
};

// ---- DOM Elements ----
const app = document.getElementById('app');
const canvasEl = document.getElementById('preview-canvas');
const photoInput = document.getElementById('photo-input');
const uploadOverlay = document.getElementById('upload-overlay');
const editHint = document.getElementById('edit-hint');

// Buttons
const btnDownload = document.getElementById('btn-download');
const btnUpload = document.getElementById('btn-upload');
const btnBack = document.getElementById('btn-back');
const btnCapture = document.getElementById('btn-capture');
const btnAnother = document.getElementById('btn-another');
const btnProgress = document.getElementById('btn-progress');
const btnCaptureMore = document.getElementById('btn-capture-more');

// Landing elements
const landingLocationName = document.getElementById('landing-location-name');
const landingCountry = document.getElementById('landing-country');
const landingFlag = document.getElementById('landing-flag');
const landingTagline = document.getElementById('landing-tagline');

// Email modal
const emailModal = document.getElementById('email-modal');
const emailForm = document.getElementById('email-form');
const inputFirstName = document.getElementById('input-first-name');
const inputEmail = document.getElementById('input-email');
const btnSkipEmail = document.getElementById('btn-skip-email');

// Progress screen
const progressCount = document.getElementById('progress-count');
const progressTotal = document.getElementById('progress-total');
const progressBar = document.getElementById('progress-bar');
const progressList = document.getElementById('progress-list');
const progressMessage = document.getElementById('progress-message');

// Leaderboard
const leaderboardList = document.getElementById('leaderboard-list');

// ---- Screen Navigation ----
function goToScreen(name) {
  state.screen = name;
  app.setAttribute('data-screen', name);
  window.scrollTo(0, 0);
}

// ---- i18n: Update all translatable elements ----
function updateStrings() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = t(key);
  });
  document.querySelectorAll('.btn-lang-toggle').forEach(btn => {
    btn.textContent = t('switchLang');
  });
}

// ---- Phase Banner ----
const PHASE_LABELS = {
  group_stage: 'phaseGroupStage',
  knockout_r32: 'phaseR32',
  knockout_r16: 'phaseR16',
  semifinal: 'phaseSemifinal',
};

function updatePhaseBanner() {
  const banner = document.getElementById('phase-banner');
  const bannerText = document.getElementById('phase-banner-text');
  if (!banner || !bannerText) return;

  if (state.phase === 'group_stage') {
    banner.style.display = 'none';
  } else {
    bannerText.textContent = t(PHASE_LABELS[state.phase] || 'phaseGroupStage');
    banner.style.display = '';
  }
}

// ---- Location Initialization ----
function initLocation() {
  const slug = getLocationFromURL();
  if (!slug) {
    // No location param — show home screen
    goToScreen('home');
    return;
  }

  const loc = getEffectiveLocation(slug, state.overrides);
  if (!loc) {
    goToScreen('home');
    return;
  }

  state.locationSlug = slug;
  state.location = loc;

  // Populate landing screen
  landingLocationName.textContent = loc.name;
  landingCountry.textContent = `${t('pairedWith')} ${loc.country}`;
  landingFlag.textContent = loc.flag;
  landingTagline.textContent = `"${loc.tagline}"`;

  // Show/hide knockout badge on landing card
  const knockoutBadge = document.getElementById('landing-knockout-badge');
  if (knockoutBadge) {
    knockoutBadge.style.display = loc._knockout ? '' : 'none';
  }

  goToScreen('landing');
}

function showLocationPicker() {
  // Build a simple location grid if no ?loc= param
  const pickerGrid = document.getElementById('location-picker-grid');
  if (!pickerGrid) return;

  // Get cached progress to show captured indicators
  const progress = getCachedProgress();
  const visited = progress.visited || [];

  // Update picker stats pill
  const pickerStats = document.getElementById('picker-stats');
  if (pickerStats) {
    if (visited.length > 0) {
      pickerStats.innerHTML = `
        <span class="picker-stats-count">${visited.length}</span>
        <span class="picker-stats-label">${t('progressSoFar')}</span>
      `;
      pickerStats.style.display = '';
    } else {
      pickerStats.style.display = 'none';
    }
  }

  pickerGrid.innerHTML = '';
  const koProgress = getCachedKnockoutProgress();
  for (const [slug, baseLoc] of Object.entries(LOCATIONS)) {
    const loc = getEffectiveLocation(slug, state.overrides);
    const isCaptured = visited.includes(slug);
    const isKO = loc._knockout;
    const isKOCaptured = koProgress.some(k => k.location_id === slug && k.phase === state.phase);

    let classes = 'location-card';
    if (isCaptured) classes += ' location-card-captured';
    if (isKO) classes += ' location-card-knockout';

    const btn = document.createElement('button');
    btn.className = classes;
    btn.innerHTML = `
      ${isKO ? '<span class="location-card-knockout-badge">KO</span>' : ''}
      <span class="location-card-flag">${loc.flag}</span>
      <span class="location-card-name">${loc.name}</span>
      <span class="location-card-country">${loc.country}</span>
      ${isCaptured ? '<span class="location-card-check">\u2713</span>' : ''}
    `;
    btn.addEventListener('click', () => {
      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('loc', slug);
      window.history.pushState({}, '', url);
      state.locationSlug = slug;
      state.location = loc;

      landingLocationName.textContent = loc.name;
      landingCountry.textContent = `${t('pairedWith')} ${loc.country}`;
      landingFlag.textContent = loc.flag;
      landingTagline.textContent = `"${loc.tagline}"`;

      // Show/hide knockout badge
      const knockoutBadge = document.getElementById('landing-knockout-badge');
      if (knockoutBadge) {
        knockoutBadge.style.display = loc._knockout ? '' : 'none';
      }

      goToScreen('landing');
    });
    pickerGrid.appendChild(btn);
  }

  goToScreen('picker');
}

// ---- Photo Loading ----
function loadPhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  img.onload = () => {
    state.photo = img;

    // Calculate cover scale: photo must fill the frame window
    const win = getWindow();
    const coverScale = Math.max(win.w / img.naturalWidth, win.h / img.naturalHeight);
    state.photoScale = coverScale;
    setMinScale(coverScale);

    // Center the photo in the window
    const scaledW = img.naturalWidth * coverScale;
    const scaledH = img.naturalHeight * coverScale;
    state.photoX = win.x + (win.w - scaledW) / 2;
    state.photoY = win.y + (win.h - scaledH) / 2;

    // Update UI
    uploadOverlay.classList.add('hidden');
    editHint.classList.add('visible');
    btnDownload.disabled = false;

    renderFrame(state);
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
  };

  img.src = objectUrl;
}

// ---- Reset State ----
function resetPhotoState() {
  if (state.photo && state.photo.src) {
    URL.revokeObjectURL(state.photo.src);
  }
  state.photo = null;
  state.photoX = 0;
  state.photoY = 0;
  state.photoScale = 1;
  btnDownload.disabled = true;
  btnDownload.textContent = t('saveAndCheckin');
  editHint.classList.remove('visible');
  uploadOverlay.classList.remove('hidden');
  photoInput.value = '';
}

function resetAll() {
  resetPhotoState();
  state.format = null;
  state.formatName = null;
}

// ---- Email Modal ----
function showEmailModal() {
  // Pre-fill from cached visitor
  const cached = getCachedVisitor();
  if (cached) {
    inputFirstName.value = cached.firstName || '';
    inputEmail.value = cached.email || '';
  }
  emailModal.classList.add('visible');
}

function hideEmailModal() {
  emailModal.classList.remove('visible');
}

async function handleEmailSubmit(e) {
  e.preventDefault();
  const firstName = inputFirstName.value.trim();
  const email = inputEmail.value.trim();

  if (!firstName || !email) return;

  hideEmailModal();
  await doDownloadAndCheckin(email, firstName);
}

async function handleSkipEmail() {
  hideEmailModal();
  await doDownload();
}

/**
 * Generate a thumbnail from the canvas for server upload (480px wide max).
 */
function generateThumbnail() {
  const maxW = 480;
  const ratio = canvasEl.height / canvasEl.width;
  const thumbW = Math.min(canvasEl.width, maxW);
  const thumbH = Math.round(thumbW * ratio);

  const thumb = document.createElement('canvas');
  thumb.width = thumbW;
  thumb.height = thumbH;
  const tCtx = thumb.getContext('2d');
  tCtx.drawImage(canvasEl, 0, 0, thumbW, thumbH);

  return thumb.toDataURL('image/jpeg', 0.7);
}

async function doDownloadAndCheckin(email, firstName) {
  btnDownload.disabled = true;
  btnDownload.textContent = t('saving');

  try {
    // Generate thumbnail before export (canvas still has the composed image)
    const thumbnailData = generateThumbnail();

    // Download the image
    await exportImage(canvasEl, state.locationSlug, state.formatName);

    // Register check-in and get venue offer (pass phase for knockout)
    const checkinResult = await checkin(email, firstName, state.locationSlug, state.formatName, state.phase);

    // Upload thumbnail for admin review (fire and forget)
    uploadPhoto(email, state.locationSlug, thumbnailData);

    // Populate done screen with location + progress
    const progress = getCachedProgress();
    const visited = progress.visited || [];
    const count = visited.includes(state.locationSlug) ? visited.length : visited.length + 1;

    const doneLocationEl = document.getElementById('done-location-name');
    const doneProgressEl = document.getElementById('done-progress');
    const doneTitle = document.getElementById('done-title');
    const doneKOBadge = document.getElementById('done-knockout-badge');
    if (doneLocationEl) doneLocationEl.textContent = state.location?.name || '';
    if (doneProgressEl) doneProgressEl.textContent = `${count} ${t('progressSoFar')}`;

    // Show knockout badge + title on done screen if knockout capture
    if (state.location?._knockout && doneKOBadge) {
      doneKOBadge.style.display = '';
      if (doneTitle) doneTitle.textContent = t('knockoutCaptured');
    } else {
      if (doneKOBadge) doneKOBadge.style.display = 'none';
      if (doneTitle) doneTitle.textContent = t('flagCaptured');
    }

    // Show venue offer if present
    const offerEl = document.getElementById('done-offer');
    const offerTextEl = document.getElementById('done-offer-text');
    const offerCodeEl = document.getElementById('done-offer-code');
    if (offerEl) {
      if (checkinResult.offer) {
        offerTextEl.textContent = checkinResult.offer.offer_text;
        if (checkinResult.offer.offer_code) {
          offerCodeEl.textContent = checkinResult.offer.offer_code;
          offerCodeEl.style.display = '';
        } else {
          offerCodeEl.style.display = 'none';
        }
        offerEl.style.display = '';
      } else {
        offerEl.style.display = 'none';
      }
    }

    // Check if all 16 captured → show completion screen
    if (count >= TOTAL_LOCATIONS) {
      goToScreen('complete');
    } else {
      goToScreen('done');
    }
  } catch {
    btnDownload.textContent = t('saveAndCheckin');
    btnDownload.disabled = false;
  }
}

async function doDownload() {
  btnDownload.disabled = true;
  btnDownload.textContent = t('saving');

  try {
    await exportImage(canvasEl, state.locationSlug, state.formatName);

    // Populate done screen (no check-in since no email)
    const doneLocationEl = document.getElementById('done-location-name');
    const doneProgressEl = document.getElementById('done-progress');
    if (doneLocationEl) doneLocationEl.textContent = state.location?.name || '';
    if (doneProgressEl) doneProgressEl.textContent = '';

    // No check-in = no offer
    const offerEl = document.getElementById('done-offer');
    if (offerEl) offerEl.style.display = 'none';

    goToScreen('done');
  } catch {
    btnDownload.textContent = t('saveAndCheckin');
    btnDownload.disabled = false;
  }
}

// ---- Progress Screen ----
async function showProgress() {
  const visitor = getCachedVisitor();
  let progress;

  if (visitor?.email) {
    progress = await fetchProgress(visitor.email);
  } else {
    progress = getCachedProgress();
  }

  const visited = progress.visited || [];
  const total = TOTAL_LOCATIONS;

  progressCount.textContent = visited.length;
  progressTotal.textContent = total;

  // Progress bar
  const pct = Math.round((visited.length / total) * 100);
  progressBar.style.width = `${pct}%`;

  // Message + submit button visibility
  const btnSubmit = document.getElementById('btn-submit-review');
  if (visited.length >= total) {
    progressMessage.textContent = t('allCaptured');
    if (btnSubmit) btnSubmit.classList.remove('hidden');
  } else {
    progressMessage.textContent = t('keepExploring');
    if (btnSubmit) btnSubmit.classList.add('hidden');
  }

  // Knockout progress section
  const koSection = document.getElementById('knockout-progress');
  const koCount = document.getElementById('knockout-count');
  const koProgress = getCachedKnockoutProgress();
  if (koSection && koCount) {
    if (state.phase !== 'group_stage' && koProgress.length > 0) {
      koCount.textContent = koProgress.length;
      koSection.style.display = '';
    } else {
      koSection.style.display = 'none';
    }
  }

  // Location list
  progressList.innerHTML = '';
  for (const [slug, baseLoc] of Object.entries(LOCATIONS)) {
    const loc = getEffectiveLocation(slug, state.overrides);
    const li = document.createElement('li');
    li.className = 'progress-item' + (visited.includes(slug) ? ' captured' : '');
    li.innerHTML = `
      <span class="progress-item-flag">${loc.flag}</span>
      <span class="progress-item-name">${loc.name}</span>
      <span class="progress-item-status">${visited.includes(slug) ? '\u2713' : ''}</span>
    `;
    progressList.appendChild(li);
  }

  goToScreen('progress');
}

// ---- Leaderboard ----
async function showLeaderboard() {
  const data = await fetchLeaderboard();

  leaderboardList.innerHTML = '';
  if (data.leaders && data.leaders.length) {
    data.leaders.forEach((leader, i) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';
      li.innerHTML = `
        <span class="leaderboard-rank">${i + 1}</span>
        <span class="leaderboard-name">${leader.first_name}</span>
        <span class="leaderboard-count">${leader.count} ${t('locations')}</span>
      `;
      leaderboardList.appendChild(li);
    });
  } else {
    leaderboardList.innerHTML = '<li class="leaderboard-empty">Be the first explorer!</li>';
  }

  goToScreen('leaderboard');
}

// ---- Event Handlers ----

// "Capture This Flag" button on landing screen
btnCapture.addEventListener('click', () => {
  goToScreen('select');
});

// Format selection buttons
document.querySelectorAll('.format-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const formatName = btn.dataset.format;
    const format = FORMATS[formatName];
    if (!format) return;

    state.format = format;
    state.formatName = formatName;

    // Initialize canvas with location-specific frame
    await initCanvas(canvasEl, formatName, state.locationSlug, state.location, () => renderFrame(state));
    renderFrame(state);

    // Set up touch handling
    initTouch(canvasEl, state, () => renderFrame(state), getWindow);

    goToScreen('edit');
  });
});

// Photo input
photoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadPhoto(file);
});

// Upload overlay click
uploadOverlay.addEventListener('click', () => {
  photoInput.click();
});

// Change photo button
btnUpload.addEventListener('click', () => {
  photoInput.click();
});

// Download button — show email modal first
btnDownload.addEventListener('click', () => {
  if (!state.photo) return;

  const cached = getCachedVisitor();
  if (cached?.email) {
    // Already have email — skip modal, go straight to download + checkin
    doDownloadAndCheckin(cached.email, cached.firstName);
  } else {
    showEmailModal();
  }
});

// Email form submit
emailForm.addEventListener('submit', handleEmailSubmit);

// Skip email
btnSkipEmail.addEventListener('click', handleSkipEmail);

// Back button (edit → select)
btnBack.addEventListener('click', () => {
  destroyTouch();
  resetAll();
  goToScreen('select');
});

// "Capture Another Flag" button
btnAnother.addEventListener('click', () => {
  destroyTouch();
  resetAll();
  // Go back to landing for the same location, or picker
  if (state.location) {
    goToScreen('landing');
  } else {
    goToScreen('picker');
  }
});

// View progress button
btnProgress.addEventListener('click', showProgress);

// Capture more flags button (from progress screen)
btnCaptureMore.addEventListener('click', () => {
  if (state.location) {
    goToScreen('landing');
  } else {
    goToScreen('picker');
  }
});

// Leaderboard button
document.getElementById('btn-leaderboard')?.addEventListener('click', showLeaderboard);

// Back from leaderboard
document.getElementById('btn-leaderboard-back')?.addEventListener('click', () => {
  goToScreen('progress');
});

// Submit for review (from progress or completion screen)
document.getElementById('btn-submit-review')?.addEventListener('click', async () => {
  const visitor = getCachedVisitor();
  if (!visitor?.email) {
    showEmailModal();
    return;
  }

  const btn = document.getElementById('btn-submit-review');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  const result = await submitForReview(visitor.email);
  if (result.success) {
    goToScreen('submitted');
  } else {
    btn.textContent = t('submitForReview');
    btn.disabled = false;
    alert(result.error || 'Submission failed. Please try again.');
  }
});

// Completion screen submit button
document.getElementById('btn-complete-submit')?.addEventListener('click', async () => {
  const visitor = getCachedVisitor();
  if (!visitor?.email) {
    showEmailModal();
    return;
  }

  const btn = document.getElementById('btn-complete-submit');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  const result = await submitForReview(visitor.email);
  if (result.success) {
    goToScreen('submitted');
  } else {
    btn.textContent = t('submitForReview');
    btn.disabled = false;
    alert(result.error || 'Submission failed. Please try again.');
  }
});

// From submitted screen, go back to picker
document.getElementById('btn-submitted-done')?.addEventListener('click', () => {
  if (state.location) {
    goToScreen('landing');
  } else {
    goToScreen('picker');
  }
});

// "Get Started" button on home screen → show location picker
document.getElementById('btn-get-started')?.addEventListener('click', () => {
  showLocationPicker();
});

// Language toggle (class-based, works on all screens)
document.querySelectorAll('.btn-lang-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    toggleLang();
    updateStrings();
    // Re-populate location info if on landing
    if (state.location && state.screen === 'landing') {
      landingCountry.textContent = `${t('pairedWith')} ${state.location.country}`;
    }
  });
});

// Prevent default drag behavior
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// ---- Init ----
async function init() {
  updateStrings();

  // Fetch game config (phase + overrides) — use cached as fallback
  try {
    const config = await fetchConfig();
    state.phase = config.phase || 'group_stage';
    state.overrides = config.overrides || [];
  } catch {
    const cached = getCachedConfig();
    state.phase = cached.phase || 'group_stage';
    state.overrides = cached.overrides || [];
  }

  updatePhaseBanner();
  initLocation();
}

init();
