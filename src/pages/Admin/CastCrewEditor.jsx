import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import CropImage from '../../components/CropImage';
import ImageCropButton from '../../components/ImageCropButton';

const DEPARTMENTS = [
  'Director', 'Writer', 'Producer', 'Executive Producer', 'Cinematography', 'Editor',
  'Music', 'Composer', 'Production Designer', 'Costume Designer', 'Casting',
  'Visual Effects', 'Sound', 'Makeup', 'Other',
];

const makeDraft = (kind) => ({
  person_name: '',
  character_name: '',
  department: 'Director',
  job: '',
  image_url: '',
  imagePreview: '',
  imageFile: null,
  storage_path: '',
  display_order: 0,
  ...(kind === 'cast' ? { role: 'Actor' } : {}),
});

const reorder = (entries, from, to) => {
  if (to < 0 || to >= entries.length) return entries;
  const next = [...entries];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((entry, index) => ({ ...entry, display_order: index }));
};

const CreditList = ({ kind, title, entries, onChange }) => {
  const [draft, setDraft] = useState(null);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [dragIndex, setDragIndex] = useState(-1);
  const [imageLinkError, setImageLinkError] = useState('');
  const isCast = kind === 'cast';

  const openNew = () => {
    setImageLinkError('');
    setDraft({ ...makeDraft(kind), display_order: entries.length });
    setEditingIndex(-1);
  };

  const openEdit = (entry, index) => {
    setImageLinkError('');
    setDraft({
      ...makeDraft(kind),
      ...entry,
      display_order: Number.isInteger(Number(entry.display_order)) ? Number(entry.display_order) : index,
      imagePreview: entry.imagePreview || entry.image_url || '',
    });
    setEditingIndex(index);
  };

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      window.alert('Choose a JPG, PNG, or WEBP profile image.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert('Profile images must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setDraft((current) => ({
      ...current,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      image_url: '',
      storage_path: '',
      removeImage: false,
    }));
    setImageLinkError('');
  };

  const saveDraft = () => {
    const name = draft.person_name.trim();
    if (!name) return;
    if (!isCast && !draft.department.trim()) {
      window.alert('Enter a crew department.');
      return;
    }

    const requestedOrder = Number.isInteger(Number(draft.display_order))
      ? Math.max(0, Math.min(entries.length, Number(draft.display_order)))
      : editingIndex >= 0 ? editingIndex : entries.length;
    const nextEntry = {
      ...draft,
      person_name: name,
      ...(isCast ? { role: 'Actor' } : {}),
      display_order: requestedOrder,
    };
    const nextEntries = [...entries];
    if (editingIndex >= 0) nextEntries.splice(editingIndex, 1);
    nextEntries.splice(Math.min(requestedOrder, nextEntries.length), 0, nextEntry);
    onChange(nextEntries.map((entry, index) => ({ ...entry, display_order: index })));
    setDraft(null);
    setEditingIndex(-1);
  };

  const removeEntry = (index) => {
    const entry = entries[index];
    if (!window.confirm(`Remove ${entry.person_name} from ${title.toLowerCase()}?`)) return;
    onChange(entries.filter((_, entryIndex) => entryIndex !== index)
      .map((person, order) => ({ ...person, display_order: order })));
    if (editingIndex === index) {
      setDraft(null);
      setEditingIndex(-1);
    }
  };

  const moveEntry = (from, to) => onChange(reorder(entries, from, to));
  const endDrag = (event, toIndex) => {
    event.preventDefault();
    if (dragIndex >= 0 && dragIndex !== toIndex) moveEntry(dragIndex, toIndex);
    setDragIndex(-1);
  };

  return (
    <section className="admin-credit-section">
      <div className="admin-credit-heading">
        <div><strong>{title}</strong><small>{entries.length} {entries.length === 1 ? 'person' : 'people'}</small></div>
        <button type="button" className="admin-button admin-button-secondary" onClick={openNew}>
          <Plus size={16} /> Add {isCast ? 'Cast Member' : 'Crew Member'}
        </button>
      </div>

      {draft && (
        <div className="admin-credit-form">
          <div className="admin-credit-photo">
            {draft.imagePreview ? <CropImage src={draft.imagePreview} alt="Profile preview" /> : <ImagePlus size={24} />}
            <div className="admin-credit-image-link">
              <label><span>Profile image link</span>
                <input
                  type="url"
                  value={draft.imageFile ? '' : (draft.image_url || '')}
                  placeholder="https://..."
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    setDraft((current) => ({
                      ...current,
                      image_url: value,
                      storage_path: value.startsWith('http') ? '' : current.storage_path,
                      imageFile: null,
                      imagePreview: value,
                      removeImage: !value,
                    }));
                    setImageLinkError('');
                  }}
                  onBlur={() => {
                    const value = draft.image_url || '';
                    if (value && !/^https?:\/\/\S+$/i.test(value)) {
                      setImageLinkError('Enter a valid http or https image link.');
                    }
                  }}
                />
              </label>
              {imageLinkError && <small className="admin-credit-image-error" role="alert">{imageLinkError}</small>}
            </div>
            <label className="admin-button admin-button-secondary">
              <ImagePlus size={15} /> {draft.imageFile ? 'Replace upload' : 'Upload image'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />
            </label>
            {draft.imagePreview && <ImageCropButton source={draft.imagePreview} label="cast or crew profile image" aspectRatio="1:1" />}
            {(draft.imagePreview || draft.image_url) && (
              <button type="button" className="admin-credit-remove-image" onClick={() => {
                setDraft((current) => ({
                  ...current, image_url: '', storage_path: '', imagePreview: '', imageFile: null, removeImage: true,
                }));
                setImageLinkError('');
              }}>Remove image</button>
            )}
          </div>
          <div className="admin-credit-fields">
            <label><span>{isCast ? 'Actor / Actress name' : 'Person name'} *</span>
              <input autoFocus value={draft.person_name} onChange={(event) => setDraft((current) => ({ ...current, person_name: event.target.value }))} required />
            </label>
            {isCast ? (
              <label><span>Character name</span>
                <input value={draft.character_name} onChange={(event) => setDraft((current) => ({ ...current, character_name: event.target.value }))} />
              </label>
            ) : (
              <>
                <label><span>Department *</span>
                  <input list={`credit-departments-${kind}`} value={draft.department} onChange={(event) => setDraft((current) => ({ ...current, department: event.target.value }))} required />
                  <datalist id={`credit-departments-${kind}`}>{DEPARTMENTS.map((department) => <option key={department} value={department} />)}</datalist>
                </label>
                <label><span>Job / role</span>
                  <input value={draft.job} onChange={(event) => setDraft((current) => ({ ...current, job: event.target.value }))} placeholder="e.g. Director of Photography" />
                </label>
              </>
            )}
            <label><span>Display order</span>
              <input type="number" min="1" value={Number(draft.display_order) + 1} onChange={(event) => {
                const targetOrder = Math.max(1, Number(event.target.value || 1)) - 1;
                setDraft((current) => ({ ...current, display_order: targetOrder }));
              }} />
            </label>
          </div>
          <div className="admin-credit-form-actions">
            <button type="button" className="admin-button admin-button-secondary" onClick={() => { setDraft(null); setEditingIndex(-1); }}><X size={15} /> Cancel</button>
            <button type="button" className="admin-button admin-button-primary" onClick={saveDraft} disabled={Boolean(imageLinkError || (draft.image_url && !/^https?:\/\/\S+$/i.test(draft.image_url)))}><Save size={15} /> {editingIndex >= 0 ? 'Save changes' : `Add ${isCast ? 'cast member' : 'crew member'}`}</button>
          </div>
        </div>
      )}

      {entries.length ? (
        <div className="admin-credit-list">
          {entries.map((entry, index) => (
            <article
              className={`admin-credit-item ${dragIndex === index ? 'is-dragging' : ''}`}
              key={entry.id || entry.local_id || `${kind}-${index}-${entry.person_name}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => endDrag(event, index)}
              onDragEnd={() => setDragIndex(-1)}
            >
              <span className="admin-credit-grip" aria-label="Drag to reorder" title="Drag to reorder">⋮⋮</span>
              {entry.imagePreview || entry.image_url ? (
                <CropImage className="admin-credit-avatar" src={entry.imagePreview || entry.image_url} alt="" />
              ) : (
                <span className="admin-credit-avatar is-empty"><ImagePlus size={18} /></span>
              )}
              <div className="admin-credit-person">
                <strong>{entry.person_name}</strong>
                <span>{isCast ? (entry.character_name || 'Actor') : [entry.department, entry.job].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="admin-credit-item-actions">
                <button type="button" title="Move up" aria-label={`Move ${entry.person_name} up`} disabled={index === 0} onClick={() => moveEntry(index, index - 1)}><ArrowUp size={15} /></button>
                <button type="button" title="Move down" aria-label={`Move ${entry.person_name} down`} disabled={index === entries.length - 1} onClick={() => moveEntry(index, index + 1)}><ArrowDown size={15} /></button>
                <button type="button" title="Edit" aria-label={`Edit ${entry.person_name}`} onClick={() => openEdit(entry, index)}><Pencil size={15} /></button>
                <button type="button" title="Delete" aria-label={`Delete ${entry.person_name}`} onClick={() => removeEntry(index)}><Trash2 size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : !draft ? <p className="admin-credit-empty">No {title.toLowerCase()} added yet.</p> : null}
    </section>
  );
};

const CastCrewEditor = ({ cast, crew, onCastChange, onCrewChange, showCast = true }) => (
  <div className="admin-credit-manager">
    {showCast && <CreditList kind="cast" title="Cast" entries={cast} onChange={onCastChange} />}
    <CreditList kind="crew" title="Crew" entries={crew} onChange={onCrewChange} />
  </div>
);

export default CastCrewEditor;
