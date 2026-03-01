/* ========================================
   API Client
   Backend communication with offline retry queue
   and localStorage caching for progress
   ======================================== */

const API_BASE = '/api';
const STORAGE_KEY_VISITOR = 'ctf_visitor';
const STORAGE_KEY_PROGRESS = 'ctf_progress';
const STORAGE_KEY_QUEUE = 'ctf_retry_queue';
const STORAGE_KEY_CONFIG = 'ctf_config';
const STORAGE_KEY_KNOCKOUT = 'ctf_knockout_progress';

// ---- LocalStorage helpers ----

function getStored(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// ---- Retry Queue ----

function getQueue() {
  return getStored(STORAGE_KEY_QUEUE) || [];
}

function addToQueue(entry) {
  const queue = getQueue();
  queue.push(entry);
  setStored(STORAGE_KEY_QUEUE, queue);
}

function clearQueue() {
  setStored(STORAGE_KEY_QUEUE, []);
}

/** Process any pending check-ins from the retry queue */
export async function flushQueue() {
  const queue = getQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const entry of queue) {
    try {
      const res = await fetch(`${API_BASE}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!res.ok && res.status !== 409) {
        // 409 = duplicate, which is fine — discard it
        remaining.push(entry);
      }
    } catch {
      remaining.push(entry);
    }
  }
  setStored(STORAGE_KEY_QUEUE, remaining);
}

// ---- Visitor (cached in localStorage) ----

/** Get cached visitor info */
export function getCachedVisitor() {
  return getStored(STORAGE_KEY_VISITOR);
}

/** Save visitor info locally */
export function cacheVisitor(email, firstName) {
  setStored(STORAGE_KEY_VISITOR, { email, firstName });
}

// ---- Check-in ----

/**
 * Register a check-in. Queues for retry on failure.
 * @param {string} email
 * @param {string} firstName
 * @param {string} locationId - location slug
 * @param {string} format - portrait/story/square
 * @param {string} [phase] - game phase (default: 'group_stage')
 * @returns {Promise<{success: boolean, queued?: boolean}>}
 */
export async function checkin(email, firstName, locationId, format, phase) {
  const checkinPhase = phase || 'group_stage';
  const payload = { email, firstName, locationId, format, phase: checkinPhase };

  // Optimistically update local progress
  if (checkinPhase === 'group_stage') {
    updateLocalProgress(locationId);
  } else {
    updateKnockoutProgress(locationId, checkinPhase);
  }
  cacheVisitor(email, firstName);

  try {
    const res = await fetch(`${API_BASE}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 409) {
      // 409 = already checked in at this location/phase — still a success
      const data = await res.json().catch(() => ({}));
      return { success: true, offer: data.offer || null };
    }

    // Server error — queue for retry
    addToQueue(payload);
    return { success: true, queued: true, offer: null };
  } catch {
    // Network error — queue for retry
    addToQueue(payload);
    return { success: true, queued: true, offer: null };
  }
}

// ---- Progress ----

function updateLocalProgress(locationId) {
  const progress = getStored(STORAGE_KEY_PROGRESS) || { visited: [] };
  if (!progress.visited.includes(locationId)) {
    progress.visited.push(locationId);
  }
  setStored(STORAGE_KEY_PROGRESS, progress);
}

/** Get cached progress (works offline) */
export function getCachedProgress() {
  return getStored(STORAGE_KEY_PROGRESS) || { visited: [] };
}

/**
 * Fetch progress from server and merge with local cache
 * @param {string} email
 * @returns {Promise<{visited: string[], total: number, knockoutCaptures: Array}>}
 */
export async function fetchProgress(email) {
  try {
    const res = await fetch(`${API_BASE}/progress?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      const data = await res.json();
      // Merge server data with local cache
      const local = getCachedProgress();
      const merged = [...new Set([...data.visited, ...local.visited])];
      const progress = { visited: merged, total: data.total };
      setStored(STORAGE_KEY_PROGRESS, progress);

      // Merge knockout captures from server
      if (data.knockoutCaptures && data.knockoutCaptures.length) {
        const localKO = getCachedKnockoutProgress();
        for (const kc of data.knockoutCaptures) {
          const exists = localKO.some(
            l => l.location_id === kc.location_id && l.phase === kc.phase
          );
          if (!exists) localKO.push(kc);
        }
        setStored(STORAGE_KEY_KNOCKOUT, localKO);
      }

      return { ...progress, knockoutCaptures: getCachedKnockoutProgress() };
    }
  } catch {
    // Offline — return local cache
  }
  return { ...getCachedProgress(), knockoutCaptures: getCachedKnockoutProgress() };
}

// ---- Photo Upload ----

/**
 * Upload a photo thumbnail to the server.
 * @param {string} email
 * @param {string} locationId
 * @param {string} imageData - base64 JPEG data URL
 * @returns {Promise<{success: boolean, photoUrl?: string}>}
 */
export async function uploadPhoto(email, locationId, imageData) {
  try {
    const res = await fetch(`${API_BASE}/upload-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, locationId, imageData }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, photoUrl: data.photoUrl };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

// ---- Submission ----

/**
 * Submit for review after capturing all 16 flags.
 * @param {string} email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function submitForReview(email) {
  try {
    const res = await fetch(`${API_BASE}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (res.ok) {
      return { success: true, submissionId: data.submissionId };
    }
    return { success: false, error: data.error };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

// ---- Leaderboard ----

/**
 * Fetch leaderboard data
 * @returns {Promise<{leaders: Array, locationStats: Array}>}
 */
export async function fetchLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline
  }
  return { leaders: [], locationStats: [] };
}

// ---- Game Config ----

/**
 * Fetch current game config (phase + overrides) from server
 * @returns {Promise<{phase: string, overrides: Array}>}
 */
export async function fetchConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    if (res.ok) {
      const data = await res.json();
      setStored(STORAGE_KEY_CONFIG, data);
      return data;
    }
  } catch {
    // Offline — return cached
  }
  return getCachedConfig();
}

/** Get cached config (works offline) */
export function getCachedConfig() {
  return getStored(STORAGE_KEY_CONFIG) || { phase: 'group_stage', overrides: [] };
}

// ---- Knockout Progress ----

function updateKnockoutProgress(locationId, phase) {
  const ko = getStored(STORAGE_KEY_KNOCKOUT) || [];
  const exists = ko.some(k => k.location_id === locationId && k.phase === phase);
  if (!exists) {
    ko.push({ location_id: locationId, phase });
    setStored(STORAGE_KEY_KNOCKOUT, ko);
  }
}

/** Get cached knockout captures */
export function getCachedKnockoutProgress() {
  return getStored(STORAGE_KEY_KNOCKOUT) || [];
}

// ---- Auto-flush on page load ----
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushQueue());
  // Attempt flush on load
  setTimeout(() => flushQueue(), 2000);
}
