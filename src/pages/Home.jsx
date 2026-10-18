import { useEffect, useMemo, useRef, useState } from 'react';
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
  Bookmark,
  LayoutGrid,
} from 'lucide-react';
import MovieCard from '../components/MovieCard';
import MovieRail from '../components/MovieRail';
import HomeHero from '../components/HomeHero';
import SkeletonCard from '../components/SkeletonCard';
import CropImage from '../components/CropImage';
import StudiosHomeSection from '../components/StudiosHomeSection';
import { fetchHomeHeroContent, fetchPublicMovies, getCachedPublicMovies, getPublicMovieSections, PUBLIC_CATALOG_CACHE_KEY } from '../services/movieCatalog';
import { subscribeToCachedRequest } from '../services/requestCache';
import { useLocalDate } from '../hooks/useLocalDate';
import { BROWSE_CATEGORIES } from '../data/browseCategories';
import { fetchBrowseCategoryImages, subscribeToBrowseCategoryImages } from '../services/browseCategoryImages';
import { fetchLanguageCardImages, subscribeToLanguageCardImages } from '../services/languageCardImages';
import { toLanguageSlug } from '../services/languageCatalog';
import { useWatchlist } from './Admin/WatchlistContext';


const getMovieLanguages = (movie) => {
  const values = Array.isArray(movie?.languages)
    ? movie.languages
    : typeof movie?.language === 'string'
      ? movie.language.split(',')
      : [];

  return values.map((language) => String(language).trim()).filter(Boolean);
};

const getHomeTrending = (sections) => sections.curated.trending.length
  ? sections.curated.trending
  : sections.trending.slice(0, 10);

const Home = ({ onPlayTrailer, onOpenPicker }) => {
  const today = useLocalDate();
  const cachedCatalog = getCachedPublicMovies();
  const cachedSections = cachedCatalog ? getPublicMovieSections(cachedCatalog, today) : null;
  const { watchlist, watchlistLoading } = useWatchlist();

  const [catalogMovies, setCatalogMovies] = useState(() => cachedCatalog || []);
  const [heroMovies, setHeroMovies] = useState(() => cachedSections?.trending.slice(0, 5) || []);
  const [trending, setTrending] = useState(() => cachedSections ? getHomeTrending(cachedSections) : []);
  const [nowPlaying, setNowPlaying] = useState(() => cachedSections?.newReleases || []);
  const [topRated, setTopRated] = useState(() => cachedSections?.curated.topRatedMasterpieces.slice(0, 10) || []);
  const [hiddenGems, setHiddenGems] = useState(() => cachedSections?.hiddenGems || []);
  const [upcoming, setUpcoming] = useState(() => cachedSections?.upcoming.slice(0, 10) || []);
  const [languages, setLanguages] = useState(() => [...new Set((cachedCatalog || []).flatMap(getMovieLanguages))].sort((first, second) => first.localeCompare(second)));
  const [loading, setLoading] = useState(() => cachedCatalog === undefined);
  const [browseCategoryImages, setBrowseCategoryImages] = useState({});
  const [languageCardImages, setLanguageCardImages] = useState({});
  const browseRailRef = useRef(null);
  const languageRailRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const refreshCategoryImages = () => {
      fetchBrowseCategoryImages()
        .then((images) => { if (isMounted) setBrowseCategoryImages(images); })
        .catch((error) => console.warn('Browse category images could not be refreshed:', error));
    };
    const unsubscribe = subscribeToBrowseCategoryImages(refreshCategoryImages);
    refreshCategoryImages();
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const refreshLanguageImages = () => {
      fetchLanguageCardImages()
        .then((images) => { if (isMounted) setLanguageCardImages(images); })
        .catch((error) => console.warn('Language card images could not be refreshed:', error));
    };
    const unsubscribe = subscribeToLanguageCardImages(refreshLanguageImages);
    refreshLanguageImages();
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    let isMounted = true;

    const applyCatalog = (catalog) => {
      if (!isMounted) return;
      setCatalogMovies(catalog);
      const sections = getPublicMovieSections(catalog, today);
      setTrending(getHomeTrending(sections));
      setNowPlaying(sections.newReleases);
      setTopRated(sections.curated.topRatedMasterpieces.slice(0, 10));
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
  }, [today]);

  const myListMovies = useMemo(() => {
    if (watchlistLoading || loading || !watchlist.length || !catalogMovies.length) return [];
    const movieCatalogById = new Map(
      catalogMovies
        .filter((movie) => movie.record_type !== 'tv_show' && movie.content_type !== 'tv_show')
        .map((movie) => [String(movie.id), movie])
    );
    return watchlist
      .filter((saved) => saved?.record_type !== 'tv_show' && saved?.content_type !== 'tv_show')
      .map((saved) => movieCatalogById.get(String(saved?.id)))
      .filter(Boolean);
  }, [catalogMovies, loading, watchlist, watchlistLoading]);

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
                <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} rank={idx + 1} trendingRank showTrendingBadge={false} showTitle={false} showWatchlist={false} variant="home" onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {myListMovies.length > 0 && (
          <section className="home-section home-my-list-section">
            <div className="section-header home-section-header">
              <div className="section-title-group home-section-title-group">
                <div className="section-icon-box crimson"><Bookmark size={20} color="#FF2E4D" /></div>
                <div className="home-section-title-wrap">
                  <h2 className="home-section-title">MY LIST MOVIES</h2>
                  <span className="home-section-subtitle">Saved for your next movie night.</span>
                </div>
              </div>
              <Link to="/watchlist" className="section-see-all">
                <span>View My List</span>
                <ChevronRight size={18} />
              </Link>
            </div>
            <MovieRail hideScrollbar loop>
              {myListMovies.map((movie) => (
                <MovieCard
                  key={`${movie.record_type || 'movie'}-${movie.id}`}
                  movie={movie}
                  variant="home"
                  showTitle
                  showWatchlist
                  onPlayTrailer={onPlayTrailer}
                />
              ))}
            </MovieRail>
          </section>
        )}

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
            <Link to="/new-releases" className="section-see-all">
              <span>Explore Releases</span>
              <ChevronRight size={18} />
            </Link>
          </div>

          <MovieRail hideScrollbar>
            {loading ? (
              <SkeletonCard count={6} />
            ) : (
              nowPlaying.map((movie) => (
                <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} newReleaseBadge variant="home" showWatchlist={false} onPlayTrailer={onPlayTrailer} />
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

          <MovieRail hideScrollbar>
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
        <section className="home-section" id="home-hidden-gems">
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

          <MovieRail hideScrollbar>
            {loading ? (
              <SkeletonCard count={6} />
            ) : (
              hiddenGems.map((movie) => (
                <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} rank={null} variant="home" showWatchlist={false} onPlayTrailer={onPlayTrailer} />
              ))
            )}
          </MovieRail>
        </section>

        {/* 6. BROWSE CATEGORIES */}
        <section className="home-section browse-section">
          <div className="section-header home-section-header">
            <div className="section-title-group home-section-title-group">
              <div className="section-icon-box purple"><LayoutGrid size={20} color="#8B5CF6" /></div>
              <div className="home-section-title-wrap">
                <h2 className="home-section-title">BROWSE</h2>
                <span className="home-section-subtitle">Find your next favorite genre.</span>
              </div>
            </div>
            <span className="section-subtitle">Explore by category</span>
          </div>
          <div className="browse-rail">
            <button className="browse-arrow browse-arrow-left" onClick={() => browseRailRef.current?.scrollBy({ left: -280, behavior: 'smooth' })} aria-label="Previous genres"><ChevronRight size={28} /></button>
            <div ref={browseRailRef} className="browse-tile-track">
              {BROWSE_CATEGORIES.map((category) => (
                <Link key={category.id} to={`/genre/${category.id}`} className="browse-tile">
                  {/* Browse tile background image for this genre. */}
                  <CropImage className="browse-tile-bg" src={browseCategoryImages[category.id]?.image_url || category.bg} alt="" />
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

          <MovieRail hideScrollbar>
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
          <div className="section-header home-section-header">
            <div className="section-title-group home-section-title-group">
              <div className="section-icon-box cyan"><Globe size={20} color="#06B6D4" /></div>
              <div className="home-section-title-wrap">
                <h2 className="home-section-title">LANGUAGES</h2>
                <span className="home-section-subtitle">Stories in the languages you love.</span>
              </div>
            </div>
          </div>
          <div className="language-rail">
            <button className="browse-arrow browse-arrow-left" onClick={() => languageRailRef.current?.scrollBy({ left: -280, behavior: 'smooth' })} aria-label="Previous languages"><ChevronRight size={28} /></button>
            <div className="streaming-services-row language-services-row" ref={languageRailRef}>
              {languages.map((language) => (
                <Link
                  key={language}
                  to={`/movies?language=${encodeURIComponent(language)}`}
                  className="streaming-service-tile language-service-tile"
                >
                  {languageCardImages[toLanguageSlug(language)]?.image_url && (
                    <CropImage className="language-service-tile-image" src={languageCardImages[toLanguageSlug(language)].image_url} alt="" />
                  )}
                  <span>{language}</span>
                </Link>
              ))}
            </div>
            <button className="browse-arrow browse-arrow-right" onClick={() => languageRailRef.current?.scrollBy({ left: 280, behavior: 'smooth' })} aria-label="Next languages"><ChevronRight size={28} /></button>
          </div>
        </section>

        <StudiosHomeSection />
      </div>
    </div>
  );
};

export default Home;
