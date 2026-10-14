import { Link } from "react-router-dom";
import Logo from "./Logo";
import { Icon } from "./ui";

const REPO_URL = "https://github.com/samurai-dev-pokemon/Samurai-anime";
const ISSUES_URL = `${REPO_URL}/issues`;

const linkClass = "transition hover:text-white";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/60">
      <div className="mx-auto max-w-[1700px] px-4 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm space-y-4">
            <Logo />
            <p className="text-sm leading-relaxed text-zinc-500">
              A fan-made streaming platform for browsing and watching anime with a clean, ad-free
              player. Metadata from MyAnimeList / AniList.
            </p>
            <div className="flex items-start gap-2 text-zinc-600">
              <Icon.Shield className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs leading-relaxed">
                All titles are filtered to keep browsing safe-for-work. Found a bug?{" "}
                <a
                  href={ISSUES_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-500 underline decoration-white/20 underline-offset-2 transition hover:text-white"
                >
                  Report it on GitHub Issues
                </a>
                .
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3">
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Explore</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><Link to="/" className={linkClass}>Home</Link></li>
                <li><Link to="/search" className={linkClass}>Search</Link></li>
                <li><Link to="/my-list" className={linkClass}>My List</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Genres</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><Link to="/genre/Action" className={linkClass}>Action</Link></li>
                <li><Link to="/genre/Romance" className={linkClass}>Romance</Link></li>
                <li><Link to="/genre/Fantasy" className={linkClass}>Fantasy</Link></li>
                <li><Link to="/genre/Comedy" className={linkClass}>Comedy</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Community</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li>
                  <a href={REPO_URL} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 ${linkClass}`}>
                    <Icon.Github className="h-4 w-4" /> GitHub
                  </a>
                </li>
                <li>
                  <a href={ISSUES_URL} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 ${linkClass}`}>
                    <Icon.Info className="h-4 w-4" /> Report a Bug
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/5 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Samurai Anime — made with ❤️ by Samurai.Dev</p>
          <p>A passion project. Not affiliated with any streaming service.</p>
        </div>
      </div>
    </footer>
  );
}
