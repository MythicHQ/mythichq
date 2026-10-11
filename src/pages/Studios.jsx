import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Building2, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import MovieRail from '../components/MovieRail';
import CropImage from '../components/CropImage';
import { StudioCard } from '../components/StudioCard';
import { fetchStudioContentAssignments, fetchStudios, subscribeToStudios } from '../services/studios';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const EMPTY_ASSIGNMENTS = [];

const useStudios = () => {
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => fetchStudios()
      .then(({ studios: next }) => { if (active) { setStudios(next); setError(''); } })
      .catch((loadError) => {
        console.error('Unable to load studios:', loadError);
        if (active) setError('Studios could not be loaded right now.');
      })
      .finally(() => { if (active) setLoading(false); });
    const unsubscribe = subscribeToStudios(refresh);
    void refresh();
    return () => { active = false; unsubscribe(); };
  }, []);
  return { studios, loading, error };
};

export const StudiosPage = () => {
  const { studios, loading, error } = useStudios();
  const [search, setSearch] = useState('');
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
        <div className="studios-hero-art" aria-hidden="true"><span className="studios-hero-orbit orbit-one" /><span className="studios-hero-orbit orbit-two" /><span className="studios-hero-mark">M</span><span className="studios-hero-art-caption">A WORLD OF<br />GREAT STORIES</span></div>
      </header>
      <section className="studios-directory" aria-label="Studio directory">
        <div className="studios-directory-heading">
          <div><p className="studios-directory-kicker">THE DIRECTORY</p><h2>Explore studios</h2><p>Choose a studio to browse its movie and TV collection.</p></div>
          <label className="studios-search"><Search size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a studio" aria-label="Search studios" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear studio search">×</button>}</label>
        </div>
        {loading ? <div className="studios-grid studios-grid-loading" role="status" aria-label="Loading studios">{Array.from({ length: 6 }, (_, index) => <span className="studio-directory-skeleton" key={index} />)}</div>
          : error ? <div className="studios-empty" role="alert"><h2>Unable to load studios</h2><p>{error}</p></div>
            : visibleStudios.length ? <div className="studios-grid">{visibleStudios.map((studio, index) => <div className="studio-directory-card" key={studio.id}><span className="studio-directory-index">{String(index + 1).padStart(2, '0')}</span><StudioCard studio={studio} /><span className="studio-directory-hint">Explore collection <ArrowUpRight size={14} /></span></div>)}</div>
              : <div className="studios-empty"><Building2 size={32} /><h2>{studios.length ? 'No studios found' : 'No studios available'}</h2><p>{studios.length ? 'Try another studio name.' : 'Check back soon for studio collections.'}</p></div>}
      </section>
    </div>
  );
};

export const StudioDetailPage = ({ onPlayTrailer }) => {
  const { slug } = useParams();
  const { studios, loading, error } = useStudios();
  const { movies } = usePublicCatalog();
  const [sort, setSort] = useState('latest');
  const [assignmentState, setAssignmentState] = useState({ studioId: null, rows: [], loading: true, error: '' });
  const studio = studios.find((item) => item.slug === slug);
  const studioId = studio?.id;
  useEffect(() => {
    if (!studioId) return undefined;
    let active = true;
    const refresh = () => fetchStudioContentAssignments(studioId)
      .then((rows) => { if (active) setAssignmentState({ studioId, rows, loading: false, error: '' }); })
      .catch((loadError) => {
        console.error('Unable to load titles assigned to studio:', loadError);
        if (active) setAssignmentState({ studioId, rows: [], loading: false, error: loadError.message || 'Studio titles could not be loaded.' });
      });
    const unsubscribe = subscribeToStudios(refresh);
    void refresh();
    return () => { active = false; unsubscribe(); };
  }, [studioId]);
  const assignmentRows = assignmentState.studioId === studioId ? assignmentState.rows : EMPTY_ASSIGNMENTS;
  const assignmentsLoading = Boolean(studioId) && (assignmentState.studioId !== studioId || assignmentState.loading);
  const assignmentError = assignmentState.studioId === studioId ? assignmentState.error : '';
  const content = useMemo(() => {
    const movieIds = new Set(assignmentRows.map((row) => row.movie_id).filter((id) => id != null).map(String));
    const tvShowIds = new Set(assignmentRows.map((row) => row.tv_show_id).filter((id) => id != null).map(String));
    return movies.filter((item) => item.is_published !== false && (
      item.record_type === 'tv_show' || item.content_type === 'tv_show'
        ? tvShowIds.has(String(item.id))
        : movieIds.has(String(item.id))
    ));
  }, [assignmentRows, movies]);
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
        {studio.background_url && <CropImage className="studio-detail-background" src={studio.background_url} alt="" />}
        <div className={`studio-cinematic-brand studio-logo-${studio.logo_position || 'center'}`}>
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
            <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="latest">Latest releases</option><option value="rating">Top rated</option><option value="title">A–Z</option></select></label>
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
