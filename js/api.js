/* ========================================
   API Client
   Backend communication with offline retry queue
   and localStorage caching for progress
   ======================================== */

const API_BASE = '/api';
const STORAGE_KEY_VISITOR = 'ctf_visitor';
const STORAGE_KEY_PROGRESS = 'ctf_progress';
const STORAGE_KEY_QUEUE = 'ctf_retry_queue';

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
 * @returns {Promise<{success: boolean, queued?: boolean}>}
 */
export async function checkin(email, firstName, locationId, format) {
  const payload = { email, firstName, locationId, format };

  // Optimistically update local progress
  updateLocalProgress(locationId);
  cacheVisitor(email, firstName);

  try {
    const res = await fetch(`${API_BASE}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 409) {
      // 409 = already checked in at this location — still a success
      return { success: true };
    }

    // Server error — queue for retry
    addToQueue(payload);
    return { success: true, queued: true };
  } catch {
    // Network error — queue for retry
    addToQueue(payload);
    return { success: true, queued: true };
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
 * @returns {Promise<{visited: string[], total: number}>}
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
      return progress;
    }
  } catch {
    // Offline — return local cache
  }
  return getCachedProgress();
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

// ---- Auto-flush on page load ----
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushQueue());
  // Attempt flush on load
  setTimeout(() => flushQueue(), 2000);
}
