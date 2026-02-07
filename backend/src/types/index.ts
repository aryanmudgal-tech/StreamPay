// ── Video ──
export interface Video {
  video_id: string;
  title: string;
  channel: string;
  duration_seconds: number;
  avg_watch_ratio: number;
  override_price: number | null;
  created_at: string;
  updated_at: string;
}

// ── Watch Session ──
export type SessionStatus = 'active' | 'completed' | 'declined';

export interface WatchSession {
  session_id: string;
  install_id: string;
  video_id: string;
  status: SessionStatus;
  price_quoted: number;
  price_final: number | null;
  seconds_watched: number;
  started_at: string;
  ended_at: string | null;
}

// ── Watch Event ──
export type EventType = 'play' | 'pause' | 'seek' | 'heartbeat' | 'end';

export interface WatchEvent {
  event_id: number;
  session_id: string;
  event_type: EventType;
  timestamp_seconds: number;
  metadata: string | null;
  created_at: string;
}

// ── Pricing ──
export interface PricingConfig {
  basePriceCents: number;
  maxShiftPct: number;        // max ±% shift from base (0.25 = 25%)
  demandWeight: number;       // k — scales how fast price reacts
  targetRatio: number;        // Rt — watch ratio threshold (0.5 = 50%)
}

export const DEFAULT_PRICING: PricingConfig = {
  basePriceCents: 10,
  maxShiftPct: 0.25,
  demandWeight: 0.5,
  targetRatio: 0.5,
};

// ── Payment Provider ──
export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amountCents: number;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  charge(installId: string, amountCents: number, memo: string): Promise<PaymentResult>;
  refund(transactionId: string): Promise<PaymentResult>;
}
