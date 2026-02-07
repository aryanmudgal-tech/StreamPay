import { Router, Request, Response } from 'express';
import { upsertVideo, getVideo } from '../models/video';
import { computePrice } from '../services/pricing';

const router = Router();

// GET /api/videos/:id/price?title=&channel=&duration=
router.get('/videos/:id/price', (req: Request, res: Response) => {
  const videoId = req.params.id as string;
  const title = (req.query.title as string) || '';
  const channel = (req.query.channel as string) || '';
  const duration = parseInt(req.query.duration as string, 10) || 0;

  // Auto-upsert the video on price lookup
  const video = upsertVideo(videoId, title, channel, duration);
  const priceCents = computePrice(video.avg_watch_ratio, video.override_price);

  const centsPerSecond = video.duration_seconds > 0
    ? priceCents / video.duration_seconds
    : 0;

  res.json({
    videoId: video.video_id,
    priceCents,
    centsPerSecond: Math.round(centsPerSecond * 10000) / 10000,
    avgWatchRatio: video.avg_watch_ratio,
    overridePrice: video.override_price,
    durationSeconds: video.duration_seconds,
  });
});

export default router;
