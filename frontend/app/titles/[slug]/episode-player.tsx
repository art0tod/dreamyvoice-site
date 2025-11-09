'use client';

import { useMemo, useState } from 'react';
import type { Episode } from '@/lib/types';

type Props = {
  episodes: Episode[];
};

export function EpisodePlayer({ episodes }: Props) {
  const playableEpisodes = useMemo(
    () => episodes.filter((episode) => Boolean(episode.playerSrc)),
    [episodes],
  );
  const [currentEpisodeId, setCurrentEpisodeId] = useState(
    playableEpisodes[0]?.id,
  );

  const currentEpisode =
    playableEpisodes.find((episode) => episode.id === currentEpisodeId) ??
    playableEpisodes[0];

  return (
    <section>
      <h2>Плеер</h2>
      {currentEpisode ? (
        <div>
          <p>
            Серия {currentEpisode.number}: {currentEpisode.name}
          </p>
          <iframe
            title={currentEpisode.name}
            src={currentEpisode.playerSrc}
            width="100%"
            height="360"
            allowFullScreen
          />
        </div>
      ) : (
        <p>Нет опубликованных серий с плеером.</p>
      )}

      <ul>
        {episodes.map((episode) => (
          <li key={episode.id}>
            <button
              type="button"
              onClick={() => setCurrentEpisodeId(episode.id)}
              disabled={!episode.playerSrc}
            >
              {episode.number}. {episode.name}{' '}
              {episode.published ? '' : '(черновик)'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
