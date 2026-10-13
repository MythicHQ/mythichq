import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, GripVertical, Layers3, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import CropImage from '../../components/CropImage';
import { fetchAdminContent, getMovieDetailRoute } from '../../services/movieCatalog';
import { fetchStudios } from '../../services/studios';
import {
  addPhaseMovies,
  deletePhaseMovie,
  deleteStudioPhase,
  fetchStudioPhaseMovieAssignments,
  fetchStudioPhases,
  reorderPhaseMovies,
  reorderStudioPhases,
  savePhaseMovie,
  saveStudioPhase,
} from '../../services/studioPhases';

const emptyPhase = (studioId = '') => ({
  studio_id: studioId,
  phase_number: 1,
  title: '',
  description: '',
  image_url: '',
  release_period: '',
  display_order: 0,
  status: 'draft',
});

const EMPTY_MOVIE_IDS = new Set();
const isMovie = (item) => item.record_type !== 'tv_show' && item.content_type !== 'tv_show';

const AdminStudioPhasesPage = () => {
  const [studios, setStudios] = useState([]);
  const [phases, setPhases] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [phaseImageFile, setPhaseImageFile] = useState(null);
  const [phaseImagePreview, setPhaseImagePreview] = useState('');
  const [studioMovieAssignment, setStudioMovieAssignment] = useState({ studioId: '', ids: new Set() });
  const [form, setForm] = useState(emptyPhase());
  const [editingId, setEditingId] = useState(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMovieIds, setSelectedMovieIds] = useState([]);
  const [showAllMovies, setShowAllMovies] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [draggedMovieId, setDraggedMovieId] = useState('');

  const load = useCallback(async () => {
    const [studioResult, phaseRows, contentRows] = await Promise.all([
      fetchStudios({ includeInactive: true }),
      fetchStudioPhases(null, { includeDrafts: true }),
      fetchAdminContent(),
    ]);
    setStudios(studioResult.studios);
    setPhases(phaseRows);
    setCatalog(contentRows.filter(isMovie));
    setForm((current) => current.studio_id ? current : emptyPhase(studioResult.studios[0]?.id || ''));
    setSelectedPhaseId((current) => current && phaseRows.some((phase) => phase.id === current)
      ? current
      : phaseRows[0]?.id || '');
  }, []);

  const reportInitialLoadError = useCallback((loadError) => {
    console.error('Unable to load studio phase management data:', loadError);
    setError(loadError.message || 'Studio phase data could not be loaded.');
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      await load();
    } catch (loadError) {
      reportInitialLoadError(loadError);
    } finally {
      setLoading(false);
    }
  }, [load, reportInitialLoadError]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    let active = true;
    if (!form.studio_id) return undefined;
    fetchStudioPhaseMovieAssignments(form.studio_id)
      .then((ids) => { if (active) setStudioMovieAssignment({ studioId: form.studio_id, ids }); })
      .catch((loadError) => {
        console.error('Unable to load studio movie assignments:', loadError);
        if (active) setError(loadError.message || 'Studio movie assignments could not be loaded.');
      });
    return () => { active = false; };
  }, [form.studio_id]);

  const studioMovieIds = studioMovieAssignment.studioId === form.studio_id ? studioMovieAssignment.ids : EMPTY_MOVIE_IDS;
  const selectedPhase = phases.find((phase) => phase.id === selectedPhaseId);
  const selectedPhaseMovies = useMemo(() => (selectedPhase?.movies || [])
    .map((assignment) => ({ assignment, movie: catalog.find((item) => String(item.id) === String(assignment.movie_id)) }))
    .filter(({ movie }) => movie)
    .sort((first, second) => Number(first.assignment.watch_order) - Number(second.assignment.watch_order)), [catalog, selectedPhase]);
  const availableMovies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const existing = new Set((selectedPhase?.movies || []).map((assignment) => String(assignment.movie_id)));
    return catalog.filter((movie) => !existing.has(String(movie.id))
      && (showAllMovies || studioMovieIds.has(String(movie.id)))
      && (!query || movie.title.toLocaleLowerCase().includes(query)));
  }, [catalog, search, selectedPhase, showAllMovies, studioMovieIds]);

  const resetForm = () => {
    if (phaseImagePreview.startsWith('blob:')) URL.revokeObjectURL(phaseImagePreview);
    setPhaseImageFile(null);
    setPhaseImagePreview('');
    setEditingId(null);
    setForm(emptyPhase(studios[0]?.id || ''));
  };

  const beginEdit = (phase) => {
    if (phaseImagePreview.startsWith('blob:')) URL.revokeObjectURL(phaseImagePreview);
    setPhaseImageFile(null);
    setPhaseImagePreview(phase.image_url || '');
    setEditingId(phase.id);
    setSelectedPhaseId(phase.id);
    setForm({
      studio_id: phase.studio_id,
      phase_number: phase.phase_number,
      title: phase.title,
      description: phase.description || '',
      image_url: phase.image_url || '',
      release_period: phase.release_period || '',
      display_order: phase.display_order,
      status: phase.status,
    });
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const choosePhaseImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError('Choose a PNG, JPEG, or WebP phase image that is 8 MB or smaller.');
      return;
    }
    if (phaseImagePreview.startsWith('blob:')) URL.revokeObjectURL(phaseImagePreview);
    setError('');
    setPhaseImageFile(file);
    setPhaseImagePreview(URL.createObjectURL(file));
    setForm((current) => ({ ...current, image_url: '' }));
  };

  const removePhaseImage = () => {
    if (phaseImagePreview.startsWith('blob:')) URL.revokeObjectURL(phaseImagePreview);
    setPhaseImageFile(null);
    setPhaseImagePreview('');
    setForm((current) => ({ ...current, image_url: '' }));
  };

  const submitPhase = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveStudioPhase(form, editingId, {
        imageFile: phaseImageFile,
        previous: phases.find((phase) => phase.id === editingId) || null,
      });
      await load();
      setSelectedPhaseId(saved.id);
      setMessage(`${saved.title} saved.`);
      resetForm();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this phase.');
    } finally {
      setSaving(false);
    }
  };

  const removePhase = async (phase) => {
    if (!window.confirm(`Delete Phase ${phase.phase_number} — ${phase.title}? Its movie records will remain in MythicHQ.`)) return;
    setBusyId(phase.id);
    setError('');
    try {
      await deleteStudioPhase(phase.id);
      if (editingId === phase.id) resetForm();
      await load();
      setMessage(`${phase.title} deleted.`);
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete this phase.');
    } finally {
      setBusyId('');
    }
  };

  const movePhase = async (phase, delta) => {
    const sameStudio = phases.filter((item) => item.studio_id === phase.studio_id)
      .sort((first, second) => Number(first.display_order) - Number(second.display_order) || Number(first.phase_number) - Number(second.phase_number));
    const from = sameStudio.findIndex((item) => item.id === phase.id);
    const to = from + delta;
    if (to < 0 || to >= sameStudio.length) return;
    [sameStudio[from], sameStudio[to]] = [sameStudio[to], sameStudio[from]];
    setBusyId(phase.id);
    setError('');
    try {
      await reorderStudioPhases(sameStudio);
      await load();
    } catch (moveError) {
      setError(moveError.message || 'Unable to reorder phases.');
    } finally {
      setBusyId('');
    }
  };

  const addSelectedMovies = async () => {
    if (!selectedPhase || !selectedMovieIds.length) return;
    setSaving(true);
    setError('');
    try {
      await addPhaseMovies(selectedPhase.id, selectedMovieIds, studioMovieIds);
      await load();
      setSelectedMovieIds([]);
      setSelectorOpen(false);
      setSearch('');
      setMessage('Movies added to the phase.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to add movies to this phase.');
    } finally {
      setSaving(false);
    }
  };

  const updateAssignment = async (assignment, values) => {
    setBusyId(assignment.id);
    setError('');
    try {
      await savePhaseMovie(selectedPhase.id, assignment.movie_id, {
        watch_order: assignment.watch_order,
        custom_label: values.custom_label,
        watch_note: values.watch_note,
        is_override: assignment.is_override,
      }, assignment.id);
      await load();
      setMessage('Movie entry updated.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to update the movie entry.');
    } finally {
      setBusyId('');
    }
  };

  const removeMovie = async (assignment) => {
    setBusyId(assignment.id);
    setError('');
    try {
      await deletePhaseMovie(assignment.id);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to remove this movie from the phase.');
    } finally {
      setBusyId('');
    }
  };

  const persistMovieOrder = async (nextMovies) => {
    setError('');
    const updates = nextMovies.map(({ assignment }) => assignment);
    try {
      await reorderPhaseMovies(updates);
      await load();
    } catch (reorderError) {
      setError(reorderError.message || 'Unable to update movie order.');
    }
  };

  const moveMovie = (assignmentId, delta) => {
    const from = selectedPhaseMovies.findIndex(({ assignment }) => assignment.id === assignmentId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= selectedPhaseMovies.length) return;
    const next = [...selectedPhaseMovies];
    [next[from], next[to]] = [next[to], next[from]];
    void persistMovieOrder(next);
  };

  const dropMovie = (targetId) => {
    if (!draggedMovieId || draggedMovieId === targetId) return;
    const next = [...selectedPhaseMovies];
    const from = next.findIndex(({ assignment }) => assignment.id === draggedMovieId);
    const to = next.findIndex(({ assignment }) => assignment.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraggedMovieId('');
    void persistMovieOrder(next);
  };

  return (
    <div className="admin-page-shell studio-phases-admin">
      <div className="admin-header-row">
        <div><p className="admin-kicker">Studios</p><h1>Studio Phases Management</h1><p className="admin-header-copy">Build a separate, published watch roadmap for every studio.</p></div>
        <Link className="admin-button admin-button-secondary" to="/studios/phases" target="_blank"><Eye size={15} /> Preview roadmap</Link>
      </div>
      {error && <p className="studio-phases-admin-feedback is-error" role="alert">{error}</p>}
      {message && <p className="studio-phases-admin-feedback is-success" role="status">{message}</p>}

      <form className="studio-phase-admin-form" onSubmit={submitPhase}>
        <div className="studio-phase-admin-form-heading"><span><Layers3 size={17} /></span><div><h2>{editingId ? 'Edit phase' : 'Create a phase'}</h2><p>Phase settings apply only to the selected studio.</p></div></div>
        <div className="studio-phase-admin-fields">
          <label><span>Studio *</span><select required disabled={Boolean(editingId && phases.find((phase) => phase.id === editingId)?.movies?.length)} value={form.studio_id} onChange={(event) => setForm((current) => ({ ...current, studio_id: event.target.value }))}><option value="">Choose studio</option>{studios.map((studio) => <option key={studio.id} value={studio.id}>{studio.name}</option>)}</select>{Boolean(editingId && phases.find((phase) => phase.id === editingId)?.movies?.length) && <small>Remove its movie entries before moving this phase to another studio.</small>}</label>
          <label><span>Phase number *</span><input type="number" min="1" required value={form.phase_number} onChange={(event) => setForm((current) => ({ ...current, phase_number: event.target.value }))} /></label>
          <label className="studio-phase-admin-wide"><span>Phase title *</span><input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="The Beginning" /></label>
          <label><span>Release period / year range</span><input value={form.release_period} onChange={(event) => setForm((current) => ({ ...current, release_period: event.target.value }))} placeholder="2008–2012" /></label>
          <label><span>Display order</span><input type="number" min="0" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} /></label>
          <label className="studio-phase-admin-wide"><span>Description</span><textarea rows="3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="What happens in this chapter?" /></label>
          <div className="studio-phase-image-field">
            <span>Phase image (optional)</span>
            {phaseImagePreview && <div className="studio-phase-image-preview"><CropImage src={phaseImagePreview} alt={`${form.title || 'Phase'} preview`} /><button type="button" className="admin-button admin-button-secondary is-danger" onClick={removePhaseImage}><X size={14} /> Remove image</button></div>}
            <label className="studio-phase-image-upload"><span>{phaseImageFile ? phaseImageFile.name : 'Upload an image'}</span><small>PNG, JPEG, or WebP · max 8 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhaseImage} /></label>
            <label className="studio-phase-image-url"><span>Or use an image URL</span><input type="url" value={form.image_url} onChange={(event) => { if (phaseImagePreview.startsWith('blob:')) URL.revokeObjectURL(phaseImagePreview); setPhaseImageFile(null); setPhaseImagePreview(event.target.value); setForm((current) => ({ ...current, image_url: event.target.value })); }} placeholder="https://…" /></label>
          </div>
          <label><span>Status</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="draft">Draft</option><option value="published">Published</option></select></label>
        </div>
        <div className="studio-phase-admin-actions">
          {editingId && <button className="admin-button admin-button-secondary" type="button" onClick={resetForm}><X size={15} /> Cancel edit</button>}
          <button className="admin-button admin-button-primary" type="submit" disabled={saving || !studios.length}>{saving ? 'Saving…' : <><Save size={15} /> {editingId ? 'Save phase' : 'Create phase'}</>}</button>
        </div>
      </form>

      <section className="studio-phase-admin-library">
        <div className="studio-phase-admin-library-heading"><div><p className="admin-kicker">Phase roadmap</p><h2>Manage phases and movies</h2></div><span>{phases.length} phases</span></div>
        {loading ? <p className="studio-phases-status">Loading phases…</p>
          : phases.length ? <div className="studio-phase-admin-layout">
            <div className="studio-phase-admin-list">
              {phases.map((phase) => {
                const studio = studios.find((item) => item.id === phase.studio_id);
                return (
                  <article className={`studio-phase-admin-card ${phase.id === selectedPhaseId ? 'is-selected' : ''}`} key={phase.id}>
                    <button className="studio-phase-admin-select" type="button" onClick={() => { setSelectedPhaseId(phase.id); setSelectorOpen(false); }}>
                      <span className="studio-phase-admin-index">{phase.phase_number}</span>
                      <span><strong>{phase.title}</strong><small>{studio?.name || 'Studio unavailable'} · {phase.movies?.length || 0} movies</small></span>
                      <i className={`studio-phase-status is-${phase.status}`}>{phase.status}</i>
                    </button>
                    <div className="studio-phase-admin-card-actions">
                      <button type="button" title="Move phase up" aria-label={`Move ${phase.title} up`} onClick={() => void movePhase(phase, -1)} disabled={busyId === phase.id}><ArrowUp size={14} /></button>
                      <button type="button" title="Move phase down" aria-label={`Move ${phase.title} down`} onClick={() => void movePhase(phase, 1)} disabled={busyId === phase.id}><ArrowDown size={14} /></button>
                      <button type="button" title="Edit phase" aria-label={`Edit ${phase.title}`} onClick={() => beginEdit(phase)}><Pencil size={14} /></button>
                      <button type="button" className="is-danger" title="Delete phase" aria-label={`Delete ${phase.title}`} onClick={() => void removePhase(phase)} disabled={busyId === phase.id}><Trash2 size={14} /></button>
                    </div>
                  </article>
                );
              })}
            </div>

            {selectedPhase && <div className="studio-phase-movie-editor">
              <div className="studio-phase-movie-editor-heading">
                <div><span>PHASE {selectedPhase.phase_number}</span><h3>{selectedPhase.title}</h3><small>{studios.find((studio) => studio.id === selectedPhase.studio_id)?.name}</small></div>
                <button type="button" className="admin-button admin-button-secondary" onClick={() => { setForm((current) => ({ ...current, studio_id: selectedPhase.studio_id })); setSelectorOpen((open) => !open); }}><Plus size={15} /> Add Movies to Phase</button>
              </div>
              {selectorOpen && (
                <div className="studio-phase-movie-selector">
                  <div className="studio-phase-selector-search"><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search movie titles" aria-label="Search movies" /></div>
                  <label className="studio-phase-override"><input type="checkbox" checked={showAllMovies} onChange={(event) => setShowAllMovies(event.target.checked)} /> Show all movies (explicitly override studio lineup)</label>
                  <div className="studio-phase-selector-results">
                    {availableMovies.length ? availableMovies.map((movie) => (
                      <label className="studio-phase-selector-movie" key={movie.id}>
                        <input type="checkbox" checked={selectedMovieIds.includes(String(movie.id))} onChange={(event) => setSelectedMovieIds((current) => event.target.checked ? [...current, String(movie.id)] : current.filter((id) => id !== String(movie.id)))} />
                        <CropImage src={movie.poster_url || movie.poster_path || movie.poster} alt="" />
                        <span><strong>{movie.title}</strong><small>{String(movie.release_date || '').slice(0, 4) || 'Year unknown'}</small></span>
                      </label>
                    )) : <p className="studio-phases-status">No eligible movies match this search.</p>}
                  </div>
                  <div className="studio-phase-selector-actions"><button type="button" className="admin-button admin-button-secondary" onClick={() => setSelectorOpen(false)}>Cancel</button><button type="button" className="admin-button admin-button-primary" onClick={() => void addSelectedMovies()} disabled={saving || !selectedMovieIds.length}><Plus size={14} /> Add {selectedMovieIds.length || ''} selected</button></div>
                </div>
              )}

              <div className="studio-phase-admin-movies">
                {selectedPhaseMovies.length ? selectedPhaseMovies.map(({ assignment, movie }, index) => (
                  <PhaseMovieRow
                    key={`${assignment.id}-${assignment.updated_at}`}
                    assignment={assignment}
                    movie={movie}
                    index={index}
                    busy={busyId === assignment.id}
                    onMove={(delta) => moveMovie(assignment.id, delta)}
                    onRemove={() => void removeMovie(assignment)}
                    onSave={(values) => void updateAssignment(assignment, values)}
                    onDragStart={() => setDraggedMovieId(assignment.id)}
                    onDrop={() => dropMovie(assignment.id)}
                  />
                )) : <div className="studio-phase-no-admin-movies"><p>No movies have been added to this phase.</p><span>Use “Add Movies to Phase” to select from the catalog.</span></div>}
              </div>
            </div>}
          </div>
            : <div className="studio-phases-empty"><Layers3 size={30} /><h2>No phases created</h2><p>Create a phase above to start building a studio roadmap.</p></div>}
      </section>
    </div>
  );
};

const PhaseMovieRow = ({ assignment, movie, index, busy, onMove, onRemove, onSave, onDragStart, onDrop }) => {
  const [label, setLabel] = useState(assignment.custom_label || '');
  const [note, setNote] = useState(assignment.watch_note || '');

  return (
    <article className="studio-phase-admin-movie" draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <GripVertical className="studio-phase-drag-handle" size={17} aria-label="Drag to reorder" />
      <span className="studio-phase-admin-movie-number">{assignment.watch_order}</span>
      <CropImage src={movie.poster_url || movie.poster_path || movie.poster} alt="" />
      <div className="studio-phase-admin-movie-main">
        <div className="studio-phase-admin-movie-title"><strong>{movie.title}</strong><small>{String(movie.release_date || '').slice(0, 4) || 'Year unknown'}{assignment.is_override ? ' · override' : ''}</small><a href={getMovieDetailRoute(movie)} target="_blank" rel="noreferrer">View details</a></div>
        <div className="studio-phase-admin-movie-fields"><label><span>Custom label</span><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Watch First" /></label><label><span>Recommended note</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="After the finale…" /></label></div>
      </div>
      <div className="studio-phase-admin-movie-actions">
        <button type="button" title="Move movie up" aria-label={`Move ${movie.title} up`} onClick={() => onMove(-1)} disabled={busy || index === 0}><ArrowUp size={14} /></button>
        <button type="button" title="Move movie down" aria-label={`Move ${movie.title} down`} onClick={() => onMove(1)} disabled={busy}><ArrowDown size={14} /></button>
        <button type="button" title="Save label and note" aria-label={`Save ${movie.title} entry`} onClick={() => onSave({ custom_label: label, watch_note: note })} disabled={busy}><Check size={14} /></button>
        <button type="button" className="is-danger" title="Remove from phase" aria-label={`Remove ${movie.title} from phase`} onClick={onRemove} disabled={busy}><X size={14} /></button>
      </div>
    </article>
  );
};

export default AdminStudioPhasesPage;
