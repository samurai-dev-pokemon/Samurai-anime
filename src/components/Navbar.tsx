import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../utils/cn";
import { href } from "../utils/router";
import { useUser, signOutUser } from "../lib/store";
import {
  checkForNewEpisodes,
  getNotificationPermission,
  markAllNotificationsRead,
  requestNotificationPermission,
  useNotifications,
  useUnreadNotificationCount,
} from "../lib/notifications";
import { formatRelativeTime, Icon } from "./ui";
import Logo from "./Logo";
import AuthModal from "./AuthModal";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Currently Airing", to: "/airing" },
  { label: "Trending", to: "/genre/Trending" },
  { label: "Action", to: "/genre/Action" },
  { label: "Romance", to: "/genre/Romance" },
  { label: "Fantasy", to: "/genre/Fantasy" },
  { label: "My List", to: "/my-list" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useUser();
  const navigate = useNavigate();
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const desktopSearchWrapRef = useRef<HTMLFormElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);

  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    desktopSearchRef.current?.focus();
    mobileSearchRef.current?.focus();
  }, [searchOpen]);

  // Check for newly released/new-episode subscriptions on mount, then
  // every 10 minutes while the tab stays open. This is a foreground-only
  // check — see src/lib/notifications.ts for why true background push
  // isn't possible without a backend.
  useEffect(() => {
    checkForNewEpisodes();
    const interval = setInterval(() => checkForNewEpisodes(), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (searchOpen && desktopSearchWrapRef.current && !desktopSearchWrapRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (menuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (notifOpen && notifWrapRef.current && !notifWrapRef.current.contains(target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen, menuOpen, notifOpen]);

  function toggleMobileMenu() {
    setSearchOpen(false);
    setMobileOpen((v) => !v);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(href.search(q.trim()));
    setSearchOpen(false);
    setQ("");
  }

  function openNotifications() {
    setNotifOpen((v) => !v);
    if (!notifOpen) markAllNotificationsRead();
  }

  const permission = getNotificationPermission();

  return (
    <>
      <header className={cn("fixed inset-x-0 top-0 z-50 transition-colors duration-300", scrolled || mobileOpen ? "bg-zinc-950/95 shadow-lg shadow-black/40 backdrop-blur" : "bg-gradient-to-b from-black/80 via-black/40 to-transparent")}>
        <div className="mx-auto flex h-16 w-full max-w-[1700px] items-center gap-2 px-4 sm:gap-4 sm:px-8 lg:px-12">
          {searchOpen && (
            <form onSubmit={submitSearch} className="flex w-full items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setQ("");
                }}
                aria-label="Close search"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-300 hover:text-white"
              >
                <Icon.ChevronLeft className="h-5 w-5" />
              </button>
              <input
                ref={mobileSearchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search anime..."
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none"
              />
              <button type="submit" aria-label="Search" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-300 hover:text-white">
                <Icon.Search className="h-[18px] w-[18px]" />
              </button>
            </form>
          )}

          <div className={cn("flex w-full items-center gap-2 sm:gap-4", searchOpen && "hidden sm:flex")}>
            <button className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-zinc-300 lg:hidden" onClick={toggleMobileMenu} aria-label="Menu">
              <Icon.Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 shrink">
              <Logo />
            </div>

            <nav className="ml-4 hidden items-center gap-6 text-sm font-medium text-zinc-300 lg:flex">
              {NAV_LINKS.map((l) => (
                <Link key={l.label} to={l.to} className="whitespace-nowrap transition hover:text-white">
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button type="button" onClick={() => setSearchOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-300 hover:text-white sm:hidden" aria-label="Search">
                <Icon.Search className="h-[18px] w-[18px]" />
              </button>

              <form
                ref={desktopSearchWrapRef}
                onSubmit={submitSearch}
                className={cn("hidden items-center overflow-hidden rounded-full border border-white/10 bg-black/50 transition-all sm:flex", searchOpen ? "w-64 px-3" : "w-9 justify-center")}
              >
                <button type="button" onClick={() => setSearchOpen((v) => !v)} className="grid h-9 w-9 shrink-0 place-items-center text-zinc-300 hover:text-white" aria-label="Search">
                  <Icon.Search className="h-4 w-4" />
                </button>
                {searchOpen && (
                  <input
                    ref={desktopSearchRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search anime..."
                    className="w-full bg-transparent py-2 text-sm text-white placeholder-zinc-500 outline-none"
                  />
                )}
              </form>

              {/* Notifications bell — now functional. Shows an unread-count
                  badge and a dropdown of recent release/episode alerts. */}
              <div className="relative" ref={notifWrapRef}>
                <button
                  onClick={openNotifications}
                  className="relative grid h-9 w-9 place-items-center rounded-full text-zinc-300 hover:text-white sm:h-9 sm:w-9"
                  aria-label="Notifications"
                >
                  <Icon.Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-11 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      {notifications.length > 0 && (
                        <button onClick={markAllNotificationsRead} className="text-[11px] font-medium text-zinc-500 hover:text-white">
                          Mark all read
                        </button>
                      )}
                    </div>

                    {permission === "default" && (
                      <button
                        onClick={() => requestNotificationPermission()}
                        className="flex w-full items-center gap-2 border-b border-white/10 bg-red-600/10 px-4 py-2.5 text-left text-xs text-red-300 hover:bg-red-600/15"
                      >
                        <Icon.Bell className="h-3.5 w-3.5 shrink-0" />
                        Enable browser alerts for new episodes
                      </button>
                    )}

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-xs text-zinc-500">
                          No notifications yet. Subscribe to a show from its page to get alerted on release or new episodes.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            to={href.anime(n.animeId)}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-0 hover:bg-white/5"
                          >
                            <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-zinc-800">
                              {n.cover && <img src={n.cover} alt={n.title} className="h-full w-full object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs text-zinc-200">{n.message}</p>
                              <p className="mt-0.5 text-[10px] text-zinc-500">{formatRelativeTime(n.createdAt)}</p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2 text-sm text-zinc-200 transition hover:bg-white/10">
                    <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-red-600 text-xs font-bold uppercase text-white">
                      {user.photoURL ? <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" /> : user.name.slice(0, 1)}
                    </span>
                    <span className="hidden max-w-[90px] truncate sm:inline">{user.name}</span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-11 w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 py-1 shadow-xl">
                      <Link to={href.profile()} className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>
                        Profile
                      </Link>
                      <Link to={href.myList()} className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>
                        My List
                      </Link>
                      <button
                        className="block w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
                        onClick={() => {
                          signOutUser();
                          setMenuOpen(false);
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setAuthMode("signin")} className="hidden rounded-full px-4 py-1.5 text-sm font-semibold text-zinc-200 transition hover:text-white sm:block">
                    Sign In
                  </button>
                  <button onClick={() => setAuthMode("signup")} className="whitespace-nowrap rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white shadow shadow-red-900/40 transition hover:bg-red-500">
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {mobileOpen && (
          <nav className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 lg:hidden">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} to={l.to} className="rounded-lg px-3 py-2.5 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>
                {l.label}
              </Link>
            ))}
            {user && (
              <Link to={href.profile()} className="rounded-lg px-3 py-2.5 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>
                Profile
              </Link>
            )}
            {!user && (
              <button onClick={() => setAuthMode("signin")} className="rounded-lg px-3 py-2.5 text-left hover:bg-white/5 hover:text-white">
                Sign In
              </button>
            )}
          </nav>
        )}
      </header>

      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />}
    </>
  );
}