// src/lib/liveProctoringState.ts
// In-memory real-time state for Teacher Live Proctoring Room

export interface HeartbeatRecord {
  lastPing: number;
  currentQuestionIndex?: number;
  isAway?: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var _liveHeartbeats: Map<string, HeartbeatRecord> | undefined;
  // eslint-disable-next-line no-var
  var _pendingWarnings: Map<string, string> | undefined;
}

export const liveHeartbeats: Map<string, HeartbeatRecord> =
  globalThis._liveHeartbeats || (globalThis._liveHeartbeats = new Map());

export const pendingWarnings: Map<string, string> =
  globalThis._pendingWarnings || (globalThis._pendingWarnings = new Map());
