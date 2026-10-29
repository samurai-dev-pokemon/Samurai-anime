import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type {
  AnimeStats,
  AuthUser,
  CommentEntry,
  ProgressEntry,
  ReactionEntry,
  ReactionType,
  ReplyEntry,
  WatchedEntry,
  WatchlistEntry,
} from "./types";

/* Local cache + pub/sub layer so React components can subscribe
   synchronously, while the cache itself is kept live by Firestore
   listeners (for watchlist/progress/reactions/watched/preferences) or
   Firebase Auth (for the user). */

const PROGRESS_KEY = "samurai.progress.v1";
const WATCHLIST_KEY = "samurai.watchlist.v1";
const REACTIONS_KEY = "samurai.reactions.v1";
const WATCHED_KEY = "samurai.watched.v1";
const AUTH_KEY = "samurai.auth.v1";
const PROGRESS_LOADED_KEY = "samurai.progressLoaded.v1"; // in-memory only, never persisted

type Listener = () => void;
const listeners: Record<string, Set<Listener>> = {};

function emit(key: string) {
  listeners[key]?.forEach((l) => l());
}

function subscribe(key: string, cb: Listener) {
  listeners[key] = listeners[key] || new Set();
  listeners[key].add(cb);
  return () => {
    listeners[key].delete(cb);
  };
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
  emit(key);
}

/* ---------------- auth (backed by Firebase Authentication) ---------------- */
export function getUser(): AuthUser | null {
  return read<AuthUser | null>(AUTH_KEY, null);
}

/** Optimistically set the cached user (e.g. right after sign in/up),
 *  ahead of Firebase's own onAuthStateChanged confirmation below. */
export function setUser(user: AuthUser | null) {
  write(AUTH_KEY, user);
}

export function useUser(): AuthUser | null {
  const [state, setState] = useState<AuthUser | null>(() => getUser());
  useEffect(() => subscribe(AUTH_KEY, () => setState(getUser())), []);
  return state;
}

/** Signs out of Firebase and clears cached user + list/progress/reaction/watched data. */
export async function signOutUser() {
  await signOut(auth);
  write<AuthUser | null>(AUTH_KEY, null);
  write<WatchlistEntry[]>(WATCHLIST_KEY, []);
  write<ProgressEntry[]>(PROGRESS_KEY, []);
  write<ReactionEntry[]>(REACTIONS_KEY, []);
  write<WatchedEntry[]>(WATCHED_KEY, []);
  write<UserPreferences>(PREFERENCES_KEY, DEFAULT_PREFERENCES);
}

/* ---------------- Firestore-synced watchlist + progress + reactions + watched + preferences ----------------
   Local cache mirrors five private Firestore locations:
     users/{uid}/watchlist/{animeId}
     users/{uid}/progress/{animeId}
     users/{uid}/reactions/{animeId}
     users/{uid}/watched/{animeId}
     users/{uid}/meta/preferences
   A live listener keeps the cache (and therefore hooks) fresh. All five are
   signed-in-only: no user, no data, and writes are rejected client-side.
   There's also a *public* animeStats/{animeId} doc and animeComments
   collection (see below) that anyone can read regardless of sign-in. */

let unsubWatchlist: (() => void) | null = null;
let unsubProgress: (() => void) | null = null;
let unsubReactions: (() => void) | null = null;
let unsubWatched: (() => void) | null = null;
let unsubPreferences: (() => void) | null = null;

// Tracks whether the initial cloud fetch of progress has completed for the
// current session — lets Watch.tsx wait for real resume data instead of
// racing ahead and assuming "no progress" just because the network hasn't
// answered yet. Signed-out users have nothing to load, so it's immediately
// true for them; signed-in users flip it true once the first snapshot (or
// a safety timeout, in case of a slow/offline connection) arrives.
let progressLoaded = false;
let progressLoadTimeout: number | null = null;

function markProgressLoaded(val: boolean) {
  if (progressLoadTimeout) {
    window.clearTimeout(progressLoadTimeout);
    progressLoadTimeout = null;
  }
  progressLoaded = val;
  emit(PROGRESS_LOADED_KEY);
}

export function isProgressLoaded(): boolean {
  return progressLoaded;
}

export function useProgressLoaded(): boolean {
  const [state, setState] = useState(() => progressLoaded);
  useEffect(() => subscribe(PROGRESS_LOADED_KEY, () => setState(progressLoaded)), []);
  return state;
}

function attachUserListeners(uid: string) {
  unsubWatchlist?.();
  unsubProgress?.();
  unsubReactions?.();
  unsubWatched?.();
  unsubPreferences?.();

  markProgressLoaded(false);
  // Safety net: if Firestore is slow/offline, don't leave the Watch page
  // stuck on a loading skeleton forever — fall back to "no progress found"
  // after a few seconds so playback can still start.
  progressLoadTimeout = window.setTimeout(() => markProgressLoaded(true), 4000);

  unsubWatchlist = onSnapshot(collection(db, "users", uid, "watchlist"), (snap) => {
    write(
      WATCHLIST_KEY,
      snap.docs.map((d) => d.data() as WatchlistEntry),
    );
  });

  unsubProgress = onSnapshot(collection(db, "users", uid, "progress"), (snap) => {
    write(
      PROGRESS_KEY,
      snap.docs.map((d) => d.data() as ProgressEntry),
    );
    markProgressLoaded(true);
  });

  unsubReactions = onSnapshot(collection(db, "users", uid, "reactions"), (snap) => {
    write(
      REACTIONS_KEY,
      snap.docs.map((d) => d.data() as ReactionEntry),
    );
  });

  unsubWatched = onSnapshot(collection(db, "users", uid, "watched"), (snap) => {
    write(
      WATCHED_KEY,
      snap.docs.map((d) => d.data() as WatchedEntry),
    );
  });

  unsubPreferences = onSnapshot(doc(db, "users", uid, "meta", "preferences"), (snap) => {
    const data = snap.data() as Partial<UserPreferences> | undefined;
    write<UserPreferences>(PREFERENCES_KEY, { ...DEFAULT_PREFERENCES, ...data });
  });
}

function detachUserListeners() {
  unsubWatchlist?.();
  unsubProgress?.();
  unsubReactions?.();
  unsubWatched?.();
  unsubPreferences?.();
  unsubWatchlist = null;
  unsubProgress = null;
  unsubReactions = null;
  unsubWatched = null;
  unsubPreferences = null;
  write<WatchlistEntry[]>(WATCHLIST_KEY, []);
  write<ProgressEntry[]>(PROGRESS_KEY, []);
  write<ReactionEntry[]>(REACTIONS_KEY, []);
  write<WatchedEntry[]>(WATCHED_KEY, []);
  write<UserPreferences>(PREFERENCES_KEY, DEFAULT_PREFERENCES);
  // Signed out = nothing to load from the cloud, so resolve immediately
  // rather than leaving any waiting UI stuck.
  markProgressLoaded(true);
}

/* Keep the cached user + list/progress/reaction/watched/preferences data in
   sync with real Firebase session state — runs once on startup and again on
   every future sign-in/out, so refreshing the page doesn't log the user out. */
onAuthStateChanged(auth, (fbUser) => {
  if (fbUser) {
    write<AuthUser | null>(AUTH_KEY, {
      uid: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
      email: fbUser.email || "",
      photoURL: fbUser.photoURL,
    });
    attachUserListeners(fbUser.uid);
  } else {
    write<AuthUser | null>(AUTH_KEY, null);
    detachUserListeners();
  }
});

/* ---------------- watchlist / "My List" ---------------- */
export function getWatchlist(): WatchlistEntry[] {
  return read<WatchlistEntry[]>(WATCHLIST_KEY, []).sort((a, b) => b.addedAt - a.addedAt);
}

export function isInWatchlist(animeId: number): boolean {
  return read<WatchlistEntry[]>(WATCHLIST_KEY, []).some((w) => w.animeId === animeId);
}

export function useWatchlist(): WatchlistEntry[] {
  const [state, setState] = useState<WatchlistEntry[]>(() => getWatchlist());
  useEffect(() => subscribe(WATCHLIST_KEY, () => setState(getWatchlist())), []);
  return state;
}

export type ToggleResult = { requiresAuth: true } | { requiresAuth: false; added: boolean };

/** Adds/removes an anime from the signed-in user's watchlist in Firestore.
 *  Returns `{ requiresAuth: true }` when nobody is signed in — callers
 *  should open the auth modal in that case instead of writing anything. */
export async function toggleWatchlist(entry: Omit<WatchlistEntry, "addedAt">): Promise<ToggleResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { requiresAuth: true };

  const exists = isInWatchlist(entry.animeId);
  const ref = doc(db, "users", uid, "watchlist", String(entry.animeId));
  if (exists) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { ...entry, addedAt: Date.now() });
  }
  return { requiresAuth: false, added: !exists };
}

/** Hard-removes an anime from the watchlist — used when a show is finished. */
export async function removeFromWatchlist(animeId: number) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "watchlist", String(animeId)));
}

/* ---------------- like / dislike reactions ---------------- */
export function getReactions(): ReactionEntry[] {
  return read<ReactionEntry[]>(REACTIONS_KEY, []);
}

export function getReaction(animeId: number): ReactionType | null {
  return read<ReactionEntry[]>(REACTIONS_KEY, []).find((r) => r.animeId === animeId)?.type ?? null;
}

export function useReaction(animeId: number): ReactionType | null {
  const [state, setState] = useState<ReactionType | null>(() => getReaction(animeId));
  useEffect(() => subscribe(REACTIONS_KEY, () => setState(getReaction(animeId))), [animeId]);
  return state;
}

/** Live public like/dislike totals for an anime — visible to everyone,
 *  signed in or not. Backed by `animeStats/{animeId}`. */
export function useAnimeStats(animeId: number): AnimeStats {
  const [stats, setStats] = useState<AnimeStats>({ likes: 0, dislikes: 0 });
  useEffect(() => {
    if (!animeId) return;
    const ref = doc(db, "animeStats", String(animeId));
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data();
      setStats({ likes: data?.likes || 0, dislikes: data?.dislikes || 0 });
    });
    return unsub;
  }, [animeId]);
  return stats;
}

export type ReactionResult = { requiresAuth: true } | { requiresAuth: false; reaction: ReactionType | null };

/** Sets/clears/switches the signed-in user's like/dislike on an anime, and
 *  atomically keeps the public `animeStats/{animeId}` counters in sync —
 *  run inside a transaction so concurrent reactions from different users
 *  never race each other into a wrong count. Clicking the same reaction
 *  twice clears it; clicking the other one switches it. Returns
 *  `{ requiresAuth: true }` when signed out — callers should open the
 *  auth modal instead of writing anything. */
export async function setReaction(animeId: number, type: ReactionType): Promise<ReactionResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { requiresAuth: true };

  const reactionRef = doc(db, "users", uid, "reactions", String(animeId));
  const statsRef = doc(db, "animeStats", String(animeId));

  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(reactionRef);
    const current = snap.exists() ? (snap.data().type as ReactionType) : null;

    let likeDelta = 0;
    let dislikeDelta = 0;
    let nextReaction: ReactionType | null;

    if (current === type) {
      // Same button clicked again — clear the reaction.
      nextReaction = null;
      if (type === "like") likeDelta -= 1;
      else dislikeDelta -= 1;
      tx.delete(reactionRef);
    } else {
      // New reaction, or switching from the opposite one.
      nextReaction = type;
      if (current === "like") likeDelta -= 1;
      if (current === "dislike") dislikeDelta -= 1;
      if (type === "like") likeDelta += 1;
      else dislikeDelta += 1;
      tx.set(reactionRef, { animeId, type, updatedAt: Date.now() });
    }

    tx.set(statsRef, { likes: increment(likeDelta), dislikes: increment(dislikeDelta) }, { merge: true });
    return nextReaction;
  });

  return { requiresAuth: false, reaction: next };
}

/* ---------------- watched episodes ---------------- */
export function getWatchedEpisodes(animeId: number): number[] {
  return read<WatchedEntry[]>(WATCHED_KEY, []).find((w) => w.animeId === animeId)?.episodes || [];
}

export function isEpisodeWatched(animeId: number, episode: number): boolean {
  return getWatchedEpisodes(animeId).includes(episode);
}

export function useWatchedEpisodes(animeId: number): number[] {
  const [state, setState] = useState<number[]>(() => getWatchedEpisodes(animeId));
  useEffect(() => subscribe(WATCHED_KEY, () => setState(getWatchedEpisodes(animeId))), [animeId]);
  return state;
}

/** Marks an episode watched for the signed-in user. No-ops if signed out.
 *  Safe to call repeatedly — `arrayUnion` de-dupes automatically. */
export async function markEpisodeWatched(animeId: number, episode: number) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const ref = doc(db, "users", uid, "watched", String(animeId));
  await setDoc(ref, { animeId, episodes: arrayUnion(episode), updatedAt: Date.now() }, { merge: true });
}

/* ---------------- continue watching progress ---------------- */
export function getProgress(): ProgressEntry[] {
  return read<ProgressEntry[]>(PROGRESS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function useProgress(): ProgressEntry[] {
  const [state, setState] = useState<ProgressEntry[]>(() => getProgress());
  useEffect(() => subscribe(PROGRESS_KEY, () => setState(getProgress())), []);
  return state;
}

/** Saves watch progress for the signed-in user, straight to Firestore.
 *  No-ops if signed out — continue-watching is a signed-in perk, same as
 *  the watchlist. Every device signed into the same account sees updates
 *  live via the onSnapshot listener above. */
export async function saveProgress(entry: ProgressEntry) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(doc(db, "users", uid, "progress", String(entry.animeId)), entry);
}

export async function removeProgress(animeId: number) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "progress", String(animeId)));
}

/* ---------------- comments ---------------- */

/** Anime-level comments live at animeComments/{animeId}/comments.
 *  Episode-level comments live at animeComments/{animeId}/episodes/{ep}/comments.
 *  Passing an `episode` scopes to that episode's own thread (Watch page);
 *  omitting it gives the general series-wide thread (AnimeDetails page). */
function commentsCollection(animeId: number, episode?: number) {
  if (episode) {
    return collection(db, "animeComments", String(animeId), "episodes", String(episode), "comments");
  }
  return collection(db, "animeComments", String(animeId), "comments");
}

function commentDocRef(animeId: number, commentId: string, episode?: number) {
  return doc(commentsCollection(animeId, episode), commentId);
}

/** Each comment can have its own (single-level, non-nested) replies. */
function repliesCollection(animeId: number, commentId: string, episode?: number) {
  return collection(commentDocRef(animeId, commentId, episode), "replies");
}

/** Live comments, newest first — public read, no sign-in required. */
export function useComments(animeId: number, episode?: number): CommentEntry[] {
  const [comments, setComments] = useState<CommentEntry[]>([]);
  useEffect(() => {
    if (!animeId) return;
    const q = query(commentsCollection(animeId, episode), orderBy("createdAt", "desc"), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommentEntry, "id">) })));
    });
    return unsub;
  }, [animeId, episode]);
  return comments;
}

/** Live replies for a single comment, oldest first (chronological). */
export function useReplies(animeId: number, commentId: string, episode?: number): ReplyEntry[] {
  const [replies, setReplies] = useState<ReplyEntry[]>([]);
  useEffect(() => {
    if (!animeId || !commentId) return;
    const q = query(repliesCollection(animeId, commentId, episode), orderBy("createdAt", "asc"), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      setReplies(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReplyEntry, "id">) })));
    });
    return unsub;
  }, [animeId, commentId, episode]);
  return replies;
}

export type CommentResult = { requiresAuth: true } | { requiresAuth: false };

/** Posts a top-level comment as the signed-in user. */
export async function postComment(animeId: number, text: string, episode?: number, spoiler?: boolean): Promise<CommentResult> {
  const user = auth.currentUser;
  if (!user) return { requiresAuth: true };
  const trimmed = text.trim();
  if (!trimmed) return { requiresAuth: false };

  await addDoc(commentsCollection(animeId, episode), {
    animeId,
    ...(episode ? { episode } : {}),
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "User",
    photoURL: user.photoURL || null,
    text: trimmed.slice(0, 1000),
    spoiler: !!spoiler,
    likedBy: [],
    createdAt: Date.now(),
  });
  return { requiresAuth: false };
}

/** Posts a reply to a specific comment as the signed-in user. */
export async function postReply(
  animeId: number,
  commentId: string,
  text: string,
  episode?: number,
  spoiler?: boolean,
): Promise<CommentResult> {
  const user = auth.currentUser;
  if (!user) return { requiresAuth: true };
  const trimmed = text.trim();
  if (!trimmed) return { requiresAuth: false };

  await addDoc(repliesCollection(animeId, commentId, episode), {
    parentId: commentId,
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "User",
    photoURL: user.photoURL || null,
    text: trimmed.slice(0, 1000),
    spoiler: !!spoiler,
    likedBy: [],
    createdAt: Date.now(),
  });
  return { requiresAuth: false };
}

/** Deletes a comment — only the original author is allowed to. */
export async function deleteComment(animeId: number, commentId: string, episode?: number) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await deleteDoc(commentDocRef(animeId, commentId, episode));
}

/** Deletes a reply — only the original author is allowed to. */
export async function deleteReply(animeId: number, commentId: string, replyId: string, episode?: number) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await deleteDoc(doc(repliesCollection(animeId, commentId, episode), replyId));
}

export type LikeResult = { requiresAuth: true } | { requiresAuth: false };

/** Toggles the signed-in user's like on a comment. `currentLikedBy` is the
 *  array already sitting in the live snapshot the UI has in hand — passed
 *  in so this doesn't need an extra read just to know whether to add or
 *  remove the uid. arrayUnion/arrayRemove are atomic, so this is safe even
 *  if two people like something at the same instant. */
export async function toggleCommentLike(
  animeId: number,
  commentId: string,
  currentLikedBy: string[] | undefined,
  episode?: number,
): Promise<LikeResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { requiresAuth: true };
  const liked = (currentLikedBy || []).includes(uid);
  await updateDoc(commentDocRef(animeId, commentId, episode), {
    likedBy: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
  return { requiresAuth: false };
}

/** Same as above, for a reply. */
export async function toggleReplyLike(
  animeId: number,
  commentId: string,
  replyId: string,
  currentLikedBy: string[] | undefined,
  episode?: number,
): Promise<LikeResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { requiresAuth: true };
  const liked = (currentLikedBy || []).includes(uid);
  await updateDoc(doc(repliesCollection(animeId, commentId, episode), replyId), {
    likedBy: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
  return { requiresAuth: false };
}

/* ---------------- dub fallback (local-only, per device) ---------------- */
const DUB_FALLBACK_KEY = "samurai.dubFallback.v1";

export function getDubFallbackEnabled(): boolean {
  return read<boolean>(DUB_FALLBACK_KEY, true);
}

export function setDubFallbackEnabled(enabled: boolean) {
  write(DUB_FALLBACK_KEY, enabled);
}

export function useDubFallbackEnabled(): boolean {
  const [state, setState] = useState<boolean>(() => getDubFallbackEnabled());
  useEffect(() => subscribe(DUB_FALLBACK_KEY, () => setState(getDubFallbackEnabled())), []);
  return state;
}

/* ---------------- account preferences (sub/dub default + autoplay, synced) ----------------
   Unlike dub fallback above (a local safety behavior), these are treated as
   account-level settings and synced via users/{uid}/meta/preferences so they
   follow the signed-in user across devices. Defaults apply immediately for
   signed-out users or before the first snapshot arrives. */
const PREFERENCES_KEY = "samurai.preferences.v1";

interface UserPreferences {
  preferredAudio: "sub" | "dub";
  autoplayNext: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredAudio: "sub",
  autoplayNext: true,
};

function getPreferences(): UserPreferences {
  return read<UserPreferences>(PREFERENCES_KEY, DEFAULT_PREFERENCES);
}

export function usePreferredAudio(): "sub" | "dub" {
  const [state, setState] = useState<"sub" | "dub">(() => getPreferences().preferredAudio);
  useEffect(() => subscribe(PREFERENCES_KEY, () => setState(getPreferences().preferredAudio)), []);
  return state;
}

export function useAutoplayNext(): boolean {
  const [state, setState] = useState<boolean>(() => getPreferences().autoplayNext);
  useEffect(() => subscribe(PREFERENCES_KEY, () => setState(getPreferences().autoplayNext)), []);
  return state;
}

/** Updates the signed-in user's preferred audio. No-ops if signed out. */
export async function setPreferredAudio(value: "sub" | "dub") {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(doc(db, "users", uid, "meta", "preferences"), { preferredAudio: value }, { merge: true });
}

/** Updates the signed-in user's autoplay setting. No-ops if signed out. */
export async function setAutoplayNext(value: boolean) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(doc(db, "users", uid, "meta", "preferences"), { autoplayNext: value }, { merge: true });
}