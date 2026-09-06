"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { markAllNotificationsRead, markNotificationRead } from "./messages/actions";
import type { AgencyNotification } from "@/types/database";

// Distinctive alarm pattern for urgent escalations (§21.3) — three short
// beeps via the Web Audio API rather than a bundled sound file, so it works
// without shipping/licensing an audio asset and never silently fails to load.
function playAlarm() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

    [0, 0.28, 0.56].forEach((delay) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + 0.2);
    });
  } catch {
    // Web Audio unavailable (e.g. autoplay policy) — the backup email in
    // handle.ts is what actually guarantees the urgent alert gets through.
  }
}

export function NotificationBell({ agencyId }: { agencyId: string }) {
  const [notifications, setNotifications] = useState<AgencyNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications((data as AgencyNotification[]) ?? []));

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => null);
    }

    const channel = supabase
      .channel(`notifications-${agencyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `agency_id=eq.${agencyId}` },
        (payload) => {
          const notification = payload.new as AgencyNotification;
          setNotifications((prev) => [notification, ...prev]);

          if (notification.severity === "urgent") {
            playAlarm();
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification(notification.title, { body: notification.body ?? undefined });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agencyId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  markAllNotificationsRead();
                  setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
                }}
                className="text-xs text-neutral-500 hover:underline"
              >
                Tout marquer lu
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
            {!notifications.length && <li className="px-3 py-4 text-sm text-neutral-400">Rien pour l&apos;instant</li>}
            {notifications.map((n) => (
              <li key={n.id} className={`px-3 py-2 ${!n.read_at ? "bg-neutral-50" : ""}`}>
                <Link
                  href={n.related_guest_message_id ? `/messages/${n.related_guest_message_id}` : "#"}
                  onClick={() => {
                    if (!n.read_at) markNotificationRead(n.id);
                    setOpen(false);
                  }}
                  className="block"
                >
                  <p className={`text-sm font-medium ${n.severity === "urgent" ? "text-red-700" : "text-neutral-900"}`}>
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{n.body}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .55-.2 1.08-.56 1.5L4 15h16l-1.44-2.41a2.4 2.4 0 0 1-.56-1.5V8a6 6 0 0 0-6-6ZM9.5 18a2.5 2.5 0 0 0 5 0h-5Z" />
    </svg>
  );
}
