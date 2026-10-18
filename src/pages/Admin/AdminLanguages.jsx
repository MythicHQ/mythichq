import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, RotateCcw, Save } from 'lucide-react';
import CropImage from '../../components/CropImage';
import ImageCropButton from '../../components/ImageCropButton';
import { usePublicCatalog } from '../../hooks/usePublicCatalog';
import { getLanguagesFromMovies } from '../../services/languageCatalog';
import { fetchLanguageCardImages, resetLanguageCardImage, saveLanguageCardImage, subscribeToLanguageCardImages } from '../../services/languageCardImages';
import { copyImageCropSettings } from '../../services/imageCrops';
import { useAuth } from './AuthContext';
import '../../styles/admin.css';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const AdminLanguagesPage = () => {
  const { user } = useAuth();
  const { movies, loading: catalogLoading } = usePublicCatalog();
  const languages = getLanguagesFromMovies(movies);
  const [images, setImages] = useState({});
  const [files, setFiles] = useState({});
  const [imageLinks, setImageLinks] = useState({});
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState(null);
  const [resettingSlug, setResettingSlug] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const previewsRef = useRef(previews);

  useEffect(() => { previewsRef.current = previews; }, [previews]);

  const refreshImages = useCallback(async () => {
    try {
      const next = await fetchLanguageCardImages({ requireTable: true });
      setImages(next);
      setLoadError('');
      return next;
    } catch (error) {
      setLoadError(error.message || 'Unable to load language card images.');
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await refreshImages();
      if (active) setLoading(false);
    };
    void load();
    const unsubscribe = subscribeToLanguageCardImages(() => { void refreshImages(); });
    return () => {
      active = false;
      unsubscribe();
      Object.values(previewsRef.current).forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
    };
  }, [refreshImages]);

  const clearPreview = (slug) => {
    const previous = previewsRef.current[slug];
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
    setPreviews((current) => { const next = { ...current }; delete next[slug]; return next; });
    setFiles((current) => { const next = { ...current }; delete next[slug]; return next; });
    setImageLinks((current) => { const next = { ...current }; delete next[slug]; return next; });
  };

  const handleFileChange = (slug, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setActionError('');
    setSuccessMessage('');
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setActionError('Choose a PNG, JPEG, or WebP image.'); return; }
    if (file.size > MAX_IMAGE_SIZE) { setActionError('Language images must be 5 MB or smaller.'); return; }
    clearPreview(slug);
    setFiles((current) => ({ ...current, [slug]: file }));
    setPreviews((current) => ({ ...current, [slug]: URL.createObjectURL(file) }));
  };

  const handleImageLinkChange = (slug, value) => {
    clearPreview(slug);
    setActionError('');
    setSuccessMessage('');
    setImageLinks((current) => ({ ...current, [slug]: value }));
    try {
      const parsed = new URL(value.trim());
      if (['http:', 'https:'].includes(parsed.protocol)) setPreviews((current) => ({ ...current, [slug]: parsed.href }));
    } catch { /* Invalid links are reported when the admin saves them. */ }
  };

  const handleSave = async (language) => {
    const file = files[language.slug];
    const imageUrl = imageLinks[language.slug]?.trim();
    if (!file && !imageUrl) return;
    setSavingSlug(language.slug); setActionError(''); setSuccessMessage('');
    try {
      const saved = await saveLanguageCardImage({ languageSlug: language.slug, file, imageUrl, userId: user?.id, previousImage: images[language.slug] });
      if (previews[language.slug]?.startsWith('blob:')) await copyImageCropSettings(previews[language.slug], saved.image_url);
      setImages((current) => ({ ...current, [language.slug]: saved }));
      clearPreview(language.slug);
      setSuccessMessage(`${language.name} background image saved.`);
    } catch (error) { setActionError(error.message || `Unable to save the ${language.name} image.`); }
    finally { setSavingSlug(null); }
  };

  const handleReset = async (language) => {
    if (files[language.slug] || imageLinks[language.slug]?.trim()) { clearPreview(language.slug); return; }
    const currentImage = images[language.slug];
    if (!currentImage) return;
    if (!window.confirm(`Remove the custom ${language.name} image and restore its default card background?`)) return;
    setResettingSlug(language.slug); setActionError(''); setSuccessMessage('');
    try {
      await resetLanguageCardImage(language.slug, currentImage);
      setImages((current) => { const next = { ...current }; delete next[language.slug]; return next; });
      setSuccessMessage(`${language.name} is using its default background.`);
    } catch (error) { setActionError(error.message || `Unable to reset the ${language.name} image.`); }
    finally { setResettingSlug(null); }
  };

  const handleRefresh = async () => { setLoading(true); await refreshImages(); setLoading(false); };

  return (
    <div className="admin-page-shell browse-category-admin-page">
      <div className="admin-header-row">
        <div><p className="admin-kicker">Appearance</p><h1>Languages</h1><p className="admin-header-copy">Manage language card backgrounds. Names, order, and movie listings come from the existing catalog.</p></div>
        <button type="button" className="admin-button admin-button-secondary" onClick={() => void handleRefresh()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </div>
      {actionError && <p className="browse-category-feedback is-error" role="alert">{actionError}</p>}
      {successMessage && <p className="browse-category-feedback is-success" role="status">{successMessage}</p>}
      {loadError && <p className="browse-category-feedback is-error" role="alert">{loadError}</p>}
      {loading || catalogLoading ? <div className="browse-category-loading"><span className="accounts-loading-mark" /><strong>Loading languages…</strong></div> : languages.length ? (
        <div className="browse-category-admin-grid">
          {languages.map((language) => {
            const image = images[language.slug];
            const pending = Boolean(files[language.slug] || imageLinks[language.slug]?.trim());
            const preview = previews[language.slug] || image?.image_url || language.poster;
            const isSaving = savingSlug === language.slug;
            const isResetting = resettingSlug === language.slug;
            return (
              <article className="browse-category-admin-card" key={language.slug}>
                <div className="browse-category-admin-preview">
                  {preview && <CropImage src={preview} alt="" className="browse-category-admin-preview-image" />}
                  <span>{language.name}</span>{previews[language.slug] && <small>Unsaved preview</small>}
                </div>
                <div className="browse-category-admin-card-body">
                  <div className="browse-category-admin-title"><strong>{language.name}</strong><span className={image ? 'is-custom' : ''}>{image ? 'Custom image' : 'Default image'}</span></div>
                  <div className="browse-category-admin-actions">
                    <label className="admin-button admin-button-secondary browse-category-upload"><ImagePlus size={15} /> {image ? 'Change image' : 'Upload image'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleFileChange(language.slug, event)} disabled={isSaving || isResetting} aria-label={`Upload background image for ${language.name}`} />
                    </label>
                    {!isSaving && !isResetting && preview && <ImageCropButton source={previews[language.slug] || image?.image_url || language.poster} label={`${language.name} background`} aspectRatio="16:9" />}
                    <input className="browse-category-image-url" type="url" value={imageLinks[language.slug] || ''} onChange={(event) => handleImageLinkChange(language.slug, event.target.value)} placeholder="Or paste a public image URL" aria-label={`Image URL for ${language.name}`} disabled={isSaving || isResetting} />
                    {pending && <button type="button" className="admin-button admin-button-primary" onClick={() => void handleSave(language)} disabled={isSaving || isResetting}><Save size={15} /> {isSaving ? 'Saving…' : 'Save changes'}</button>}
                    {(image || pending) && <button type="button" className="admin-button admin-button-secondary browse-category-reset" onClick={() => void handleReset(language)} disabled={isSaving || isResetting}><RotateCcw size={14} /> {isResetting ? 'Resetting…' : pending ? 'Reset preview' : 'Remove image · Reset to default'}</button>}
                  </div>
                  {isSaving && <div className="browse-category-progress" role="progressbar" aria-label={`Saving ${language.name} image`}><span /></div>}
                  <p className="browse-category-hint">Upload PNG, JPEG, or WebP up to 5 MB, or paste a public image URL.</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className="browse-category-loading"><strong>No languages found in the current catalog.</strong></div>}
    </div>
  );
};

export default AdminLanguagesPage;
