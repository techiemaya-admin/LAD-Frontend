/**
 * Call Logs Feature - useCallLogsStream Hook
 *
 * React hook for subscribing to real-time call logs SSE stream.
 * Framework-independent (no Next.js imports).
 *
 * @example
 * ```typescript
 * // Update single call log in a list
 * const { isConnected } = useCallLogsStream({
 *   onMessage: (callLog) => {
 *     setCallLogs(prev =>
 *       prev.map(log =>
 *         log.call_log_id === callLog.call_log_id
 *           ? { ...log, ...callLog }
 *           : log
 *       )
 *     );
 *   },
 * });
 *
 * // Or update a specific call log detail
 * const { isConnected } = useCallLogsStream({
 *   enabled: !!targetCallLogId,
 *   onMessage: (callLog) => {
 *     if (callLog.call_log_id === targetCallLogId) {
 *       setCurrentCallLog(prev => ({ ...prev, ...callLog }));
 *     }
 *   },
 * });
 * ```
 */
import { useEffect, useRef, useState } from "react";
import type { CallLogsStreamOptions, CallLogsStreamHandle, CallLogResponse } from "../types";
import * as api from "../api";

interface UseCallLogsStreamOptions {
  /** Whether the stream should be active */
  enabled?: boolean;
  /** Callback fired when a call log update is received */
  onMessage: (callLog: CallLogResponse) => void;
  /** Callback fired when an error occurs */
  onError?: (error: Event) => void;
  /** Callback fired when the connection opens */
  onOpen?: () => void;
  /** Callback fired when the connection closes */
  onClose?: () => void;
}

interface UseCallLogsStreamResult {
  /** Whether the SSE connection is currently open */
  isConnected: boolean;
  /** Close the stream connection manually */
  close: () => void;
}

/**
 * Hook to subscribe to real-time call logs status updates via SSE
 */
export function useCallLogsStream(options: UseCallLogsStreamOptions): UseCallLogsStreamResult {
  const { enabled = true, onMessage, onError, onOpen, onClose } = options;
  const [isConnected, setIsConnected] = useState(false);
  const streamHandleRef = useRef<CallLogsStreamHandle | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Close existing connection if disabled
      if (streamHandleRef.current) {
        streamHandleRef.current.close();
        streamHandleRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Start the SSE stream
    const handle = api.subscribeToCallLogsStream({
      onMessage,
      onError: (error) => {
        setIsConnected(false);
        onError?.(error);
      },
      onOpen: () => {
        setIsConnected(true);
        onOpen?.();
      },
      onClose: () => {
        setIsConnected(false);
        onClose?.();
      },
    });

    streamHandleRef.current = handle;

    // Cleanup on unmount or when enabled changes
    return () => {
      handle.close();
      streamHandleRef.current = null;
    };
  }, [enabled, onMessage, onError, onOpen, onClose]);

  const close = () => {
    streamHandleRef.current?.close();
    streamHandleRef.current = null;
    setIsConnected(false);
  };

  return { isConnected, close };
}
