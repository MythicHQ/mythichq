import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import MovieRail from './MovieRail';

const readGenres = (item) => {
  const value = item.genres || item.genre || [];
  const entries = Array.isArray(value) ? value : String(value || '').split(',');
  return entries
    .map((genre) => (typeof genre === 'string' ? genre.trim() : genre?.name || ''))
    .filter(Boolean);
};

const CatalogGenreRows = ({ items, contentType, onPlayTrailer, recommendationCard = false }) => {
  const rows = useMemo(() => {
    const counts = new Map();
    items.forEach((item) => readGenres(item).forEach((genre) => counts.set(genre, (counts.get(genre) || 0) + 1)));
    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
      .slice(0, 4)
      .map(([genre]) => ({
        genre,
        items: items.filter((item) => readGenres(item).includes(genre)).slice(0, 12),
      }));
  }, [items]);

  return rows.map(({ genre, items: genreItems }) => (
    <section className="home-section catalog-genre-section" key={genre}>
      <div className="section-header">
        <div className="section-title-group"><h2>{genre} {contentType === 'tv' ? 'Series' : 'Movies'}</h2></div>
        <Link to={`${contentType === 'tv' ? '/tv-shows' : '/movies'}?genre=${encodeURIComponent(genre)}`} className="section-see-all"><span>Explore</span><ChevronRight size={18} /></Link>
      </div>
      <MovieRail>
        {genreItems.map((item) => (
          <MovieCard
            key={`${item.record_type || 'movie'}-${item.id}`}
            movie={item}
            onPlayTrailer={onPlayTrailer}
            recommendationCard={recommendationCard}
            showTitle={!recommendationCard}
          />
        ))}
      </MovieRail>
    </section>
  ));
};

export default CatalogGenreRows;
