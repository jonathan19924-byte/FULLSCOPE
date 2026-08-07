"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Notification } from "@/types/domain";
import { fetchNotificationsAction, markNotificationsReadAction } from "./actions";

const POLL_INTERVAL_MS = 60_000;

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  refresh: () => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({
  initialNotifications,
  initialUnreadCount,
  signedIn,
  children,
}: {
  initialNotifications: Notification[];
  initialUnreadCount: number;
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const isSignedIn = useRef(signedIn);

  const refresh = useCallback(() => {
    fetchNotificationsAction().then(({ notifications, unreadCount }) => {
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    });
  }, []);

  const markAllRead = useCallback(() => {
    if (unreadCount === 0) return;
    setUnreadCount(0);
    setNotifications((current) =>
      current.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
    );
    markNotificationsReadAction();
  }, [unreadCount]);

  // No realtime/push infra exists yet — a light poll is the same tradeoff
  // this app already makes elsewhere (bookmarks/follows load once, refetch
  // on navigation) rather than adding websocket infra for one badge.
  useEffect(() => {
    if (!isSignedIn.current) return;
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const value = useMemo(
    () => ({ notifications, unreadCount, refresh, markAllRead }),
    [notifications, unreadCount, refresh, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return ctx;
}
