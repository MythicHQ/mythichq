import { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Search, X } from 'lucide-react';
import CropImage from './CropImage';
import { createStudioSlug, fetchStudios, saveStudio, subscribeToStudios } from '../services/studios';
import { useAuth } from '../pages/Admin/AuthContext';

const noop = () => {};

const StudioSelector = ({ selectedIds, onChange, onSelectedStudiosChange = noop, label = 'Production Studio' }) => {
  const { user } = useAuth();
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const refresh = async () => {
    const result = await fetchStudios({ includeInactive: true });
    setStudios(result.studios);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await fetchStudios({ includeInactive: true });
        if (active) { setStudios(result.studios); setError(''); }
      } catch (loadError) {
        console.error('Unable to load studios for title form:', loadError);
        if (active) setError(loadError.message || 'Studios could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };
    const unsubscribe = subscribeToStudios(() => { void load(); });
    void load();
    return () => { active = false; unsubscribe(); };
  }, []);

  const selected = useMemo(
    () => studios.filter((studio) => selectedIds.includes(studio.id)),
    [studios, selectedIds],
  );
  useEffect(() => {
    onSelectedStudiosChange(selected);
  }, [onSelectedStudiosChange, selected]);
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return studios.filter((studio) => studio.is_active
      && (!query || studio.name.toLocaleLowerCase().includes(query)));
  }, [studios, search]);

  const toggleStudio = (studio) => onChange(selectedIds.includes(studio.id)
    ? selectedIds.filter((id) => id !== studio.id)
    : [...selectedIds, studio.id]);

  const createStudio = async (event) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const studio = await saveStudio({
        values: {
          name,
          slug: createStudioSlug(name),
          description: '',
          website_url: '',
          background_color: '#171a24',
          overlay_opacity: '0.48',
          logo_position: 'center',
          text_position: 'left',
          display_order: 1000,
          is_featured: false,
          is_active: true,
        },
        files: {},
        userId: user?.id,
      });
      await refresh();
      onChange([...new Set([...selectedIds, studio.id])]);
      setNewName('');
      setShowCreate(false);
    } catch (createError) {
      console.error('Unable to add studio from title form:', createError);
      setError(createError.message || 'Unable to add studio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="studio-selector" id="production-studios">
      <div className="studio-selector-heading">
        <span>{label}</span>
        <small>Select one or more studios for this title.</small>
      </div>
      <div className="studio-selector-search">
        <Search size={16} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search studios..."
          aria-label="Search production studios"
          disabled={loading}
        />
      </div>
      {selected.length > 0 ? (
        <div className="studio-selector-chips" aria-label="Selected studios">
          {selected.map((studio) => (
            <span className="studio-selector-chip" key={studio.id}>
              {studio.logo_url && <CropImage src={studio.logo_url} alt="" />}
              <span>{studio.name}{!studio.is_active && ' (inactive)'}</span>
              <button type="button" onClick={() => toggleStudio(studio)} aria-label={`Remove ${studio.name}`}><X size={14} /></button>
            </span>
          ))}
        </div>
      ) : <p className="studio-selector-none"><Building2 size={14} /> No studio assigned</p>}
      <div className="studio-selector-options" role="listbox" aria-label="Available production studios" aria-multiselectable="true">
        {loading ? <p className="studio-selector-message">Loading studios…</p>
          : visible.length ? visible.map((studio) => (
            <button
              type="button"
              role="option"
              aria-selected={selectedIds.includes(studio.id)}
              className={`studio-selector-option${selectedIds.includes(studio.id) ? ' is-selected' : ''}`}
              key={studio.id}
              onClick={() => toggleStudio(studio)}
            >
              {studio.logo_url ? <CropImage src={studio.logo_url} alt="" /> : <Building2 size={18} />}
              <span>{studio.name}</span>
              {selectedIds.includes(studio.id) && <span className="studio-selector-check">Selected</span>}
            </button>
          )) : <p className="studio-selector-message">{studios.some((studio) => studio.is_active) ? 'No studios match your search.' : 'No active studios yet. Use Add Studio to create one.'}</p>}
      </div>
      <div className="studio-selector-actions">
        <button type="button" className="movie-form-text-button" onClick={() => onChange([])} disabled={!selectedIds.length}>No studio assigned</button>
        <button type="button" className="movie-form-text-button" onClick={() => setShowCreate((current) => !current)}><Plus size={14} /> Add Studio</button>
      </div>
      {error && <p className="studio-selector-error" role="alert">{error}</p>}
      {showCreate && (
        <form className="studio-selector-create" onSubmit={createStudio}>
          <label><span>New studio name</span><input autoFocus required value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g. A24" /></label>
          <div><button type="button" className="admin-button admin-button-secondary" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button><button type="submit" className="admin-button admin-button-primary" disabled={saving}>{saving ? 'Adding…' : 'Add and select'}</button></div>
        </form>
      )}
    </div>
  );
};

export default StudioSelector;
