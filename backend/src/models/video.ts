import { getDb } from '../db/connection';
import { Video } from '../types';

export function upsertVideo(videoId: string, title: string, channel: string, durationSeconds: number): Video {
  const db = getDb();

  db.prepare(`
    INSERT INTO videos (video_id, title, channel, duration_seconds)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(video_id) DO UPDATE SET
      title = excluded.title,
      channel = excluded.channel,
      duration_seconds = excluded.duration_seconds,
      updated_at = datetime('now')
  `).run(videoId, title, channel, durationSeconds);

  return db.prepare('SELECT * FROM videos WHERE video_id = ?').get(videoId) as Video;
}

export function getVideo(videoId: string): Video | undefined {
  return getDb().prepare('SELECT * FROM videos WHERE video_id = ?').get(videoId) as Video | undefined;
}

export function setOverridePrice(videoId: string, price: number | null): Video | undefined {
  const db = getDb();
  db.prepare('UPDATE videos SET override_price = ?, updated_at = datetime(\'now\') WHERE video_id = ?')
    .run(price, videoId);
  return getVideo(videoId);
}

export function recomputeAvgWatchRatio(videoId: string): void {
  const db = getDb();
  const row = db.prepare(`
    SELECT AVG(
      CASE WHEN v.duration_seconds > 0
        THEN CAST(s.seconds_watched AS REAL) / v.duration_seconds
        ELSE 0
      END
    ) as ratio
    FROM watch_sessions s
    JOIN videos v ON v.video_id = s.video_id
    WHERE s.video_id = ? AND s.status = 'completed'
  `).get(videoId) as { ratio: number | null } | undefined;

  const ratio = row?.ratio ?? 0;
  db.prepare('UPDATE videos SET avg_watch_ratio = ?, updated_at = datetime(\'now\') WHERE video_id = ?')
    .run(ratio, videoId);
}

export function listVideos(limit = 50): Video[] {
  return getDb().prepare('SELECT * FROM videos ORDER BY updated_at DESC LIMIT ?').all(limit) as Video[];
}
