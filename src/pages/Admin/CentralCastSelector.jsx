import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react';
import { searchCastMembers } from '../../services/castMembers';
import CastMemberDialog from './CastMemberDialog';

const reorder = (items, from, to) => {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const CentralCastSelector = ({ cast, onChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(-1);

  useEffect(() => {
    if (query.trim().length < 2) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const matches = await searchCastMembers(query);
        if (active) setResults(matches.filter((member) => !cast.some((entry) => entry.id === member.id)));
      } catch (error) {
        console.error('Failed to search cast:', error);
        if (active) setSearchError(error.message || 'Unable to search the cast directory.');
      } finally {
        if (active) setSearching(false);
      }
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [cast, query]);

  const addMember = (member) => {
    onChange([...cast, { ...member, character_name: '', display_order: cast.length }]);
    setQuery('');
    setResults([]);
  };

  const handleCreated = (member) => addMember(member);
  const updateCharacter = (id, character_name) => onChange(cast.map((member) => member.id === id ? { ...member, character_name } : member));
  const handleSearchChange = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    if (nextQuery.trim().length < 2) {
      setResults([]);
      setSearchError('');
    }
  };

  return (
    <section className="central-cast-selector">
      <div className="central-cast-search">
        <div className="central-cast-search-input"><input aria-label="Search cast member by name or character" value={query} onChange={handleSearchChange} placeholder="Search cast member by name or character…" autoComplete="off" /><Search size={17} aria-hidden="true" /></div>
        {searching && <span className="central-cast-search-status"><LoaderCircle size={15} className="viewer-spinner" /> Searching…</span>}
        {searchError && <p className="cast-dialog-error" role="alert">{searchError}</p>}
        {query.trim().length >= 2 && !searching && !searchError && results.length > 0 && (
          <div className="central-cast-results" role="listbox" aria-label="Cast search results">
            {results.map((member) => <button type="button" role="option" key={member.id} onClick={() => addMember(member)}>
              {member.profile_image_url ? <img src={member.profile_image_url} alt="" /> : <span className="central-cast-result-fallback">{member.full_name.slice(0, 1)}</span>}
              <span><strong>{member.full_name}</strong><small>{member.profession || 'Actor'}</small></span>
              <Plus size={16} />
            </button>)}
          </div>
        )}
        {query.trim().length >= 2 && !searching && !searchError && results.length === 0 && (
          <button type="button" className="central-cast-create-link" onClick={() => setCreateOpen(true)}><Plus size={15} /> Add “{query.trim()}” as a new cast member</button>
        )}
      </div>
      {cast.length ? <div className="central-cast-selected">
        {cast.map((member, index) => <article
          key={member.id}
          className={`central-cast-card ${dragIndex === index ? 'is-dragging' : ''}`}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (dragIndex >= 0 && dragIndex !== index) onChange(reorder(cast, dragIndex, index));
            setDragIndex(-1);
          }}
          onDragEnd={() => setDragIndex(-1)}
        >
          {member.profile_image_url || member.image_url ? <img src={member.profile_image_url || member.image_url} alt="" /> : <span className="central-cast-result-fallback">{member.full_name.slice(0, 1)}</span>}
          <div className="central-cast-card-info"><strong>{member.full_name}</strong><small>{member.profession || 'Actor'}</small><label><span>Character</span><input value={member.character_name || ''} onChange={(event) => updateCharacter(member.id, event.target.value)} placeholder="Character name" /></label></div>
          <div className="central-cast-card-actions">
            <button type="button" title="Move up" aria-label={`Move ${member.full_name} up`} disabled={index === 0} onClick={() => onChange(reorder(cast, index, index - 1))}><ArrowUp size={14} /></button>
            <button type="button" title="Move down" aria-label={`Move ${member.full_name} down`} disabled={index === cast.length - 1} onClick={() => onChange(reorder(cast, index, index + 1))}><ArrowDown size={14} /></button>
            <button type="button" title="Remove cast member" aria-label={`Remove ${member.full_name}`} onClick={() => onChange(cast.filter((entry) => entry.id !== member.id))}><Trash2 size={14} /></button>
          </div>
        </article>)}
      </div> : <p className="admin-credit-empty">Search the cast directory to add cast to this movie.</p>}
      {createOpen && <CastMemberDialog member={null} onClose={() => setCreateOpen(false)} onSaved={handleCreated} />}
    </section>
  );
};

export default CentralCastSelector;
