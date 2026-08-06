'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';

export type RealtimeHandler = (payload: any) => void;

/**
 * Subscribes to socket.io events for the lifetime of the component.
 *
 * Pass a map of `eventName -> handler`. Handlers that need fresh state should
 * read it from refs, or be stable callbacks (like toast.info) — the listeners
 * are attached once on mount, so anything captured is whatever is current then.
 *
 * If no socket is available (no token / connection failed), the subscription is
 * a silent no-op — the REST polling/refresh paths still cover the data.
 */
export function useRealtimeEvents(listeners: Record<string, RealtimeHandler>) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const entries = Object.entries(listeners);
    entries.forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      entries.forEach(([event, handler]) => socket.off(event, handler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
