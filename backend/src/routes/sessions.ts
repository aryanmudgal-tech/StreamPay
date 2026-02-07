import { Router, Request, Response } from 'express';
import { extractInstallId } from '../middleware/install-id';
import { getVideo } from '../models/video';
import { createSession, getSession, updateSessionTime, endSession, declineSession } from '../models/session';
import { insertEvent } from '../models/event';
import { computePrice } from '../services/pricing';
import { paymentProvider } from '../services/payment-provider';
import { EventType } from '../types';

const router = Router();

// POST /api/sessions — start a new watch session
router.post('/sessions', extractInstallId, (req: Request, res: Response) => {
  const { videoId, priceQuoted } = req.body;
  if (!videoId || priceQuoted === undefined) {
    res.status(400).json({ error: 'videoId and priceQuoted required' });
    return;
  }

  const session = createSession(req.installId!, videoId, priceQuoted);
  insertEvent(session.session_id, 'play', 0);
  res.status(201).json(session);
});

// POST /api/sessions/decline — record a declined session
router.post('/sessions/decline', extractInstallId, (req: Request, res: Response) => {
  const { videoId, priceQuoted } = req.body;
  if (!videoId || priceQuoted === undefined) {
    res.status(400).json({ error: 'videoId and priceQuoted required' });
    return;
  }

  const session = declineSession(req.installId!, videoId, priceQuoted);
  res.status(201).json(session);
});

// POST /api/sessions/:id/events — log a watch event
router.post('/sessions/:id/events', (req: Request, res: Response) => {
  const sessionId = req.params.id as string;
  const { eventType, timestampSeconds, metadata } = req.body;

  const validTypes: EventType[] = ['play', 'pause', 'seek', 'heartbeat', 'end'];
  if (!validTypes.includes(eventType)) {
    res.status(400).json({ error: `eventType must be one of: ${validTypes.join(', ')}` });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Update seconds watched on heartbeats
  if (eventType === 'heartbeat' && typeof timestampSeconds === 'number') {
    updateSessionTime(sessionId, Math.floor(timestampSeconds));
  }

  const event = insertEvent(sessionId, eventType, timestampSeconds || 0, metadata);
  res.status(201).json(event);
});

// POST /api/sessions/:id/end — finalize a session
router.post('/sessions/:id/end', async (req: Request, res: Response) => {
  const sessionId = req.params.id as string;
  const { secondsWatched } = req.body;

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  if (session.status !== 'active') {
    res.status(400).json({ error: 'Session already ended' });
    return;
  }

  const video = getVideo(session.video_id);
  const watchRatio = video && video.duration_seconds > 0
    ? (secondsWatched || session.seconds_watched) / video.duration_seconds
    : 1;

  // Prorate price based on watch ratio
  const priceFinal = Math.round(session.price_quoted * Math.min(watchRatio, 1));

  // Stub charge
  await paymentProvider.charge(session.install_id, priceFinal, `session:${sessionId}`);

  insertEvent(sessionId, 'end', secondsWatched || session.seconds_watched);
  const ended = endSession(sessionId, secondsWatched || session.seconds_watched, priceFinal);

  res.json(ended);
});

export default router;
