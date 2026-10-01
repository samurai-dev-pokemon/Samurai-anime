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
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Close the search overlay / user menu when tapping/clicking outside them.
  // This matters a lot more on touch devices where there's no "hover away"
  // to dismiss things — without this, panels get stuck open on mobile.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (searchOpen && searchWrapRef.current && !searchWrapRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (menuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen, menuOpen]);

  function openSearch() {
    setMobileOpen(false);
    setSearchOpen(true);
  }

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
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
          scrolled || mobileOpen || searchOpen ? "bg-zinc-950/95 shadow-lg shadow-black/40 backdrop-blur" : "bg-gradient-to-b from-black/80 via-black/40 to-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1700px] items-center gap-2 px-4 sm:gap-4 sm:px-8 lg:px-12">
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-zinc-300 lg:hidden"
            onClick={toggleMobileMenu}
            aria-label="Menu"
          >
            <Icon.Menu className="h-5 w-5" />
          </button>

          {/* min-w-0 lets the logo truncate instead of forcing the whole
              header to overflow if the logo text is long on a narrow screen. */}
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

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
            <div ref={searchWrapRef} className="relative">
              <button
                type="button"
                onClick={() => (searchOpen ? setSearchOpen(false) : openSearch())}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/5 hover:text-white"
                aria-label="Search"
              >
                {searchOpen ? <Icon.X className="h-4.5 w-4.5" /> : <Icon.Search className="h-4.5 w-4.5" />}
              </button>
            </div>

            <button className="hidden h-10 w-10 place-items-center rounded-full text-zinc-300 hover:text-white sm:grid" aria-label="Notifications">
              <Icon.Bell className="h-[18px] w-[18px]" />
            </button>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2 text-sm text-zinc-200 transition hover:bg-white/10">
                  <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-red-600 text-xs font-bold uppercase text-white">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name.slice(0, 1)
                    )}
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
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <button onClick={() => setAuthMode("signin")} className="hidden rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-200 transition hover:text-white sm:block">
                  Sign In
                </button>
                <button onClick={() => setAuthMode("signup")} className="whitespace-nowrap rounded-full bg-red-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow shadow-red-900/40 transition hover:bg-red-500 sm:px-4">
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav drawer */}
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

        {/* Search overlay — a full-width dropdown instead of squeezing
            into the header row. This is what actually fixes the mobile
            overflow bug: it no longer competes for space with the logo,
            hamburger, and auth buttons. Works identically on all screen
            sizes, which also simplifies the desktop behavior. */}
        {searchOpen && (
          <div className="border-t border-white/10 bg-zinc-950/98 px-4 py-3 backdrop-blur sm:px-8 lg:px-12">
            <form onSubmit={submitSearch} className="mx-auto flex max-w-[1700px] items-center gap-3">
              <Icon.Search className="h-5 w-5 shrink-0 text-zinc-500" />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search anime..."
                className="min-w-0 flex-1 bg-transparent py-1 text-base text-white placeholder-zinc-500 outline-none"
              />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label="Clear" className="shrink-0 text-zinc-500 hover:text-white">
                  <Icon.X className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>
        )}
      </header>

      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />}
    </>
  );
}