import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Play,
  ChevronRight,
  ChevronLeft,
  Flame,
  Star,
  Gem,
  Dices,
  Calendar,
  Info,
  Film,
  Globe,
} from 'lucide-react';
import { getBackdropUrl } from '../services/tmdb';
import { getReleaseYear, getGenreNames } from '../utils/helpers';
import MovieCard from '../components/MovieCard';
import MovieRail from '../components/MovieRail';
import SkeletonCard from '../components/SkeletonCard';
import RatingBadge from '../components/RatingBadge';
import { fetchHeroMovies, fetchPublicMovies, getMovieDetailRoute, getPublicMovieSections } from '../services/movieCatalog';
import toxicBackdrop from '../assets/toxicbd.jpg';
import doomsdayBackdrop from '../assets/doctor-doom.jpg';
import spiderManBackdrop from '../assets/spiderman-brandnewday.jpeg';

const GENRE_CARDS_DATA = [
  // Browse category artwork uses remote TMDB backdrop images.
  { id: 28, name: 'Action', icon: '💥', bg: 'https://image.tmdb.org/t/p/w780/628Dep6AxEtDxjHGz9vKjL6L37a.jpg' },
  { id: 12, name: 'Adventure', icon: '🤠', bg: 'https://image.tmdb.org/t/p/w780/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg' },
  { id: 35, name: 'Comedy', icon: '😂', bg: 'https://image.tmdb.org/t/p/w780/39L1Uky92209M92aN8E04X74937.jpg' },
  { id: 80, name: 'Crime', icon: '🕵️‍♂️', bg: 'https://image.tmdb.org/t/p/w780/rSPw7tgCH9c6NqICZefy12pY1XG.jpg' },
  { id: 18, name: 'Drama', icon: '🎭', bg: 'https://image.tmdb.org/t/p/w780/hZkgoQY85WERR9yUefJAwIyAFLE.jpg' },
  { id: 14, name: 'Fantasy', icon: '🧙‍♂️', bg: 'https://image.tmdb.org/t/p/w780/7AB2c99jO7v6J1e3bL783k3.jpg' },
  { id: 27, name: 'Horror', icon: '👻', bg: 'https://image.tmdb.org/t/p/w780/5gPp62TbdW1jM248W1j2aF75653.jpg' },
  { id: 9648, name: 'Mystery', icon: '🔍', bg: 'https://image.tmdb.org/t/p/w780/9l1E73g6Z02aJjG0937a091L34.jpg' },
  { id: 10749, name: 'Romance', icon: '💖', bg: 'https://image.tmdb.org/t/p/w780/97Z9d1W97321a97.jpg' },
  { id: 878, name: 'Science Fiction', icon: '🚀', bg: 'https://image.tmdb.org/t/p/w780/8tABVawMDeuE1xJ6z321g9.jpg' },
  { id: 53, name: 'Thriller', icon: '🔪', bg: 'https://image.tmdb.org/t/p/w780/2u7zbn8YUdG6pdV9P22687.jpg' },
  { id: 16, name: 'Animation', icon: '🎨', bg: 'https://image.tmdb.org/t/p/w780/14GEidL347zL296614798.jpg' },
  { id: 99, name: 'Documentary', icon: '📹', bg: 'https://image.tmdb.org/t/p/w780/87823y6741y768.jpg' },
  { id: 10752, name: 'War', icon: '🪖', bg: 'https://image.tmdb.org/t/p/w780/3R1o0918731y6.jpg' },
  { id: 36, name: 'Biography', icon: '📚', bg: 'https://image.tmdb.org/t/p/w780/z978y21873.jpg' },
  { id: 10770, name: 'Sports', icon: '⚽', bg: 'https://image.tmdb.org/t/p/w780/9871239812.jpg' },
];

const getMovieLanguages = (movie) => {
  const values = Array.isArray(movie?.languages)
    ? movie.languages
    : typeof movie?.language === 'string'
      ? movie.language.split(',')
      : [];

  return values.map((language) => String(language).trim()).filter(Boolean);
};

const HERO_BACKDROPS = {
  // Home Hero backdrop: Toxic.
  'Toxic: A Fairy Tale for Grown-ups': toxicBackdrop,
  // Home Hero backdrop: Avengers: Doomsday.
  'Avengers: Doomsday': doomsdayBackdrop,
  // Home Hero backdrop: Spider-Man: Brand New Day.
  'Spider-Man: Brand New Day': spiderManBackdrop,
};

const Home = ({ onPlayTrailer, onOpenPicker }) => {
  const navigate = useNavigate();

  const [heroMovies, setHeroMovies] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [trending, setTrending] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const browseRailRef = useRef(null);
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetchPublicMovies(),
      fetchHeroMovies(),
    ])
      .then(([catalog, heroSelection]) => {
        if (!isMounted) return;

        const sections = getPublicMovieSections(catalog);

        setHeroMovies(heroSelection.length > 0 ? heroSelection : []);
        setTrending(sections.trending.slice(0, 6));
        setNowPlaying(sections.released.slice(0, 10));
        setTopRated(sections.topRated.slice(0, 10));
        setHiddenGems(sections.hiddenGems);
        setUpcoming(sections.upcoming.slice(0, 10));
        setLanguages([...new Set(catalog.flatMap(getMovieLanguages))].sort((first, second) => first.localeCompare(second)));
      })
      .catch(() => {
        if (!isMounted) return;
        setHeroMovies([]);
        setTrending([]);
        setNowPlaying([]);
        setTopRated([]);
        setHiddenGems([]);
        setUpcoming([]);
        setLanguages([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (heroMovies.length < 2) return undefined;
    const timer = setInterval(() => setHeroIndex((previous) => (previous + 1) % heroMovies.length), 7000);
    return () => clearInterval(timer);
  }, [heroMovies]);

  const currentHero = heroMovies[heroIndex] || null;
  const heroBackdrop = currentHero?.backdrop_url
    || currentHero?.backdrop_path
    || HERO_BACKDROPS[currentHero?.title]
    || (currentHero?.backdrop_path?.startsWith?.('/') || currentHero?.backdrop_path?.startsWith?.('http')
      ? currentHero.backdrop_path
      : currentHero ? getBackdropUrl(currentHero.backdrop_path, 'original') : '');
  const heroGenres = currentHero ? getGenreNames(currentHero.genre_ids || []) : [];

  return (
    <div className="home-page">
      {/* 1. HERO BANNER SECTION */}
      {loading ? (
        <div className="hero-skeleton shimmer" />
      ) : currentHero ? (
        <section className="hero-section">
          {/* Background Backdrop Visual */}
          {/* Use the named landscape backdrop for each featured movie. */}
          <div
            className="hero-backdrop"
          >
            <img src={heroBackdrop} alt={`${currentHero.title} backdrop`} className="hero-backdrop-image" />
            <div className="hero-gradient-overlay" />
          </div>

          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title">{currentHero.title}</h1>

              <div className="hero-meta">
                <span>Film</span>
                <span className="meta-separator">•</span>
                <span>{heroGenres[0] || 'Featured'}</span>
                <span className="meta-separator">•</span>
                <span>{getReleaseYear(currentHero.release_date)}</span>
                <span className="meta-separator">•</span>
                <RatingBadge rating={currentHero.vote_average} size="small" />
              </div>

              <div className="hero-actions">
                <button
                  className="btn-primary hero-btn"
                  onClick={() => onPlayTrailer && onPlayTrailer(currentHero)}
                >
                  <Play size={20} fill="#FFFFFF" />
                  <span>Play</span>
                </button>

                <button
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
            <span><Film size={14} /> {currentHero.title} soundtrack</span>
            <span><Star size={14} fill="currentColor" /> {currentHero.vote_average.toFixed(1)} rating</span>
          </div>

          {heroMovies.length > 1 && (
            <div className="hero-slider-controls">
              <button className="slider-arrow" onClick={() => setHeroIndex((previous) => (previous === 0 ? heroMovies.length - 1 : previous - 1))} aria-label="Previous featured movie">
                <ChevronLeft size={20} />
              </button>
              <div className="slider-dots">
                {heroMovies.map((movie, index) => (
                  <button key={movie.id} className={`dot ${index === heroIndex ? 'active' : ''}`} onClick={() => setHeroIndex(index)} aria-label={`Show ${movie.title}`} />
                ))}
              </div>
              <button className="slider-arrow" onClick={() => setHeroIndex((previous) => (previous + 1) % heroMovies.length)} aria-label="Next featured movie">
                <ChevronRight size={20} />
              </button>
            </div>
          )}

        </section>
      ) : null}

      {/* Main Container */}
      <div className="main-content-wrapper">
        {/* 2. 🔥 TRENDING NOW SECTION */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon-box crimson">
                <Flame size={20} color="#FF2E4D" />
              </div>
              <h2>🔥 Trending Now</h2>
            </div>
            <Link to="/trending" className="section-see-all">
              <span>View All</span>
              <ChevronRight size={18} />
            </Link>
          </div>

          <MovieRail>
            {loading ? (
              <SkeletonCard count={6} />
            ) : (
              trending.map((movie, idx) => (
                <MovieCard key={movie.id} movie={movie} rank={idx + 1} showTitle={false} onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {/* 3. 🆕 NEW RELEASES SECTION */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon-box emerald">
                <Film size={20} color="#10B981" />
              </div>
              <h2>🆕 New Releases</h2>
            </div>
            <Link to="/movies?sort=release_date.desc" className="section-see-all">
              <span>Explore Releases</span>
              <ChevronRight size={18} />
            </Link>
          </div>

          <MovieRail>
            {loading ? (
              <SkeletonCard count={6} />
            ) : (
              nowPlaying.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {/* 4. ⭐ TOP RATED SECTION */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon-box gold">
                <Star size={20} color="#F59E0B" />
              </div>
              <h2>⭐ Top Rated Masterpieces</h2>
            </div>
            <Link to="/top-rated" className="section-see-all">
              <span>See Top 100</span>
              <ChevronRight size={18} />
            </Link>
          </div>

          <MovieRail>
            {loading ? (
              <SkeletonCard count={6} />
            ) : (
              topRated.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {/* 5. 💎 HIDDEN GEMS SECTION */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon-box purple">
                <Gem size={20} color="#8B5CF6" />
              </div>
              <h2>💎 Hidden Gems</h2>
            </div>
            <span className="section-subtitle">Critically acclaimed & underrated</span>
          </div>

          <MovieRail>
            {loading ? (
              <SkeletonCard count={6} />
            ) : (
              hiddenGems.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {/* 6. BROWSE CATEGORIES */}
        <section className="home-section browse-section">
          <div className="section-header">
            <h2>Browse</h2>
          </div>
          <div className="browse-rail">
            <button className="browse-arrow browse-arrow-left" onClick={() => browseRailRef.current?.scrollBy({ left: -280, behavior: 'smooth' })} aria-label="Previous genres"><ChevronRight size={28} /></button>
            <div ref={browseRailRef} className="browse-tile-track">
              {GENRE_CARDS_DATA.map((category) => (
                <Link key={category.id} to={`/genre/${category.id}`} className="browse-tile">
                  {/* Browse tile background image for this genre. */}
                  <div className="browse-tile-bg" style={{ backgroundImage: `url(${category.bg})` }} />
                  <span className="browse-tile-icon">{category.icon}</span>
                  <strong>{category.name}</strong>
                </Link>
              ))}
            </div>
            <button className="browse-arrow browse-arrow-right" onClick={() => browseRailRef.current?.scrollBy({ left: 280, behavior: 'smooth' })} aria-label="Next genres"><ChevronRight size={28} /></button>
          </div>
        </section>

        {/* 7. 🎲 PICK A MOVIE (DON'T KNOW WHAT TO WATCH?) BANNER */}
        <section className="home-section picker-cta-banner">
          <div className="picker-banner-content">
            <div className="picker-banner-icon">
              <Dices size={44} color="#FF2E4D" />
            </div>
            <div className="picker-banner-text">
              <h2>Don't Know What to Watch?</h2>
              <p>Try our intelligent movie decision engine. Pick your favorite genre and rating tier to get an instant recommendation!</p>
            </div>
            <button className="btn-picker-cta" onClick={onOpenPicker}>
              <Dices size={22} />
              <span>🎲 Pick a Movie</span>
            </button>
          </div>
        </section>

        {/* 8. 🆕 COMING SOON SECTION */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon-box cyan">
                <Calendar size={20} color="#06B6D4" />
              </div>
              <h2>🆕 Coming Soon</h2>
            </div>
            <Link to="/upcoming" className="section-see-all">
              <span>Release Calendar</span>
              <ChevronRight size={18} />
            </Link>
          </div>

          <MovieRail>
            {loading ? (
              <SkeletonCard count={6} />
            ) : (
              upcoming.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {/* 9. LANGUAGES */}
        <section className="home-section streaming-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon-box cyan">
                <Globe size={20} color="#06B6D4" />
              </div>
              <h2>Languages</h2>
            </div>
            <Link to="/movies" className="section-see-all">
              <span>View all</span>
              <ChevronRight size={18} />
            </Link>
          </div>
          <div className="streaming-services-row language-services-row">
            {languages.map((language) => (
              <Link key={language} to={`/movies?language=${encodeURIComponent(language)}`} className="streaming-service-tile language-service-tile">
                <Globe size={22} />
                <span>{language}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
