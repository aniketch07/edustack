'use client';

import { useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { getSocket } from '@/lib/socket';

const POLL_INTERVAL_MS = 30000; // fallback check for new announcements every 30s
const ANNOUNCEMENT_TOAST_MS = 8000; // announcements stay a bit longer than a normal toast

interface Announcement {
  id: string;
  title: string;
  content?: string;
  course?: { id: string; title: string } | null;
}

/** Render a right-side toast for an announcement (with distinction between Institute Broadcast vs Course Notice). */
function toastAnnouncement(toast: ReturnType<typeof useToast>, a: Announcement) {
  if (a.course?.title) {
    toast.info(`📚 Course Notice (${a.course.title}): ${a.title}`, ANNOUNCEMENT_TOAST_MS);
  } else {
    toast.info(`🏛️ Official Broadcast (Institute Admin): ${a.title}`, ANNOUNCEMENT_TOAST_MS);
  }
}

/**
 * Raises a toast for every new announcement.
 *
 * Primary path: the realtime socket `announcement:created` event (instant, no
 * polling delay). Fallback path: polling /announcements every 30s, which also
 * seeds the "seen" set on first load so pre-existing announcements aren't
 * re-toasted. Both paths share `seenIds`, so a single announcement can never be
 * toasted twice even if the socket and poll race.
 */
export function useAnnouncementToasts(
  onNewAnnouncement?: (a: Announcement) => void,
  onDeletedAnnouncement?: (id: string) => void,
) {
  const toast = useToast();
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstPoll = useRef(true);

  useEffect(() => {
    const socket = getSocket();

    const onAnnouncement = (payload: any) => {
      const a = payload?.announcement;
      if (!a?.id || seenIds.current.has(a.id)) return;
      seenIds.current.add(a.id);
      toastAnnouncement(toast, a);
      if (onNewAnnouncement) onNewAnnouncement(a);
    };

    const onDeleted = (payload: any) => {
      const id = payload?.id;
      if (id) {
        seenIds.current.delete(id);
        if (onDeletedAnnouncement) onDeletedAnnouncement(id);
      }
    };

    socket?.on('announcement:created', onAnnouncement);
    socket?.on('announcement:deleted', onDeleted);

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
            toastAnnouncement(toast, a);
            if (onNewAnnouncement) onNewAnnouncement(a);
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
      socket?.off('announcement:created', onAnnouncement);
      socket?.off('announcement:deleted', onDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNewAnnouncement, onDeletedAnnouncement]);

  return null;
}
