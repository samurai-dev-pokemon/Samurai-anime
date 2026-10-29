import { useRef, useState } from "react";
import { signOut, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { uploadAvatar, MAX_AVATAR_BYTES } from "../lib/uploadAvatar";
import {
  setAutoplayNext,
  setPreferredAudio,
  setUser,
  useAutoplayNext,
  usePreferredAudio,
  useUser,
} from "../lib/store";
import { cn } from "../utils/cn";
import { Container, Icon, Switch } from "../components/ui";

export default function Profile() {
  const user = useUser();
  const [name, setName] = useState(user?.name || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preferredAudio = usePreferredAudio();
  const autoplayNext = useAutoplayNext();

  if (!user) {
    return (
      <Container className="pt-32 pb-20">
        <p className="text-sm text-zinc-400">You need to be signed in to view this page.</p>
      </Container>
    );
  }

  const memberSince = auth.currentUser?.metadata.creationTime
    ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setSaved(false);

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

  async function save() {
    if (!auth.currentUser) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      let photoURL = user!.photoURL || null;
      if (avatarFile) {
        photoURL = await uploadAvatar(avatarFile);
      }

      await updateProfile(auth.currentUser, {
        displayName: name.trim() || user!.name,
        photoURL: photoURL || undefined,
      });

      setUser({ ...user!, name: name.trim() || user!.name, photoURL });
      setAvatarFile(null);
      setSaved(true);
    } catch {
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  const hasChanges = !!avatarFile || name.trim() !== user.name;

  return (
    <Container className="max-w-xl pt-28 pb-20">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account and viewing preferences.</p>
      </div>

      <div className="space-y-10">
        {/* Account section */}
        <section className="space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Account</h2>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-zinc-500 transition hover:border-red-500/40"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <Icon.User className="h-6 w-6" />
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  Change
                </span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
                {memberSince && <p className="mt-0.5 text-[11px] text-zinc-600">Member since {memberSince}</p>}
              </div>
            </div>
            {avatarError && <p className="mt-2 text-[11px] text-red-400">{avatarError}</p>}

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Display name</label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-red-500/50 focus:bg-white/[0.05]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Email</label>
                <input
                  value={user.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-500 outline-none"
                />
              </div>

              {error && (
                <p className="rounded-md border border-red-900/30 bg-red-950/20 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={save}
                  disabled={saving || !hasChanges}
                  className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Icon.Loader className="h-4 w-4 animate-spin" /> : null}
                  Save changes
                </button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                    <Icon.Check className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Preferences section */}
        <section className="space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Playback preferences</h2>

          <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-medium text-white">Default audio</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  New episodes will open in this language unless changed on the watch page.
                </p>
              </div>
              <div className="flex shrink-0 rounded-md border border-white/10 bg-white/[0.03] p-0.5 text-xs font-semibold">
                {(["sub", "dub"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setPreferredAudio(a)}
                    className={cn(
                      "rounded-[5px] px-3 py-1.5 uppercase transition",
                      preferredAudio === a ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-medium text-white">Autoplay next episode</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Automatically continue to the next episode when one finishes.
                </p>
              </div>
              <Switch checked={autoplayNext} onChange={setAutoplayNext} label="Autoplay next episode" />
            </div>
          </div>
        </section>

        {/* Session */}
        <section className="space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Session</h2>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div>
              <p className="text-sm font-medium text-white">Sign out</p>
              <p className="mt-0.5 text-xs text-zinc-500">You'll need to sign back in to access your watchlist.</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-red-500/40 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </section>
      </div>
    </Container>
  );
}