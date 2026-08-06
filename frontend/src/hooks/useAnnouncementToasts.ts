'use client';

import { useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const POLL_INTERVAL_MS = 30000; // check for new announcements every 30s
const ANNOUNCEMENT_TOAST_MS = 8000; // announcements stay a bit longer than a normal toast

interface Announcement {
  id: string;
  title: string;
  content?: string;
  course?: { id: string; title: string } | null;
}

/**
 * Polls /announcements while the dashboard is open and raises a toast for every
 * new announcement (right-side, auto-dismisses, removable via the × button).
 * The first poll only seeds the "seen" set so pre-existing announcements aren't
 * re-toasted on page load — the banner already shows those.
 */
export function useAnnouncementToasts() {
  const toast = useToast();
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstPoll = useRef(true);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const data = await apiFetch<Announcement[]>('/announcements');
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        const firstPoll = isFirstPoll.current;

        for (const a of list) {
          if (!a?.id || seenIds.current.has(a.id)) continue;
          seenIds.current.add(a.id);
          // Skip toasting pre-existing announcements on the initial load
          if (!firstPoll) {
            const courseLabel = a.course?.title ? ` (${a.course.title})` : '';
            toast.info(`📢 ${a.title}${courseLabel}`, ANNOUNCEMENT_TOAST_MS);
          }
        }
        isFirstPoll.current = false;
      } catch {
        // transient failure — keep polling
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // toast.info is a stable useCallback — safe to capture once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
