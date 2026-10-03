import { useState } from "react";
import { getCurrentSeason } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { AnimeCard, CardSkeletons, Container, ErrorNote, Icon } from "../components/ui";

export default function Airing() {
  const [tick, setTick] = useState(0);
  const { data, loading, error } = useAsync(() => getCurrentSeason(), [tick]);

  return (
    <div className="min-h-screen pb-20 pt-20">
      <Container className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Currently Airing</h1>
          <p className="text-sm text-zinc-500">New episodes from this season's airing anime.</p>
        </div>

        {/* Disclaimer banner — currently airing shows can have gaps since
            new episodes/streams go live on a delay after they air. */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2.5 text-xs text-amber-200 sm:text-sm">
          <Icon.Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Not all episodes or streams may work yet for currently airing anime — new episodes are added as they become available.</span>
        </div>

        {loading ? (
          <CardSkeletons n={12} />
        ) : error ? (
          <ErrorNote msg={error} retry={() => setTick((t) => t + 1)} />
        ) : data?.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.map((a) => (
              <AnimeCard key={a.malId} anime={a} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Nothing airing right now — check back soon.</p>
        )}
      </Container>
    </div>
  );
}