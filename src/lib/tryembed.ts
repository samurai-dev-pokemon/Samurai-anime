type TryEmbedSkin = "silicon" | "classic" | "jw" | "transparent" | "cinema";

export interface TryEmbedOptions {
  autoplay?: boolean;
  autoSkip?: boolean;
  autoNext?: boolean;
  startAt?: number;
  skin?: TryEmbedSkin;
  hideLangSelector?: boolean;
}

export function tryEmbedUrl(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  opts: TryEmbedOptions = {},
): string {
  const base = `https://tryembed.us.cc/embed/anime/${anilistId}/${episode}/${audio}`;
  const qs = new URLSearchParams();

  if (opts.autoplay) qs.set("autoplay", "true");
  if (opts.autoSkip) qs.set("autoSkip", "true");
  if (opts.autoNext === false) qs.set("autoNext", "false");
  if (opts.hideLangSelector) qs.set("lang-type", "false");
  if (opts.startAt && opts.startAt > 0) qs.set("startAt", String(Math.floor(opts.startAt)));
  if (opts.skin) qs.set("skin", opts.skin);

  const q = qs.toString();
  return q ? `${base}?${q}` : base;
}