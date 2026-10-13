import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Building2, Layers3, Search, SlidersHorizontal, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import MovieRail from '../components/MovieRail';
import CropImage from '../components/CropImage';
import { StudioCard } from '../components/StudioCard';
import {
  fetchStudios,
  getCachedStudios,
  PUBLIC_STUDIOS_CACHE_KEY,
  subscribeToStudios,
} from '../services/studios';
import { getCachedRequest, subscribeToCachedRequest } from '../services/requestCache';
import { fetchPublicStudioContent, getStudioTitlesCacheKey } from '../services/movieCatalog';

const STUDIOS_SEARCH_KEY = 'mythichq:studios:search';
const STUDIO_SORTS_KEY = 'mythichq:studios:sorts';
const EMPTY_TITLES = [];
const STUDIO_HERO_VIDEOS = {
  'dc-universe': { name: 'DC Universe', file: 'dc-background.mp4' },
  'marvel-studios': { name: 'Marvel Studios', file: 'marvel-studios-background.mp4' },
  'paramount-pictures': { name: 'Paramount Pictures', file: 'paramount-pictures-background.mp4' },
  'sony-pictures': { name: 'Sony Pictures', file: 'sony-pictures-background.mp4' },
  'universal-pictures': { name: 'Universal Pictures', file: 'universal-pictures-background.mp4' },
  'warner-bros-pictures': { name: 'Warner Bros. Pictures', file: 'warner-bros-pictures-background.mp4' },
};

const readSessionValue = (key, fallback) => {
  try {
    const value = window.sessionStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    console.warn(`Unable to restore ${key}:`, error);
    return fallback;
  }
};

const readStudioSorts = () => {
  try {
    const value = window.sessionStorage.getItem(STUDIO_SORTS_KEY);
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn('Unable to restore studio sorting:', error);
    return {};
  }
};

const StudioHeroBackgroundVideo = ({ imageUrl, shouldPlay, video, isMuted, onVideoPlaying, onVideoEnded }) => {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!shouldPlay || !videoRef.current) return;

    videoRef.current.play().catch((error) => {
      console.error(`Unable to start the ${video.name} hero background video:`, error);
    });
  }, [shouldPlay, video.name]);

  return (
    <>
      {imageUrl && <CropImage className={`studio-detail-background${videoPlaying ? ' is-fading' : ''}`} src={imageUrl} alt="" />}
      {shouldPlay && (
        <video
          ref={videoRef}
          className={`studio-detail-background studio-detail-background-video${videoPlaying ? ' is-playing' : ''}`}
          autoPlay
          muted={isMuted}
          playsInline
          preload="auto"
          onPlaying={() => {
            setVideoPlaying(true);
            onVideoPlaying();
          }}
          onEnded={() => {
            setVideoPlaying(false);
            onVideoEnded();
          }}
          onError={() => console.error(`Unable to play the ${video.name} hero background video.`)}
          aria-hidden="true"
        >
          <source src={`${import.meta.env.BASE_URL}movie-assets/backdrop-video/${video.file}`} type="video/mp4" />
        </video>
      )}
    </>
  );
};

const useStudios = () => {
  const cachedStudios = getCachedStudios();
  const [studios, setStudios] = useState(() => cachedStudios?.studios || []);
  const [loading, setLoading] = useState(() => cachedStudios === undefined);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => fetchStudios()
      .then(({ studios: next }) => { if (active) { setStudios(next); setError(''); setLoading(false); } })
      .catch((loadError) => {
        console.error('Unable to load studios:', loadError);
        if (active) { setError('Studios could not be loaded right now.'); setLoading(false); }
      });
    const unsubscribeCache = subscribeToCachedRequest(PUBLIC_STUDIOS_CACHE_KEY, (value) => {
      if (!active) return;
      if (value) {
        setStudios(value.studios || []);
        setError('');
        setLoading(false);
      } else {
        void refresh();
      }
    });
    const unsubscribe = subscribeToStudios(refresh);
    void refresh();
    return () => { active = false; unsubscribe(); unsubscribeCache(); };
  }, []);
  return { studios, loading, error };
};

export const StudiosPage = () => {
  const { studios, loading, error } = useStudios();
  const [search, setSearch] = useState(() => readSessionValue(STUDIOS_SEARCH_KEY, ''));
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STUDIOS_SEARCH_KEY, search);
    } catch (storageError) {
      console.warn('Unable to preserve studio search:', storageError);
    }
  }, [search]);
  const visibleStudios = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return studios.filter((studio) => !query
      || studio.name.toLocaleLowerCase().includes(query)
      || studio.description?.toLocaleLowerCase().includes(query));
  }, [search, studios]);
  return (
    <div className="page-container studios-page">
      <header className="studios-page-hero">
        <div className="studios-page-hero-glow" />
        <div className="studios-page-hero-copy">
          <p className="studios-eyebrow"><Sparkles size={14} /> THE MINDS BEHIND THE MOVIES</p>
          <h1>Stories have<br /><em>a home.</em></h1>
          <p className="studios-page-intro">Step inside the studios behind the films and series you love. Find your next favorite, one collection at a time.</p>
          <div className="studios-page-stat"><Building2 size={16} /><strong>{studios.length}</strong><span>studios to explore</span></div>
        </div>
        <div className="studios-hero-art" aria-hidden="true">
          <span className="studios-hero-frame studios-hero-frame-back" />
          <span className="studios-hero-frame studios-hero-frame-middle" />
          <span className="studios-hero-frame studios-hero-frame-front"><span /></span>
          <span className="studios-hero-art-label">ONE UNIVERSE<br />MANY STORIES</span>
        </div>
      </header>
      <section className="studios-directory" aria-label="Studio directory">
        <div className="studios-directory-heading">
          <div><p className="studios-directory-kicker">THE DIRECTORY</p><h2>Explore studios</h2><p>Choose a studio to browse its movie and TV collection.</p></div>
          <label className="studios-search"><Search size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a studio" aria-label="Search studios" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear studio search">×</button>}</label>
        </div>
        {loading ? <div className="studios-grid studios-grid-loading" role="status" aria-label="Loading studios">{Array.from({ length: 6 }, (_, index) => <span className="studio-directory-skeleton" key={index} />)}</div>
          : error ? <div className="studios-empty" role="alert"><h2>Unable to load studios</h2><p>{error}</p></div>
            : visibleStudios.length ? <div className="studios-grid">{visibleStudios.map((studio) => <div className="studio-directory-card" key={studio.id}><StudioCard studio={studio} titleBelow /><span className="studio-directory-hint">Explore collection <ArrowUpRight size={14} /></span></div>)}</div>
              : <div className="studios-empty"><Building2 size={32} /><h2>{studios.length ? 'No studios found' : 'No studios available'}</h2><p>{studios.length ? 'Try another studio name.' : 'Check back soon for studio collections.'}</p></div>}
      </section>
    </div>
  );
};

export const StudioDetailPage = ({ onPlayTrailer }) => {
  const { slug } = useParams();
  const location = useLocation();
  const { studios, loading, error } = useStudios();
  const [sorts, setSorts] = useState(readStudioSorts);
  const [heroVideoReadyRoute, setHeroVideoReadyRoute] = useState(null);
  const [heroVideoPlayingRoute, setHeroVideoPlayingRoute] = useState(null);
  const [heroVideoMuted, setHeroVideoMuted] = useState(true);
  const studio = studios.find((item) => item.slug === slug);
  const studioId = studio?.id;
  const heroVideo = STUDIO_HERO_VIDEOS[slug];
  const sort = sorts[slug] || 'latest';
  const [titleState, setTitleState] = useState(() => {
    const cachedTitles = studioId ? getCachedRequest(getStudioTitlesCacheKey(studioId)) : undefined;
    return { studioId, titles: cachedTitles || EMPTY_TITLES, loading: cachedTitles === undefined, error: '' };
  });

  const updateSort = (nextSort) => setSorts((current) => {
    const next = { ...current, [slug]: nextSort };
    try {
      window.sessionStorage.setItem(STUDIO_SORTS_KEY, JSON.stringify(next));
    } catch (storageError) {
      console.warn('Unable to preserve studio sorting:', storageError);
    }
    return next;
  });

  useEffect(() => {
    if (!heroVideo) return undefined;

    const timeoutId = window.setTimeout(() => setHeroVideoReadyRoute(location.key), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [heroVideo, location.key]);

  const heroVideoReady = Boolean(heroVideo) && heroVideoReadyRoute === location.key;
  const heroVideoPlaying = Boolean(heroVideo) && heroVideoPlayingRoute === location.key;

  useEffect(() => {
    if (!studioId) return undefined;
    let active = true;
    const cacheKey = getStudioTitlesCacheKey(studioId);
    const refresh = () => fetchPublicStudioContent(studioId)
      .then((titles) => { if (active) setTitleState({ studioId, titles, loading: false, error: '' }); })
      .catch((loadError) => {
        console.error('Unable to load titles assigned to studio:', loadError);
        if (active) setTitleState((current) => ({
          studioId,
          titles: current.studioId === studioId ? current.titles : [],
          loading: false,
          error: loadError.message || 'Studio titles could not be loaded.',
        }));
      });
    const unsubscribeCache = subscribeToCachedRequest(cacheKey, (titles) => {
      if (titles) {
        if (active) setTitleState({ studioId, titles, loading: false, error: '' });
      } else {
        void refresh();
      }
    });
    const unsubscribe = subscribeToStudios(refresh);
    void refresh();
    return () => { active = false; unsubscribe(); unsubscribeCache(); };
  }, [studioId]);

  const cachedTitles = studioId ? getCachedRequest(getStudioTitlesCacheKey(studioId)) : undefined;
  const content = titleState.studioId === studioId
    ? titleState.titles
    : cachedTitles || EMPTY_TITLES;
  const assignmentsLoading = Boolean(studioId) && (
    (titleState.studioId === studioId && titleState.loading)
    || (titleState.studioId !== studioId && cachedTitles === undefined)
  );
  const assignmentError = titleState.studioId === studioId ? titleState.error : '';
  const sorted = useMemo(() => [...content].sort((first, second) => {
    if (sort === 'rating') return Number(second.vote_average || second.rating || 0) - Number(first.vote_average || first.rating || 0);
    if (sort === 'title') return String(first.title).localeCompare(String(second.title));
    return new Date(second.release_date || second.first_air_date || 0) - new Date(first.release_date || first.first_air_date || 0);
  }), [content, sort]);

  if (loading) return <div className="page-container studios-loading">Loading studio…</div>;
  if (error) return <div className="page-container studios-empty" role="alert"><h1>Unable to load studio</h1><p>{error}</p><Link to="/studios">Browse studios</Link></div>;
  if (!studio) return <div className="page-container studios-empty"><Building2 size={32} /><h1>Studio not found</h1><Link to="/studios">Browse studios</Link></div>;

  return (
    <div className="page-container studio-detail-page studio-cinematic-page">
      <Link className="studio-back" to="/studios"><ArrowLeft size={16} /> All studios</Link>
      <header className={`studio-detail-hero studio-cinematic-hero studio-text-${studio.text_position || 'left'}`} style={{ '--studio-color': studio.background_color || '#171a24', '--studio-overlay': studio.overlay_opacity ?? 0.48 }}>
        {heroVideo
          ? <StudioHeroBackgroundVideo
            imageUrl={studio.background_url}
            shouldPlay={heroVideoReady}
            video={heroVideo}
            isMuted={heroVideoMuted}
            onVideoPlaying={() => {
              setHeroVideoMuted(true);
              setHeroVideoPlayingRoute(location.key);
            }}
            onVideoEnded={() => setHeroVideoPlayingRoute(null)}
          />
          : studio.background_url && <CropImage className="studio-detail-background" src={studio.background_url} alt="" />}
        <div className={`studio-cinematic-brand studio-logo-right${heroVideoPlaying ? ' is-video-playing' : ''}`}>
          {studio.logo_url && <h1 className="studio-screen-reader">{studio.name}</h1>}
          {studio.logo_url
            ? <CropImage className="studio-cinematic-logo" src={studio.logo_url} alt={`${studio.name} logo`} />
            : <h1>{studio.name}</h1>}
        </div>
        <div className="studio-cinematic-caption"><span>STUDIO COLLECTION</span><h2>{studio.name}</h2></div>
      </header>

      <section className="studio-cinematic-content" aria-label={`${studio.name} titles`}>
        <div className="studio-collection-heading">
          <div>
            <h2>{studio.name} Collection</h2>
            <p>{studio.description || `Explore published movies and series from ${studio.name}.`}</p>
          </div>
          <div className="studio-collection-tools">
            <span>{content.length} {content.length === 1 ? 'title' : 'titles'}</span>
            <label><span>Sort</span><select value={sort} onChange={(event) => updateSort(event.target.value)}><option value="latest">Latest releases</option><option value="rating">Top rated</option><option value="title">A–Z</option></select></label>
            <div className="studio-phase-video-actions">
              {heroVideoPlaying && (
                <button
                  className="studio-hero-video-mute"
                  type="button"
                  aria-label={heroVideoMuted ? 'Unmute studio intro video' : 'Mute studio intro video'}
                  aria-pressed={!heroVideoMuted}
                  onClick={() => setHeroVideoMuted((muted) => !muted)}
                >
                  {heroVideoMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              )}
              <Link className="studio-phases-button" to="/studios/phases"><Layers3 size={15} /> Phases</Link>
            </div>
          </div>
        </div>
        {studio.website_url && <a className="studio-website-link" href={studio.website_url} target="_blank" rel="noreferrer">Visit {studio.name} <ArrowUpRight size={14} /></a>}
        {assignmentsLoading ? <div className="studios-loading" role="status">Loading studio titles…</div>
          : assignmentError ? <div className="studios-empty" role="alert"><h2>Unable to load studio titles</h2><p>{assignmentError}</p></div>
            : sorted.length ? <MovieRail hideScrollbar>{sorted.map((item) => <MovieCard movie={item} key={`${item.record_type || 'movie'}-${item.id}`} onPlayTrailer={onPlayTrailer} />)}</MovieRail>
              : <div className="studios-empty"><SlidersHorizontal size={32} /><h2>No published titles yet</h2><p>Assign movies or TV shows to {studio.name} in the admin forms.</p></div>}
      </section>
    </div>
  );
};
