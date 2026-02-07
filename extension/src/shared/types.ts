// Messages between content script and service worker
export type MessageType =
  | 'GET_INSTALL_ID'
  | 'FETCH_PROXY'
  | 'SET_BADGE';

export interface BaseMessage {
  type: MessageType;
}

export interface GetInstallIdMessage extends BaseMessage {
  type: 'GET_INSTALL_ID';
}

export interface FetchProxyMessage extends BaseMessage {
  type: 'FETCH_PROXY';
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface SetBadgeMessage extends BaseMessage {
  type: 'SET_BADGE';
  text: string;
  color?: string;
}

export type ExtensionMessage = GetInstallIdMessage | FetchProxyMessage | SetBadgeMessage;

export interface FetchProxyResponse {
  ok: boolean;
  status: number;
  data: any;
}

// Price lookup response
export interface PriceResponse {
  videoId: string;
  priceCents: number;
  centsPerSecond: number;
  avgWatchRatio: number;
  overridePrice: number | null;
  durationSeconds: number;
}

// Session response
export interface SessionResponse {
  session_id: string;
  install_id: string;
  video_id: string;
  status: string;
  price_quoted: number;
  price_final: number | null;
  seconds_watched: number;
  started_at: string;
  ended_at: string | null;
}
