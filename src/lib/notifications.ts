import { useEffect, useState } from "react";
import { formatStatus, getAiredEpisodeCount, getAnimeByMalId, getEpisodeCount } from "./api";
import type { Anime } from "./types";

const SUBS_KEY = "sa_release_subs";
const NOTIFS_KEY = "sa_notifications";
const LAST_CHECK_KEY = "sa_last_release_check";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MAX_NOTIFICATIONS = 50;

export interface ReleaseSubscription {
  animeId: number;
  title: string;
  cover: string;
  lastKnownStatus: string | null;
  lastKnownEpisodes: number | null;
  createdAt: number;
}

export interface NotificationEntry {
  id: string;
  animeId: number;
  title: string;
  cover: string;
  message: string;
  createdAt: number;
  read: boolean;
}

function emitChange() {
  window.dispatchEvent(new Event("sa:notifications-changed"));
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore — private browsing / quota exceeded
  }
}

function readSubs(): ReleaseSubscription[] {
  return safeRead<ReleaseSubscription[]>(SUBS_KEY, []);
}
function writeSubs(subs: ReleaseSubscription[]) {
  safeWrite(SUBS_KEY, subs);
}

function readNotifs(): NotificationEntry[] {
  return safeRead<NotificationEntry[]>(NOTIFS_KEY, []);
}
function writeNotifs(notifs: NotificationEntry[]) {
  safeWrite(NOTIFS_KEY, notifs.slice(0, MAX_NOTIFICATIONS));
}

export function isReleaseSubscribed(animeId: number): boolean {
  return readSubs().some((s) => s.animeId === animeId);
}

export function toggleReleaseSubscription(anime: Anime): boolean {
  const subs = readSubs();
  const idx = subs.findIndex((s) => s.animeId === anime.malId);

  if (idx >= 0) {
    subs.splice(idx, 1);
    writeSubs(subs);
    emitChange();
    return false;
  }

  subs.push({
    animeId: anime.malId,
    title: anime.title,
    cover: anime.poster || anime.cover || "",
    lastKnownStatus: formatStatus(anime.status),
    lastKnownEpisodes: anime.episodes ?? null,
    createdAt: Date.now(),
  });
  writeSubs(subs);
  emitChange();
  return true;
}

export function getNotifications(): NotificationEntry[] {
  return readNotifs().sort((a, b) => b.createdAt - a.createdAt);
}

export function getUnreadCount(): number {
  return readNotifs().filter((n) => !n.read).length;
}

export function markAllNotificationsRead() {
  const notifs = readNotifs().map((n) => ({ ...n, read: true }));
  writeNotifs(notifs);
  emitChange();
}

export function clearAllNotifications() {
  writeNotifs([]);
  emitChange();
}

function pushNotification(entry: Omit<NotificationEntry, "id" | "read" | "createdAt">) {
  const notifs = readNotifs();
  notifs.unshift({ ...entry, id: `${entry.animeId}-${Date.now()}`, read: false, createdAt: Date.now() });
  writeNotifs(notifs);

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(entry.title, { body: entry.message, icon: entry.cover || undefined });
    } catch {
      // ignore
    }
  }

  emitChange();
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (typeof Notification === "undefined") return null;
  try {
    return await Notification.requestPermission();
  } catch {
    return null;
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/**
 * Re-checks each subscribed anime for a release or new episode. For
 * airing shows this now uses getAiredEpisodeCount() (the real count of
 * episodes that exist in the episode list) instead of getEpisodeCount()
 * — previously this used the show's known planned total, which never
 * changes once set, so "new episode" notifications could never actually
 * fire for airing shows. This was likely the main reason notifications
 * felt broken.
 */
export async function checkForNewEpisodes(force = false): Promise<void> {
  const subs = readSubs();
  if (subs.length === 0) return;

  const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
  if (!force && Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

  let changed = false;

  for (const sub of subs) {
    const fresh = await getAnimeByMalId(sub.animeId);
    if (!fresh) continue;

    const newStatus = formatStatus(fresh.status);
    const newEpisodeCount =
      newStatus === "Airing" ? await getAiredEpisodeCount(sub.animeId) : await getEpisodeCount(sub.animeId, fresh.episodes);

    if (sub.lastKnownStatus === "Upcoming" && newStatus !== "Upcoming") {
      pushNotification({
        animeId: sub.animeId,
        title: sub.title,
        cover: sub.cover,
        message: `${sub.title} has been released! Watch it now.`,
      });
      changed = true;
    } else if (
      sub.lastKnownEpisodes != null &&
      newEpisodeCount != null &&
      newEpisodeCount > sub.lastKnownEpisodes
    ) {
      pushNotification({
        animeId: sub.animeId,
        title: sub.title,
        cover: sub.cover,
        message: `${sub.title} Episode ${newEpisodeCount} is out now!`,
      });
      changed = true;
    }

    sub.lastKnownStatus = newStatus;
    sub.lastKnownEpisodes = newEpisodeCount ?? sub.lastKnownEpisodes;
  }

  writeSubs(subs);
  if (changed) emitChange();
}

function useExternalStore<T>(read: () => T): T {
  const [state, setState] = useState(read);
  useEffect(() => {
    const update = () => setState(read());
    window.addEventListener("sa:notifications-changed", update);
    window.addEventListener("storage", update);
    update();
    return () => {
      window.removeEventListener("sa:notifications-changed", update);
      window.removeEventListener("storage", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

export function useReleaseSubscribed(animeId: number): boolean {
  return useExternalStore(() => isReleaseSubscribed(animeId));
}

export function useNotifications(): NotificationEntry[] {
  return useExternalStore(() => getNotifications());
}

export function useUnreadNotificationCount(): number {
  return useExternalStore(() => getUnreadCount());
}