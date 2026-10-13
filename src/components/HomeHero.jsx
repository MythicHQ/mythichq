import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Film, Info, Play, Star, Tv } from 'lucide-react';
import { getBackdropDisplayUrl, getPosterDisplayUrl } from '../services/tmdb';
import { getMovieDetailRoute } from '../services/movieCatalog';
import { getGenreNames, getReleaseYear } from '../utils/helpers';
import MovieTitleArtwork from './MovieTitleArtwork';
import RatingBadge from './RatingBadge';
import toxicBackdrop from '../assets/toxicbd.jpg';
import doomsdayBackdrop from '../assets/doctor-doom.jpg';
import spiderManBackdrop from '../assets/spiderman-brandnewday.jpeg';
import CropImage from './CropImage';

const HERO_BACKDROPS = {
  'Toxic: A Fairy Tale for Grown-ups': toxicBackdrop,
  'Avengers: Doomsday': doomsdayBackdrop,
  'Spider-Man: Brand New Day': spiderManBackdrop,
};

const HomeHero = ({ items = [], loading = false, onPlayTrailer }) => {
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setHeroIndex(0);
  }, [items]);

  useEffect(() => {
    if (items.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setHeroIndex((previous) => (previous + 1) % items.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [items]);

  if (loading) return <div className="hero-skeleton shimmer" />;
  const currentHero = items[heroIndex];
  if (!currentHero) return null;

  const backdrop = getBackdropDisplayUrl(
    currentHero.backdrop_path || currentHero.backdrop_url || currentHero.backdrop,
  ) || HERO_BACKDROPS[currentHero.title] || '';
  const poster = getPosterDisplayUrl(
    currentHero.poster_path || currentHero.poster_url || currentHero.poster,
  );
  const background = backdrop || poster;
  const genres = getGenreNames(
    currentHero.genre_ids || currentHero.genres || currentHero.genre || [],
  );
  const isTv = currentHero.record_type === 'tv_show';
  const rating = Number(currentHero.vote_average ?? currentHero.rating ?? 0);
  const description = currentHero.description || currentHero.overview || '';

  return (
    <section className="hero-section" aria-label={`Featured ${isTv ? 'TV shows' : 'movies'}`}>
      <div className="hero-backdrop">
        <picture>
          {poster && <source media="(max-width: 720px)" srcSet={poster} />}
          {background && <CropImage src={background} alt={`${currentHero.title} artwork`} className="hero-backdrop-image" />}
        </picture>
        <div className="hero-gradient-overlay" />
      </div>

      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            <MovieTitleArtwork
              title={currentHero.title}
              imageUrl={currentHero.title_image_display_url || currentHero.title_image_url}
            />
          </h1>

          <div className="hero-meta">
            <span>{isTv ? 'TV Series' : 'Film'}</span>
            <span className="meta-separator">•</span>
            <span>{genres[0] || 'Featured'}</span>
            <span className="meta-separator">•</span>
            <span>{getReleaseYear(currentHero.release_date || currentHero.premiere_date)}</span>
            {rating > 0 && (
              <>
                <span className="meta-separator">•</span>
                <RatingBadge rating={rating} size="small" />
              </>
            )}
          </div>

          {description && <p className="hero-description">{description}</p>}

          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary hero-btn"
              onClick={() => onPlayTrailer?.(currentHero)}
            >
              <Play size={20} fill="#FFFFFF" />
              <span>Play</span>
            </button>
            <button
              type="button"
              className="btn-outline hero-btn"
              onClick={() => navigate(getMovieDetailRoute(currentHero))}
            >
              <Info size={20} />
              <span>More Info</span>
            </button>
          </div>
        </div>
      </div>

      <div className="hero-callouts" aria-label="Featured details">
        <span>
          {isTv ? <Tv size={14} /> : <Film size={14} />}
          {' '}{currentHero.title} {isTv ? 'series' : 'movie'} spotlight
        </span>
        {rating > 0 && <span><Star size={14} fill="currentColor" /> {rating.toFixed(1)} rating</span>}
      </div>

      {items.length > 1 && (
        <div className="hero-slider-controls">
          <button
            type="button"
            className="slider-arrow"
            onClick={() => setHeroIndex((previous) => (previous === 0 ? items.length - 1 : previous - 1))}
            aria-label={`Previous featured ${isTv ? 'TV show' : 'movie'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="slider-dots">
            {items.map((item, index) => (
              <button
                type="button"
                key={`${item.record_type || (isTv ? 'tv' : 'movie')}-${item.id}`}
                className={`dot ${index === heroIndex ? 'active' : ''}`}
                onClick={() => setHeroIndex(index)}
                aria-label={`Show ${item.title}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="slider-arrow"
            onClick={() => setHeroIndex((previous) => (previous + 1) % items.length)}
            aria-label={`Next featured ${isTv ? 'TV show' : 'movie'}`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </section>
  );
};

export default HomeHero;
