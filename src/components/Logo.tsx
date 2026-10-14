import { Link } from "react-router-dom";
import { cn } from "../utils/cn";

export default function Logo({
  className,
  shortOnMobile = false,
}: {
  className?: string;
  /** When true, phones show a compact "SA" wordmark instead of the full name. */
  shortOnMobile?: boolean;
}) {
  return (
    <Link to="/" aria-label="Samurai Anime" className={cn("flex shrink-0 items-center gap-2", className)}>
      <img src="/images/logo-mark.png" alt="" className="h-8 w-8 object-contain" />
      <span className="text-lg font-black uppercase leading-none tracking-tight text-white sm:text-xl">
        {shortOnMobile && (
          <span className="sm:hidden">
            S<span className="text-red-600">A</span>
          </span>
        )}
        <span className={cn(shortOnMobile && "hidden sm:inline")}>
          Samurai<span className="text-red-600">Anime</span>
        </span>
      </span>
    </Link>
  );
}
