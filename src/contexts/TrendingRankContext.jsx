import { createContext, useContext, useMemo } from 'react';
import { Flame } from 'lucide-react';
import { usePublicCatalog } from '../hooks/usePublicCatalog';
import { getPublicMovieSections } from '../services/movieCatalog';

const TrendingRankContext = createContext(new Map());

const getRecordType = (movie) => {
  const type = movie?.record_type || movie?.content_type || movie?.media_type || 'movie';
  return type === 'tv' ? 'tv_show' : type;
};

const getRankKey = (item) => `${getRecordType(item)}:${String(item?.id)}`;

export const TrendingRankProvider = ({ children }) => {
  const { movies } = usePublicCatalog();
  const ranksById = useMemo(() => {
    const ranks = new Map();
    getPublicMovieSections(movies).trending.forEach((movie, index) => {
      if (!['movie', 'tv_show'].includes(getRecordType(movie)) || movie.id == null) return;
      ranks.set(getRankKey(movie), index + 1);
    });
    return ranks;
  }, [movies]);

  return (
    <TrendingRankContext.Provider value={ranksById}>
      {children}
    </TrendingRankContext.Provider>
  );
};

export const useTrendingMovieRank = (movie) => {
  const ranksById = useContext(TrendingRankContext);
  if (!movie || !['movie', 'tv_show'].includes(getRecordType(movie)) || movie.id == null) return null;
  const rank = ranksById.get(getRankKey(movie));
  return Number.isInteger(rank) && rank <= 20 ? rank : null;
};

export const TrendingRankBadge = ({ movie, className = '' }) => {
  const rank = useTrendingMovieRank(movie);
  if (!rank || rank > 10) return null;

  const tier = 'top-10';
  const rankLabel = 'Top 10';
  const contentLabel = getRecordType(movie) === 'tv_show' ? 'TV show' : 'movie';

  return (
    <span className={`trending-tier-badge ${tier}${className ? ` ${className}` : ''}`} aria-label={`${rankLabel} trending ${contentLabel}`}>
      <Flame size={12} aria-hidden="true" />
      <span>TOP <strong>{rankLabel.slice(4)}</strong></span>
    </span>
  );
};
