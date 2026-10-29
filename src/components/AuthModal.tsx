import { useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { uploadAvatar, MAX_AVATAR_BYTES } from "../lib/uploadAvatar";
import { cn } from "../utils/cn";
import { setUser } from "../lib/store";
import { Icon } from "./ui";

function firebaseErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function AuthModal({ mode, onClose }: { mode: "signin" | "signup"; onClose: () => void }) {
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError(`Image must be under ${Math.round(MAX_AVATAR_BYTES / (1024 * 1024))}MB.`);
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password || (tab === "signup" && !name)) return;

    setLoading(true);
    try {
      if (tab === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        let photoURL: string | null = null;
        if (avatarFile) {
          try {
            photoURL = await uploadAvatar(avatarFile);
          } catch {
            // Avatar upload failing shouldn't block account creation.
            photoURL = null;
          }
        }

        await updateProfile(cred.user, { displayName: name, photoURL: photoURL || undefined });

        setUser({ uid: cred.user.uid, name, email: cred.user.email || email, photoURL });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        setUser({
          uid: cred.user.uid,
          name: cred.user.displayName || cred.user.email?.split("@")[0] || "User",
          email: cred.user.email || email,
          photoURL: cred.user.photoURL,
        });
      }

      setDone(true);
      window.setTimeout(onClose, 900);
    } catch (err: any) {
      setError(firebaseErrorMessage(err?.code || ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-xl border border-white/10 bg-zinc-950 shadow-xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-md text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          <Icon.X className="h-4 w-4" />
        </button>

        <div className="space-y-6 px-7 pb-7 pt-8">
          <div className="space-y-1">
            <p className="text-lg font-semibold tracking-tight text-white">
              {tab === "signin" ? "Welcome back" : "Create your account"}
            </p>
            <p className="text-sm text-zinc-500">
              {tab === "signin"
                ? "Sign in to continue to SamuraiAnime."
                : "Sign up to save your progress and watchlist."}
            </p>
          </div>

          <div className="flex gap-6 border-b border-white/10 text-sm">
            <button
              type="button"
              className={cn(
                "relative -mb-px pb-3 font-medium transition",
                tab === "signin" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => {
                setTab("signin");
                setError(null);
              }}
            >
              Sign In
              {tab === "signin" && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-red-600" />}
            </button>
            <button
              type="button"
              className={cn(
                "relative -mb-px pb-3 font-medium transition",
                tab === "signup" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
              onClick={() => {
                setTab("signup");
                setError(null);
              }}
            >
              Sign Up
              {tab === "signup" && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-red-600" />}
            </button>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-red-600/10 text-red-500">
                <Icon.Check className="h-5 w-5" />
              </span>
              <p className="text-sm text-zinc-400">
                {tab === "signup" ? "Account created — you're signed in." : "Signed in successfully."}
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              {tab === "signup" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-white/15 bg-white/[0.03] text-zinc-500 transition hover:border-red-500/40"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                    ) : (
                      <Icon.User className="h-5 w-5" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-zinc-300 hover:text-white"
                    >
                      {avatarPreview ? "Change photo" : "Upload photo"}
                    </button>
                    <p className="text-[11px] text-zinc-600">Optional · PNG/JPG up to 5MB</p>
                    {avatarError && <p className="mt-0.5 text-[11px] text-red-400">{avatarError}</p>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
                </div>
              )}

              {tab === "signup" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500">Display name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Kenshin"
                    className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-red-500/50 focus:bg-white/[0.05]"
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-red-500/50 focus:bg-white/[0.05]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-red-500/50 focus:bg-white/[0.05]"
                />
              </div>

              {error && (
                <p className="rounded-md border border-red-900/30 bg-red-950/20 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {loading ? <Icon.Loader className="h-4 w-4 animate-spin" /> : null}
                {tab === "signin" ? "Sign In" : "Create Account"}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-zinc-600">
                By continuing you agree to our terms. Your info is only used to personalize your experience.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}