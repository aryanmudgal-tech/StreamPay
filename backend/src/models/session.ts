import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';
import { WatchSession } from '../types';
import { recomputeAvgWatchRatio } from './video';

export function createSession(installId: string, videoId: string, priceQuoted: number): WatchSession {
  const sessionId = uuidv4();
  getDb().prepare(`
    INSERT INTO watch_sessions (session_id, install_id, video_id, price_quoted)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, installId, videoId, priceQuoted);

  return getDb().prepare('SELECT * FROM watch_sessions WHERE session_id = ?').get(sessionId) as WatchSession;
}

export function getSession(sessionId: string): WatchSession | undefined {
  return getDb().prepare('SELECT * FROM watch_sessions WHERE session_id = ?').get(sessionId) as WatchSession | undefined;
}

export function updateSessionTime(sessionId: string, secondsWatched: number): void {
  getDb().prepare('UPDATE watch_sessions SET seconds_watched = ? WHERE session_id = ?')
    .run(secondsWatched, sessionId);
}

export function endSession(sessionId: string, secondsWatched: number, priceFinal: number): WatchSession | undefined {
  const db = getDb();
  db.prepare(`
    UPDATE watch_sessions
    SET status = 'completed', seconds_watched = ?, price_final = ?, ended_at = datetime('now')
    WHERE session_id = ?
  `).run(secondsWatched, priceFinal, sessionId);

  const session = getSession(sessionId);
  if (session) {
    recomputeAvgWatchRatio(session.video_id);
  }
  return session;
}

export function declineSession(installId: string, videoId: string, priceQuoted: number): WatchSession {
  const sessionId = uuidv4();
  getDb().prepare(`
    INSERT INTO watch_sessions (session_id, install_id, video_id, status, price_quoted, ended_at)
    VALUES (?, ?, ?, 'declined', ?, datetime('now'))
  `).run(sessionId, installId, videoId, priceQuoted);

  return getDb().prepare('SELECT * FROM watch_sessions WHERE session_id = ?').get(sessionId) as WatchSession;
}

export function listSessions(limit = 100): WatchSession[] {
  return getDb().prepare('SELECT * FROM watch_sessions ORDER BY started_at DESC LIMIT ?').all(limit) as WatchSession[];
}
