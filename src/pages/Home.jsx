import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Flame,
  Star,
  Gem,
  Dices,
  Calendar,
  Film,
  Globe,
} from 'lucide-react';
import MovieCard from '../components/MovieCard';
import MovieRail from '../components/MovieRail';
import HomeHero from '../components/HomeHero';
import SkeletonCard from '../components/SkeletonCard';
import { fetchHomeHeroContent, fetchPublicMovies, getCachedPublicMovies, getPublicMovieSections, PUBLIC_CATALOG_CACHE_KEY } from '../services/movieCatalog';
import { subscribeToCachedRequest } from '../services/requestCache';

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

const Home = ({ onPlayTrailer, onOpenPicker }) => {
  const cachedCatalog = getCachedPublicMovies();
  const cachedSections = cachedCatalog ? getPublicMovieSections(cachedCatalog) : null;

  const [heroMovies, setHeroMovies] = useState(() => cachedSections?.trending.slice(0, 5) || []);
  const [trending, setTrending] = useState(() => cachedSections?.trending.slice(0, 10) || []);
  const [nowPlaying, setNowPlaying] = useState(() => cachedSections?.released.slice(0, 10) || []);
  const [topRated, setTopRated] = useState(() => cachedSections?.topRated.slice(0, 10) || []);
  const [hiddenGems, setHiddenGems] = useState(() => cachedSections?.hiddenGems || []);
  const [upcoming, setUpcoming] = useState(() => cachedSections?.upcoming.slice(0, 10) || []);
  const [languages, setLanguages] = useState(() => [...new Set((cachedCatalog || []).flatMap(getMovieLanguages))].sort((first, second) => first.localeCompare(second)));
  const [loading, setLoading] = useState(() => cachedCatalog === undefined);
  const browseRailRef = useRef(null);
  useEffect(() => {
    let isMounted = true;

    const applyCatalog = (catalog) => {
      if (!isMounted) return;
      const sections = getPublicMovieSections(catalog);
      setTrending(sections.trending.slice(0, 10));
      setNowPlaying(sections.released.slice(0, 10));
      setTopRated(sections.topRated.slice(0, 10));
      setHiddenGems(sections.hiddenGems);
      setUpcoming(sections.upcoming.slice(0, 10));
      setLanguages([...new Set(catalog.flatMap(getMovieLanguages))].sort((first, second) => first.localeCompare(second)));
      setHeroMovies((current) => current.length > 0 ? current : sections.trending.slice(0, 5));
    };

    const unsubscribeCatalog = subscribeToCachedRequest(PUBLIC_CATALOG_CACHE_KEY, (catalog) => {
      if (catalog) {
        applyCatalog(catalog);
        return;
      }
      fetchPublicMovies()
        .then(applyCatalog)
        .catch((error) => console.error('Failed to refresh homepage catalog:', error));
    });
    const unsubscribeHero = subscribeToCachedRequest('catalog:home-hero', (heroSelection) => {
      if (!isMounted) return;
      if (!heroSelection) {
        fetchHomeHeroContent()
          .then((nextSelection) => { if (isMounted) setHeroMovies(nextSelection); })
          .catch((error) => console.error('Failed to refresh homepage hero content:', error));
        return;
      }
      setHeroMovies(heroSelection);
    });

    Promise.allSettled([
      fetchPublicMovies(),
      fetchHomeHeroContent(),
    ])
      .then(([catalogResult, heroResult]) => {
        if (!isMounted) return;

        if (catalogResult.status === 'fulfilled') {
          applyCatalog(catalogResult.value);
        } else {
          console.error('Failed to load homepage catalog:', catalogResult.reason);
        }

        const catalog = getCachedPublicMovies() || [];
        const heroSelection = heroResult.status === 'fulfilled' ? heroResult.value : [];
        if (heroResult.status === 'rejected') {
          console.error('Failed to load homepage hero content:', heroResult.reason);
        }
        setHeroMovies(heroSelection.length > 0 ? heroSelection : getPublicMovieSections(catalog).trending.slice(0, 5));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      unsubscribeCatalog();
      unsubscribeHero();
    };
  }, []);

  return (
    <div className="home-page">
      <HomeHero items={heroMovies} loading={loading} onPlayTrailer={onPlayTrailer} />

      {/* Main Container */}
      <div className="main-content-wrapper">
        {/* 2. 🔥 TRENDING NOW SECTION */}
        <section className="home-section home-trending-section">
          <div className="section-header home-trending-header">
            <div className="section-title-group">
              <div className="section-icon-box crimson">
                <Flame size={20} color="#FF2E4D" />
              </div>
              <div className="home-trending-title-wrap">
                <h2 className="home-trending-title">TRENDING</h2>
                <span className="home-trending-subtitle">What everyone is watching.</span>
              </div>
            </div>
            <Link to="/trending" className="section-see-all">
              <span>View All</span>
              <ChevronRight size={18} />
            </Link>
          </div>

          <MovieRail hideScrollbar loop>
            {loading ? (
              <SkeletonCard count={10} />
            ) : (
              trending.map((movie, idx) => (
                <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} rank={idx + 1} trendingRank showTitle={false} showWatchlist={false} variant="home" onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {/* 3. 🆕 NEW RELEASES SECTION */}
        <section className="home-section">
          <div className="section-header home-section-header">
            <div className="section-title-group home-section-title-group">
              <div className="section-icon-box emerald">
                <Film size={20} color="#10B981" />
              </div>
              <div className="home-section-title-wrap">
                <h2 className="home-section-title">NEW RELEASES</h2>
                <span className="home-section-subtitle">Fresh arrivals</span>
              </div>
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
                <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} variant="home" showWatchlist={false} onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {/* 4. ⭐ TOP RATED SECTION */}
        <section className="home-section">
          <div className="section-header home-section-header">
            <div className="section-title-group home-section-title-group">
              <div className="section-icon-box gold">
                <Star size={20} color="#F59E0B" />
              </div>
              <div className="home-section-title-wrap">
                <h2 className="home-section-title">TOP RATED</h2>
                <span className="home-section-subtitle">Critics' favorites</span>
              </div>
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
                <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} variant="home" showWatchlist={false} onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {/* 5. 💎 HIDDEN GEMS SECTION */}
        <section className="home-section">
          <div className="section-header home-section-header">
            <div className="section-title-group home-section-title-group">
              <div className="section-icon-box purple">
                <Gem size={20} color="#8B5CF6" />
              </div>
              <div className="home-section-title-wrap">
                <h2 className="home-section-title">HIDDEN GEMS</h2>
                <span className="home-section-subtitle">Underrated favorites</span>
              </div>
            </div>
            <span className="section-subtitle">Critically acclaimed & underrated</span>
          </div>

          <MovieRail>
            {loading ? (
              <SkeletonCard count={6} />
            ) : (
              hiddenGems.map((movie) => (
                <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} variant="home" showWatchlist={false} onPlayTrailer={onPlayTrailer} />
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
          <div className="section-header home-section-header">
            <div className="section-title-group home-section-title-group">
              <div className="section-icon-box cyan">
                <Calendar size={20} color="#06B6D4" />
              </div>
              <div className="home-section-title-wrap">
                <h2 className="home-section-title">COMING SOON</h2>
                <span className="home-section-subtitle">On the horizon</span>
              </div>
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
                <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} variant="home" showWatchlist={false} onPlayTrailer={onPlayTrailer} />
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
