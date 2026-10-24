import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Layers3, PlayCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import CropImage from '../components/CropImage';
import { usePublicCatalog } from '../hooks/usePublicCatalog';
import { fetchStudios, getCachedStudios } from '../services/studios';
import { fetchStudioPhases } from '../services/studioPhases';
import { getMovieDetailRoute } from '../services/movieCatalog';
import { getCachedRequest } from '../services/requestCache';

const SELECTED_STUDIO_KEY = 'mythichq:studio-phases:selected-studio';

const getInitialSelectedStudio = (studios) => {
  try {
    const selected = window.sessionStorage.getItem(SELECTED_STUDIO_KEY);
    const matchedStudio = studios.find((studio) => String(studio.id) === selected);
    if (matchedStudio) return matchedStudio.id;
  } catch (error) {
    console.warn('Unable to restore the selected studio roadmap:', error);
  }
  return studios[0]?.id || '';
};

const StudioPhasesPage = () => {
  const { movies, loading: catalogLoading } = usePublicCatalog();
  const cachedStudios = getCachedStudios();
  const [studios, setStudios] = useState(() => cachedStudios?.studios || []);
  const [selectedStudioId, setSelectedStudioId] = useState(() => getInitialSelectedStudio(cachedStudios?.studios || []));
  const [phaseResult, setPhaseResult] = useState(() => {
    const initialStudioId = getInitialSelectedStudio(cachedStudios?.studios || []);
    const phases = initialStudioId ? getCachedRequest(`catalog:studio-phases:${initialStudioId}`) : undefined;
    return { studioId: initialStudioId, phases: phases || [], error: '' };
  });
  const [studiosLoading, setStudiosLoading] = useState(() => cachedStudios === undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchStudios()
      .then(({ studios: rows }) => {
        if (!active) return;
        setStudios(rows);
        setSelectedStudioId((current) => current && rows.some((studio) => String(studio.id) === String(current))
          ? current
          : getInitialSelectedStudio(rows));
      })
      .catch((loadError) => {
        console.error('Unable to load studios for phase roadmap:', loadError);
        if (active) setError(loadError.message || 'Studios could not be loaded.');
      })
      .finally(() => { if (active) setStudiosLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      if (selectedStudioId) window.sessionStorage.setItem(SELECTED_STUDIO_KEY, String(selectedStudioId));
    } catch (storageError) {
      console.warn('Unable to preserve the selected studio roadmap:', storageError);
    }
  }, [selectedStudioId]);

  useEffect(() => {
    if (!selectedStudioId) return undefined;
    let active = true;
    const cachedPhases = getCachedRequest(`catalog:studio-phases:${selectedStudioId}`);
    if (cachedPhases !== undefined) {
      setPhaseResult({ studioId: selectedStudioId, phases: cachedPhases, error: '' });
    }
    fetchStudioPhases(selectedStudioId)
      .then((rows) => { if (active) setPhaseResult({ studioId: selectedStudioId, phases: rows, error: '' }); })
      .catch((loadError) => {
        console.error('Unable to load published studio phases:', loadError);
        if (active) setPhaseResult({ studioId: selectedStudioId, phases: [], error: loadError.message || 'This studio roadmap could not be loaded.' });
      });
    return () => { active = false; };
  }, [selectedStudioId]);

  const selectedStudio = studios.find((studio) => studio.id === selectedStudioId);
  const phases = phaseResult.studioId === selectedStudioId ? phaseResult.phases : [];
  const phasesLoading = Boolean(selectedStudioId) && phaseResult.studioId !== selectedStudioId;
  const phaseError = phaseResult.studioId === selectedStudioId ? phaseResult.error : '';
  const movieById = useMemo(() => new Map(movies.map((movie) => [String(movie.id), movie])), [movies]);

  return (
    <div className="studio-phases-page">
      <header className="studio-phases-hero">
        <div className="studio-phases-hero-glow" />
        <Link className="studio-phases-back" to="/studios"><ArrowLeft size={16} /> All studios</Link>
        <div className="studio-phases-hero-copy">
          <p className="studio-phases-eyebrow"><Sparkles size={14} /> THE CINEMATIC ROADMAP</p>
          <h1>Studio Movie <em>Phases</em></h1>
          <p>Follow each studio’s story in the recommended watch order, one chapter at a time.</p>
        </div>
        <div className="studio-phases-hero-mark" aria-hidden="true"><Layers3 size={92} /></div>
      </header>

      <main className="studio-phases-main">
        <section className="studio-phase-studios" aria-label="Choose a studio">
          <div className="studio-phase-section-heading">
            <div><span>SELECT A UNIVERSE</span><h2>Explore studio roadmaps</h2></div>
            {selectedStudio && <p>{selectedStudio.name}</p>}
          </div>
          {studiosLoading ? <p className="studio-phases-status" role="status">Loading studios…</p> : studios.length > 0 ? (
            <div className="studio-phase-tabs" role="tablist" aria-label="Studios">
              {studios.map((studio) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={studio.id === selectedStudioId}
                  aria-controls="studio-phase-roadmap"
                  className={`studio-phase-tab ${studio.id === selectedStudioId ? 'is-active' : ''}`}
                  key={studio.id}
                  onClick={() => setSelectedStudioId(studio.id)}
                >
                  {studio.logo_url ? <CropImage src={studio.logo_url} alt="" /> : <span>{studio.name.slice(0, 1)}</span>}
                  <strong>{studio.name}</strong>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          ) : !error && <div className="studio-phases-empty">No active studios are available yet.</div>}
        </section>

        <section className="studio-phase-roadmap" id="studio-phase-roadmap" role="tabpanel" aria-live="polite">
          {error || phaseError ? <div className="studio-phases-empty is-error" role="alert"><h2>Unable to load roadmap</h2><p>{error || phaseError}</p></div>
            : phasesLoading || catalogLoading ? <p className="studio-phases-status" role="status">Loading the {selectedStudio?.name || 'studio'} roadmap…</p>
              : phases.length ? (
                <>
                  <div className="studio-phase-roadmap-heading">
                    <div><span>{selectedStudio?.name || 'STUDIO'}</span><h2>Watch in this order</h2></div>
                    <p>{phases.length} {phases.length === 1 ? 'phase' : 'phases'} · {phases.reduce((count, phase) => count + (phase.movies?.length || 0), 0)} titles</p>
                  </div>
                  <div className="studio-phase-timeline">
                    {phases.map((phase) => {
                      const visibleMovies = (phase.movies || [])
                        .map((assignment) => ({ assignment, movie: movieById.get(String(assignment.movie_id)) }))
                        .filter(({ movie }) => movie?.is_published === true);
                      return (
                        <article className="studio-phase-chapter" key={phase.id}>
                          <div className="studio-phase-marker" aria-hidden="true" />
                          <div className="studio-phase-content">
                            <header className="studio-phase-title">
                              <div>
                                {phase.release_period && <span className="studio-phase-kicker">{phase.release_period}</span>}
                                {phase.image_url
                                  ? <CropImage className="studio-phase-banner" src={phase.image_url} alt={phase.title} />
                                  : <h3>{phase.title}</h3>}
                                {phase.description && <p>{phase.description}</p>}
                              </div>
                              <span className="studio-phase-count">{visibleMovies.length} {visibleMovies.length === 1 ? 'title' : 'titles'}</span>
                            </header>
                            {visibleMovies.length ? (
                              <div className="studio-phase-movies">
                                {visibleMovies.map(({ assignment, movie }) => (
                                  <article className="studio-phase-movie" key={assignment.id}>
                                    <Link className="studio-phase-poster-link" to={getMovieDetailRoute(movie)} aria-label={`View ${movie.title} details`}>
                                      <CropImage className="studio-phase-poster" src={movie.poster_url || movie.poster_path || movie.poster} alt={`${movie.title} poster`} />
                                      <span className="studio-phase-watch-number">{assignment.watch_order}</span>
                                    </Link>
                                    <div className="studio-phase-movie-copy">
                                      <span className="studio-phase-watch-label">{assignment.custom_label || `WATCH ${assignment.watch_order}`}</span>
                                      <h4>{movie.title}</h4>
                                      <p>{String(movie.release_date || '').slice(0, 4) || 'Release year unavailable'}</p>
                                      {assignment.watch_note && <small>{assignment.watch_note}</small>}
                                      <Link className="studio-phase-details-link" to={getMovieDetailRoute(movie)}><PlayCircle size={15} /> Movie details</Link>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            ) : <p className="studio-phase-no-movies">No published movies have been added to this phase.</p>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : selectedStudio ? (
                <div className="studio-phases-empty">
                  <Layers3 size={32} />
                  <h2>No published phases yet</h2>
                  <p>{selectedStudio.name} does not have a public roadmap yet. Check back when the studio’s phases are published.</p>
                </div>
              ) : null}
        </section>
      </main>
    </div>
  );
};

export default StudioPhasesPage;
