'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ViolationType } from '@/types';

interface UseExamGuardOptions {
  attemptId: string;
  deviceToken: string;
  maxViolations: number;
  requireFullscreen: boolean;
  initialViolationsCount?: number;
  isActive: boolean;
  onAutoSubmit: () => void;
  currentQuestionIndex?: number;
  onTeacherWarning?: (message: string) => void;
}

export function useExamGuard({
  attemptId,
  deviceToken,
  maxViolations,
  requireFullscreen,
  initialViolationsCount = 0,
  isActive,
  onAutoSubmit,
  currentQuestionIndex,
  onTeacherWarning,
}: UseExamGuardOptions) {
  const [violationsCount, setViolationsCount] = useState<number>(initialViolationsCount);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [lastViolationType, setLastViolationType] = useState<ViolationType>('tab_switch');
  const [isFullscreenBlocked, setIsFullscreenBlocked] = useState(false);
  const [isMultiTabBlocked, setIsMultiTabBlocked] = useState(false);

  // References to track timestamps and debounce duplicate events
  const leaveTimestampRef = useRef<number | null>(null);
  const isLeavingRef = useRef<boolean>(false);
  const lastRecordedViolationRef = useRef<number>(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Report violation to server immediately
  const reportViolation = useCallback(
    async (type: ViolationType, durationMs: number = 0, meta: Record<string, unknown> = {}) => {
      if (!isActive || !attemptId || !deviceToken) return;

      const now = Date.now();
      // Debounce violations occurring within 1.5s
      if (now - lastRecordedViolationRef.current < 1500) {
        return;
      }
      lastRecordedViolationRef.current = now;

      try {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const res = await fetch('/api/student/violation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempt_id: attemptId,
            device_token: deviceToken,
            type,
            duration_ms: durationMs,
            meta: { ...meta, userAgent },
          }),
        });

        const data = await res.json();
        if (data.violation_count !== undefined) {
          setViolationsCount(data.violation_count);
        }

        setLastViolationType(type);

        if (data.auto_submitted || (data.violation_count !== undefined && data.violation_count >= maxViolations)) {
          onAutoSubmit();
        } else {
          setIsWarningOpen(true);
        }
      } catch (err) {
        console.error('Failed to log violation:', err);
      }
    },
    [attemptId, deviceToken, isActive, maxViolations, onAutoSubmit]
  );

  // 2. Fullscreen helpers & feature detection
  const isFullscreenSupported = useCallback(() => {
    if (typeof document === 'undefined') return false;
    return !!(
      document.fullscreenEnabled ||
      // @ts-expect-error webkit prefix for Safari
      document.webkitFullscreenEnabled
    );
  }, []);

  const requestFullscreen = useCallback(async () => {
    if (!isFullscreenSupported()) return;
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (
        // @ts-expect-error webkit prefix
        elem.webkitRequestFullscreen
      ) {
        // @ts-expect-error webkit prefix
        await elem.webkitRequestFullscreen();
      }
      setIsFullscreenBlocked(false);
    } catch (err) {
      console.warn('Fullscreen request rejected', err);
    }
  }, [isFullscreenSupported]);

  // Check if current document is in fullscreen
  const isDocumentFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return false;
    return !!(
      document.fullscreenElement ||
      // @ts-expect-error webkit prefix
      document.webkitFullscreenElement
    );
  }, []);

  // 3. Tab switch / Blur / Visibility detection
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!isLeavingRef.current) {
          isLeavingRef.current = true;
          leaveTimestampRef.current = Date.now();
        }
      } else {
        if (isLeavingRef.current) {
          const duration = leaveTimestampRef.current ? Date.now() - leaveTimestampRef.current : 0;
          isLeavingRef.current = false;
          leaveTimestampRef.current = null;
          reportViolation('tab_switch', duration);
        }
      }
    };

    const handleWindowBlur = () => {
      if (!isLeavingRef.current) {
        isLeavingRef.current = true;
        leaveTimestampRef.current = Date.now();
      }
    };

    const handleWindowFocus = () => {
      if (isLeavingRef.current) {
        const duration = leaveTimestampRef.current ? Date.now() - leaveTimestampRef.current : 0;
        isLeavingRef.current = false;
        leaveTimestampRef.current = null;
        reportViolation('window_blur', duration);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isActive, reportViolation]);

  // 4. Fullscreen Exit detection
  useEffect(() => {
    if (!isActive || !requireFullscreen || !isFullscreenSupported()) return;

    const handleFullscreenChange = () => {
      if (!isDocumentFullscreen()) {
        setIsFullscreenBlocked(true);
        reportViolation('fullscreen_exit', 0);
      } else {
        setIsFullscreenBlocked(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isActive, requireFullscreen, isFullscreenSupported, isDocumentFullscreen, reportViolation]);

  // 5. Block Clipboard (Copy, Cut, Contextmenu, Shortcuts)
  useEffect(() => {
    if (!isActive) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportViolation('clipboard_attempt', 0, { action: 'contextmenu' });
      return false;
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('clipboard_attempt', 0, { action: e.type });
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Block Ctrl/Cmd + C, V, X, A, P, S, U
      if (isCtrlOrMeta && ['c', 'v', 'x', 'a', 'p', 's', 'u'].includes(key)) {
        e.preventDefault();
        reportViolation('shortcut_attempt', 0, { shortcut: `${isCtrlOrMeta ? 'Ctrl+' : ''}${key}` });
        return false;
      }

      // Block F12 and Devtools shortcuts Ctrl+Shift+I/J/C
      if (
        e.key === 'F12' ||
        (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
        reportViolation('shortcut_attempt', 0, { shortcut: 'devtools' });
        return false;
      }

      // Block PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        reportViolation('shortcut_attempt', 0, { shortcut: 'PrintScreen' });
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, reportViolation]);

  // 6. Navigation protection (beforeunload & history popstate)
  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    // Trap back button
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setIsWarningOpen(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isActive]);

  // 7. Multi-Tab detection (BroadcastChannel)
  useEffect(() => {
    if (!isActive || !attemptId || typeof BroadcastChannel === 'undefined') return;

    const channelName = `exam_tab_channel_${attemptId}`;
    const channel = new BroadcastChannel(channelName);
    broadcastChannelRef.current = channel;

    // Announce current tab
    channel.postMessage({ type: 'NEW_TAB_OPENED', timestamp: Date.now() });

    channel.onmessage = (event) => {
      if (event.data?.type === 'NEW_TAB_OPENED') {
        setIsMultiTabBlocked(true);
        reportViolation('multi_tab', 0, { msg: 'Boshqa oynada test ochildi' });
      }
    };

    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, [isActive, attemptId, reportViolation]);

  // 8. Server Heartbeat (every 5 seconds for real-time live proctoring)
  useEffect(() => {
    if (!isActive || !attemptId || !deviceToken) return;

    const sendHeartbeat = async () => {
      try {
        const res = await fetch('/api/student/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempt_id: attemptId,
            device_token: deviceToken,
            current_question_index: currentQuestionIndex,
          }),
        });
        const data = await res.json();
        if (data.is_active === false) {
          onAutoSubmit();
        }
        if (data.warning && onTeacherWarning) {
          onTeacherWarning(data.warning);
        }
      } catch (err) {
        console.warn('Heartbeat ping failed:', err);
      }
    };

    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 5000);

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [isActive, attemptId, deviceToken, onAutoSubmit, currentQuestionIndex, onTeacherWarning]);

  const dismissWarning = () => {
    setIsWarningOpen(false);
  };

  return {
    violationsCount,
    isWarningOpen,
    lastViolationType,
    isFullscreenBlocked,
    isMultiTabBlocked,
    dismissWarning,
    requestFullscreen,
    reportViolation,
  };
}
