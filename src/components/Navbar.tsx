import React, { useState, useEffect } from 'react';
import type { ViewType } from '../types/anime';

interface NavbarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onSearch: (query: string) => void;
}

export default function Navbar({ currentView, onNavigate, onSearch }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchOpen(false);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-black/95 backdrop-blur-xl shadow-2xl shadow-black/50'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 group shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:shadow-red-500/50 transition-shadow">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Ani<span className="text-red-500">Stream</span>
          </span>
        </button>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          <NavLink active={currentView === 'home'} onClick={() => onNavigate('home')}>
            Home
          </NavLink>
          <NavLink active={currentView === 'library'} onClick={() => onNavigate('library')}>
            Library
          </NavLink>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {searchOpen ? (
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search anime..."
                className="w-56 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white placeholder-white/50 outline-none focus:border-red-500/70 focus:bg-white/15 transition-all"
                onBlur={() => {
                  if (!searchQuery) setSearchOpen(false);
                }}
              />
              <button
                type="submit"
                className="ml-2 text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="ml-1 text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active
          ? 'text-white bg-white/10'
          : 'text-white/70 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}
