import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, ImagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import CropImage from '../../components/CropImage';
import ImageCropButton from '../../components/ImageCropButton';
import { StudioCard } from '../../components/StudioCard';
import { createStudioSlug, deleteStudio, fetchStudios, saveStudio, saveStudioSettings, subscribeToStudios } from '../../services/studios';
import { useAuth } from './AuthContext';

const blank = () => ({ name: '', slug: '', description: '', website_url: '', background_color: '#171a24', overlay_opacity: '0.48', logo_position: 'center', text_position: 'left', display_order: 0, is_featured: true, is_active: true });
const MAX_SIZE = 8 * 1024 * 1024;

const AdminStudiosPage = () => {
  const { user } = useAuth();
  const [studios, setStudios] = useState([]);
  const [settings, setSettings] = useState({ featured_limit: 6 });
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [imageUrls, setImageUrls] = useState({});
  const [removedAssets, setRemovedAssets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const formRef = useRef(null);

  const load = useCallback(async () => { const next = await fetchStudios({ includeInactive: true }); setStudios(next.studios); setSettings(next.settings); }, []);
  useEffect(() => { let active = true; const refresh = () => load().catch((loadError) => { if (active) setError(loadError.message || 'Unable to load studios.'); }); void refresh().finally(() => { if (active) setLoading(false); }); const unsubscribe = subscribeToStudios(refresh); return () => { active = false; unsubscribe(); }; }, [load]);

  const clearPreviews = () => Object.values(previews).forEach((url) => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); });
  const reset = () => { clearPreviews(); setForm(blank()); setFiles({}); setPreviews({}); setImageUrls({}); setRemovedAssets({}); setEditing(null); };
  const beginEdit = (studio) => { clearPreviews(); setEditing(studio); setFiles({}); setPreviews({}); setImageUrls({ logo: studio.logo_path ? '' : studio.logo_url || '', background: studio.background_path ? '' : studio.background_url || '' }); setRemovedAssets({}); setForm({ name: studio.name, slug: studio.slug, description: studio.description || '', website_url: studio.website_url || '', background_color: studio.background_color || '#171a24', overlay_opacity: String(studio.overlay_opacity ?? 0.48), logo_position: studio.logo_position || 'center', text_position: studio.text_position || 'left', display_order: studio.display_order || 0, is_featured: studio.is_featured, is_active: studio.is_active }); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const chooseFile = (key, event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > MAX_SIZE) { setError('Choose a PNG, JPEG, or WebP image that is 8 MB or smaller.'); return; } if (previews[key]?.startsWith('blob:')) URL.revokeObjectURL(previews[key]); setError(''); setFiles((current) => ({ ...current, [key]: file })); setPreviews((current) => ({ ...current, [key]: URL.createObjectURL(file) })); setImageUrls((current) => ({ ...current, [key]: '' })); setRemovedAssets((current) => ({ ...current, [key]: false })); };
  const updateImageUrl = (key, value) => { if (previews[key]?.startsWith('blob:')) URL.revokeObjectURL(previews[key]); setPreviews((current) => ({ ...current, [key]: '' })); setFiles((current) => ({ ...current, [key]: null })); setImageUrls((current) => ({ ...current, [key]: value })); setRemovedAssets((current) => ({ ...current, [key]: false })); };
  const removeImage = (key) => { if (previews[key]?.startsWith('blob:')) URL.revokeObjectURL(previews[key]); setFiles((current) => ({ ...current, [key]: null })); setPreviews((current) => ({ ...current, [key]: '' })); setImageUrls((current) => ({ ...current, [key]: '' })); setRemovedAssets((current) => ({ ...current, [key]: true })); };
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); setMessage(''); try { const saved = await saveStudio({ values: form, files, imageUrls, cropSources: previews, previous: editing, userId: user?.id, removeAssets: removedAssets }); await load(); reset(); setMessage(`${saved.name} saved successfully.`); if (saved.cropWarning) setError(saved.cropWarning); } catch (saveError) { setError(saveError.message || 'Unable to save this studio.'); } finally { setSaving(false); } };
  const remove = async (studio) => { if (!window.confirm(`Delete “${studio.name}” and its saved images?`)) return; setBusyId(studio.id); setError(''); try { await deleteStudio(studio); await load(); if (editing?.id === studio.id) reset(); setMessage(`${studio.name} deleted.`); } catch (deleteError) { setError(deleteError.message || 'Unable to delete studio.'); } finally { setBusyId(null); } };
  const move = async (studio, amount) => { const target = Math.max(0, Number(studio.display_order || 0) + amount); setBusyId(studio.id); try { await saveStudio({ values: { ...studio, display_order: target }, files: {}, previous: studio, userId: user?.id }); await load(); } catch (moveError) { setError(moveError.message || 'Unable to update display order.'); } finally { setBusyId(null); } };
  const updateLimit = async (value) => { setBusyId('settings'); setError(''); try { const saved = await saveStudioSettings(value); setSettings(saved); } catch (settingsError) { setError(settingsError.message || 'Unable to save homepage settings.'); } finally { setBusyId(null); } };
  const previewStudio = { ...form, logo_url: previews.logo || imageUrls.logo || (removedAssets.logo ? '' : editing?.logo_url), background_url: previews.background || imageUrls.background || (removedAssets.background ? '' : editing?.background_url) };
  const imageInput = (key, title, property) => {
    const source = previews[key] || imageUrls[key] || (removedAssets[key] ? '' : editing?.[property]);
    return (
      <div className="studio-admin-image-field">
        <label className="studio-admin-image-input">
          <span>{title}</span>
          <div>{source ? <CropImage src={source} alt="" /> : <ImagePlus size={23} />}</div>
          <strong>{files[key]?.name || (source ? 'Image ready' : 'Upload image')}</strong>
          <small>PNG, JPEG, or WebP · max 8 MB</small>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseFile(key, event)} />
        </label>
        {source && <ImageCropButton source={source} label={`${form.name || 'Studio'} ${title.toLowerCase()}`} aspectRatio={key === 'background' ? '16:9' : 'original'} className="studio-crop-trigger" />}
        <label className="studio-image-url-field">
          <span>Or use an image link</span>
          <input type="url" value={imageUrls[key] || ''} onChange={(event) => updateImageUrl(key, event.target.value)} placeholder="https://example.com/image.png" />
        </label>
        {source && <button type="button" className="admin-button admin-button-secondary studio-image-remove" onClick={() => removeImage(key)}>Remove {title.toLowerCase()}</button>}
      </div>
    );
  };

  return <div className="admin-page-shell studios-admin-page"><div className="admin-header-row"><div><p className="admin-kicker">Homepage collections</p><h1>Studios Management</h1><p className="admin-header-copy">Manage studio cards, imagery, order, and visibility across MythicHQ.</p></div><a className="admin-button admin-button-secondary" href="/studios" target="_blank" rel="noreferrer"><Eye size={15} /> View studios</a></div>
    {error && <p className="studios-admin-feedback is-error" role="alert">{error}</p>}{message && <p className="studios-admin-feedback is-success" role="status">{message}</p>}
    <section className="studios-home-settings"><div><strong>Homepage studio cards</strong><span>Show up to 4, 5, or 6 featured and active studios.</span></div><label><span>Cards shown</span><select value={settings.featured_limit} onChange={(event) => void updateLimit(event.target.value)} disabled={busyId === 'settings'}><option value="4">4 studios</option><option value="5">5 studios</option><option value="6">6 studios</option></select></label></section>
    <form ref={formRef} className="studio-admin-form" onSubmit={submit}><div className="studio-admin-form-heading"><div><span><Plus size={16} /></span><div><strong>{editing ? `Edit ${editing.name}` : 'Add a studio'}</strong><small>Changes are reflected on the homepage automatically.</small></div></div>{editing && <button type="button" className="admin-button admin-button-secondary" onClick={reset}><X size={15} /> Cancel</button>}</div>
      <div className="studio-admin-form-layout"><div className="studio-admin-fields"><label><span>Studio name *</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, ...(editing ? {} : { slug: createStudioSlug(event.target.value) }) }))} placeholder="e.g. Marvel Studios" /></label><label><span>URL slug *</span><input required value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: createStudioSlug(event.target.value) }))} /></label><label className="studio-span-all"><span>Description</span><textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="A short studio introduction." /></label><label className="studio-span-all"><span>Website URL (optional)</span><input type="url" value={form.website_url} onChange={(event) => setForm((current) => ({ ...current, website_url: event.target.value }))} placeholder="https://studio.example" /></label><label><span>Display order</span><input type="number" min="0" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} /></label><label><span>Background color</span><input type="color" value={form.background_color} onChange={(event) => setForm((current) => ({ ...current, background_color: event.target.value }))} /></label><label><span>Overlay opacity</span><input type="range" min="0" max="0.9" step="0.05" value={form.overlay_opacity} onChange={(event) => setForm((current) => ({ ...current, overlay_opacity: event.target.value }))} /><small>{Math.round(Number(form.overlay_opacity) * 100)}%</small></label><label><span>Logo position</span><select value={form.logo_position} onChange={(event) => setForm((current) => ({ ...current, logo_position: event.target.value }))}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label><span>Text position</span><select value={form.text_position} onChange={(event) => setForm((current) => ({ ...current, text_position: event.target.value }))}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><div className="studio-admin-checks"><label><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm((current) => ({ ...current, is_featured: event.target.checked }))} /> Featured on homepage</label><label><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /> Enabled</label></div></div><div className="studio-admin-media">{imageInput('logo', 'Studio logo', 'logo_url')}{imageInput('background', 'Background image', 'background_url')}</div></div>
      <div className="studio-admin-preview"><span>LIVE CARD PREVIEW</span><StudioCard studio={previewStudio} compact /></div><div className="studio-admin-actions"><button type="button" className="admin-button admin-button-secondary" onClick={reset}>Reset</button><button type="submit" className="admin-button admin-button-primary" disabled={saving}>{saving ? 'Saving…' : <><Save size={15} /> {editing ? 'Save changes' : 'Add studio'}</>}</button></div>
    </form>
    <section className="studio-admin-list-section"><div className="studio-admin-list-heading"><div><p className="admin-kicker">Studio library</p><h2>All studios</h2></div><span>{studios.length} total</span></div>{loading ? <p className="studios-loading">Loading studios…</p> : <div className="studio-admin-list">{studios.map((studio) => <article key={studio.id} className="studio-admin-list-item"><div className="studio-admin-list-art" style={{ background: studio.background_color }}>{studio.background_url && <CropImage src={studio.background_url} alt="" />}{studio.logo_url && <CropImage src={studio.logo_url} alt="" />}</div><div className="studio-admin-list-copy"><h3>{studio.name}</h3><p>Order {studio.display_order} · {studio.is_featured ? 'Featured' : 'Not featured'} · {studio.is_active ? 'Enabled' : 'Disabled'}</p></div><div className="studio-admin-list-actions"><button type="button" className="admin-button admin-button-secondary" onClick={() => void move(studio, -1)} disabled={busyId === studio.id}><ChevronUp size={14} /></button><button type="button" className="admin-button admin-button-secondary" onClick={() => void move(studio, 1)} disabled={busyId === studio.id}><ChevronDown size={14} /></button><button type="button" className="admin-button admin-button-secondary" onClick={() => beginEdit(studio)}><Pencil size={14} /> Edit</button><button type="button" className="admin-button admin-button-secondary is-danger" onClick={() => void remove(studio)} disabled={busyId === studio.id}><Trash2 size={14} /> Delete</button></div></article>)}</div>}</section>
  </div>;
};

export default AdminStudiosPage;
