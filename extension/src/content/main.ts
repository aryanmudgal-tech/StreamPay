import { API_BASE } from '../shared/constants';
import { apiFetch, setBadge } from '../shared/api-client';
import { PriceResponse, SessionResponse } from '../shared/types';
import { getVideoId, getVideoElement, getPlayerContainer, getVideoTitle, getChannelName, isAdPlaying, onYouTubeNavigate } from './youtube-utils';
import { createGateOverlay } from './gate';
import { createChargingBadge } from './badge';
import { startMeter } from './meter';

type State = 'idle' | 'gated' | 'watching' | 'declined';

let currentState: State = 'idle';
let currentVideoId: string | null = null;
let cleanup: (() => void) | null = null;

// Track which videos have been declined (per page load)
const declinedVideos = new Set<string>();

async function onVideoPage() {
  const videoId = getVideoId();
  if (!videoId || videoId === currentVideoId) return;

  // Clean up previous session
  teardown();
  currentVideoId = videoId;

  // Skip if already declined this video
  if (declinedVideos.has(videoId)) {
    currentState = 'declined';
    return;
  }

  // Wait for video element to appear
  const video = await waitForElement<HTMLVideoElement>(() => getVideoElement(), 5000);
  if (!video) return;

  const container = getPlayerContainer();
  if (!container) return;

  // Wait a moment for YouTube to populate metadata
  await sleep(500);

  // Skip ads
  if (isAdPlaying()) {
    const adObserver = new MutationObserver(() => {
      if (!isAdPlaying()) {
        adObserver.disconnect();
        showGate(videoId, video, container);
      }
    });
    adObserver.observe(container, { attributes: true, attributeFilter: ['class'] });
    return;
  }

  showGate(videoId, video, container);
}

async function showGate(videoId: string, video: HTMLVideoElement, container: HTMLElement) {
  // Pause the video
  video.pause();

  // Block keyboard shortcuts (space, k) from resuming playback while gated
  const blockPlaybackKeys = (e: KeyboardEvent) => {
    if (currentState !== 'gated') return;
    if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  };
  document.addEventListener('keydown', blockPlaybackKeys, true);

  // Also re-pause if video somehow starts playing while gated
  const guardPlay = () => {
    if (currentState === 'gated') video.pause();
  };
  video.addEventListener('play', guardPlay);

  // Fetch price
  const title = getVideoTitle();
  const channel = getChannelName();
  const duration = Math.floor(video.duration || 0);

  const priceRes = await apiFetch(
    `${API_BASE}/videos/${videoId}/price?title=${encodeURIComponent(title)}&channel=${encodeURIComponent(channel)}&duration=${duration}`
  );

  if (!priceRes.ok) {
    console.error('[streampay] Failed to fetch price:', priceRes);
    removeGuards();
    video.play();
    return;
  }

  const priceData: PriceResponse = priceRes.data;
  currentState = 'gated';

  function removeGuards() {
    document.removeEventListener('keydown', blockPlaybackKeys, true);
    video.removeEventListener('play', guardPlay);
  }

  // Show overlay with total price + per-second rate
  const gate = createGateOverlay(
    container,
    priceData.priceCents,
    priceData.centsPerSecond,
    priceData.durationSeconds,
    title,
    {
      onStart: async () => {
        removeGuards();
        gate.remove();
        await startWatching(videoId, video, container, priceData);
      },
      onDecline: async () => {
        removeGuards();
        gate.remove();
        currentState = 'declined';
        declinedVideos.add(videoId);

        // Log decline
        apiFetch(`${API_BASE}/sessions/decline`, 'POST', {
          videoId,
          priceQuoted: priceData.priceCents,
        }).catch(() => {});

        setBadge('').catch(() => {});

        // Navigate back to the previous page
        history.back();
      },
    }
  );

  // Store cleanup
  cleanup = () => {
    removeGuards();
    gate.remove();
  };
}

async function startWatching(
  videoId: string,
  video: HTMLVideoElement,
  container: HTMLElement,
  priceData: PriceResponse
) {
  // Create session
  const sessionRes = await apiFetch(`${API_BASE}/sessions`, 'POST', {
    videoId,
    priceQuoted: priceData.priceCents,
  });

  if (!sessionRes.ok) {
    console.error('[streampay] Failed to create session:', sessionRes);
    video.play();
    return;
  }

  const session: SessionResponse = sessionRes.data;
  currentState = 'watching';

  // Resume playback
  video.play();

  // Shared function to finalize session
  const finalizeSession = async (seconds: number) => {
    await endSession(session.session_id, seconds);
    badge.remove();
    meter.stop();
    currentState = 'idle';
    setBadge('').catch(() => {});
  };

  // Show charging badge with Resume/Complete controls
  const badge = createChargingBadge(container, {
    onResume: () => {
      video.play();
    },
    onComplete: async () => {
      video.pause();
      await finalizeSession(meter.getSecondsWatched());
      // Redirect to YouTube landing page
      window.location.href = 'https://www.youtube.com';
    },
  });

  // Start metering
  const meter = startMeter(session.session_id, video, {
    onTick: (secondsWatched) => {
      badge.update(secondsWatched, priceData.priceCents, priceData.durationSeconds);
    },
    onEnd: async (secondsWatched) => {
      await finalizeSession(secondsWatched);
    },
  });

  // Set extension badge
  setBadge('$', '#1f7cff').catch(() => {});

  // Store cleanup — uses meter's tracked seconds (not video.currentTime which may be 0)
  cleanup = () => {
    const watched = meter.getSecondsWatched();
    meter.stop();
    badge.remove();
    if (watched > 0) {
      endSession(session.session_id, watched).catch(() => {});
    }
    setBadge('').catch(() => {});
  };
}

async function endSession(sessionId: string, secondsWatched: number) {
  await apiFetch(`${API_BASE}/sessions/${sessionId}/end`, 'POST', {
    secondsWatched,
  }).catch(() => {});
}

function teardown() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  currentState = 'idle';
  currentVideoId = null;
}

// Utility: wait for an element to appear
function waitForElement<T extends Element>(
  selector: () => T | null,
  timeout: number
): Promise<T | null> {
  return new Promise((resolve) => {
    const el = selector();
    if (el) return resolve(el);

    const start = Date.now();
    const interval = setInterval(() => {
      const el = selector();
      if (el) {
        clearInterval(interval);
        resolve(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        resolve(null);
      }
    }, 200);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize
function init() {
  console.log('[streampay] Content script loaded');

  // Handle initial page load
  onVideoPage();

  // Handle SPA navigations
  onYouTubeNavigate(() => {
    onVideoPage();
  });
}

init();
