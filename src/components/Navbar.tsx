import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../utils/cn";
import { href } from "../utils/router";
import { useUser, signOutUser } from "../lib/store";
import { Icon } from "./ui";
import Logo from "./Logo";
import AuthModal from "./AuthModal";

const NAV_LINKS = [
  { label: "Home", to: "/" },
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
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useUser();
  const navigate = useNavigate();
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const desktopSearchWrapRef = useRef<HTMLFormElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    // Focusing a display:none input is a safe no-op in every browser, so
    // it's fine to just try both — only the one actually visible for the
    // current breakpoint will really receive focus.
    desktopSearchRef.current?.focus();
    mobileSearchRef.current?.focus();
  }, [searchOpen]);

  // Outside-click close for the desktop inline search only — the mobile
  // full-row version is closed explicitly via its back button instead.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (searchOpen && desktopSearchWrapRef.current && !desktopSearchWrapRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (menuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen, menuOpen]);

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

  return (
    <>
      <header className={cn("fixed inset-x-0 top-0 z-50 transition-colors duration-300", scrolled || mobileOpen ? "bg-zinc-950/95 shadow-lg shadow-black/40 backdrop-blur" : "bg-gradient-to-b from-black/80 via-black/40 to-transparent")}>
        <div className="mx-auto flex h-16 w-full max-w-[1700px] items-center gap-2 px-4 sm:gap-4 sm:px-8 lg:px-12">
          {/* Mobile-only full-row search takeover — replaces the entire
              header row below the sm: breakpoint so there's nothing else
              in the row competing for space. At sm: and above this is
              hidden entirely in favor of the original inline search. */}
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

          {/* Normal header row — hidden below sm: while mobile search is open. */}
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
              {/* Mobile search trigger — just an icon button, only visible
                  below sm:. Opens the full-row takeover form above. */}
              <button type="button" onClick={() => setSearchOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-300 hover:text-white sm:hidden" aria-label="Search">
                <Icon.Search className="h-[18px] w-[18px]" />
              </button>

              {/* Original inline-expanding search — unchanged, sm: and up only. */}
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

              <button className="hidden h-9 w-9 place-items-center rounded-full text-zinc-300 hover:text-white sm:grid" aria-label="Notifications">
                <Icon.Bell className="h-[18px] w-[18px]" />
              </button>

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