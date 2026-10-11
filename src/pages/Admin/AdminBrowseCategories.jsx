import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, RotateCcw, Save } from 'lucide-react';
import CropImage from '../../components/CropImage';
import ImageCropButton from '../../components/ImageCropButton';
import { BROWSE_CATEGORIES } from '../../data/browseCategories';
import { useAuth } from './AuthContext';
import { fetchBrowseCategoryImages, resetBrowseCategoryImage, saveBrowseCategoryImage, subscribeToBrowseCategoryImages } from '../../services/browseCategoryImages';
import { copyImageCropSettings } from '../../services/imageCrops';
import '../../styles/admin.css';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const AdminBrowseCategoriesPage = () => {
  const { user } = useAuth();
  const [images, setImages] = useState({});
  const [files, setFiles] = useState({});
  const [imageLinks, setImageLinks] = useState({});
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const previewsRef = useRef(previews);

  useEffect(() => { previewsRef.current = previews; }, [previews]);

  const refreshImages = useCallback(async () => {
    try {
      const nextImages = await fetchBrowseCategoryImages({ requireTable: true });
      setImages(nextImages);
      setLoadError('');
      return nextImages;
    } catch (error) {
      setLoadError(error.message || 'Unable to load Browse category images.');
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
    const unsubscribe = subscribeToBrowseCategoryImages(() => { void refreshImages(); });
    return () => {
      active = false;
      unsubscribe();
      Object.values(previewsRef.current).forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
    };
  }, [refreshImages]);

  const clearPreview = (categoryId) => {
    const previousPreview = previewsRef.current[categoryId];
    if (previousPreview?.startsWith('blob:')) URL.revokeObjectURL(previousPreview);
    setPreviews((current) => {
      const next = { ...current };
      delete next[categoryId];
      return next;
    });
    setFiles((current) => {
      const next = { ...current };
      delete next[categoryId];
      return next;
    });
    setImageLinks((current) => { const next = { ...current }; delete next[categoryId]; return next; });
  };

  const handleFileChange = (categoryId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setActionError('');
    setSuccessMessage('');
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setActionError('Choose a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setActionError('Category images must be 5 MB or smaller.');
      return;
    }
    clearPreview(categoryId);
    const previewUrl = URL.createObjectURL(file);
    setFiles((current) => ({ ...current, [categoryId]: file }));
    setPreviews((current) => ({ ...current, [categoryId]: previewUrl }));
  };

  const handleImageLinkChange = (categoryId, value) => {
    clearPreview(categoryId);
    setActionError('');
    setSuccessMessage('');
    setImageLinks((current) => ({ ...current, [categoryId]: value }));
    try {
      const parsed = new URL(value.trim());
      if (['http:', 'https:'].includes(parsed.protocol)) setPreviews((current) => ({ ...current, [categoryId]: parsed.href }));
    } catch { /* Invalid links are reported when the admin saves them. */ }
  };

  const handleSave = async (category) => {
    const file = files[category.id];
    const imageUrl = imageLinks[category.id]?.trim();
    if (!file && !imageUrl) return;
    setSavingId(category.id);
    setActionError('');
    setSuccessMessage('');
    try {
      const savedImage = await saveBrowseCategoryImage({
        categoryId: category.id,
        file,
        imageUrl,
        userId: user?.id,
        previousImage: images[category.id],
      });
      if (previews[category.id]?.startsWith('blob:')) await copyImageCropSettings(previews[category.id], savedImage.image_url);
      setImages((current) => ({ ...current, [category.id]: savedImage }));
      clearPreview(category.id);
      setSuccessMessage(`${category.name} background image saved.`);
    } catch (error) {
      setActionError(error.message || `Unable to save the ${category.name} image.`);
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = async (category) => {
    if (files[category.id] || imageLinks[category.id]?.trim()) {
      clearPreview(category.id);
      return;
    }
    if (!images[category.id]) {
      return;
    }
    if (!window.confirm(`Remove the custom ${category.name} image and restore its default Browse background?`)) return;

    setResettingId(category.id);
    setActionError('');
    setSuccessMessage('');
    try {
      await resetBrowseCategoryImage(category.id, images[category.id]);
      setImages((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
      clearPreview(category.id);
      setSuccessMessage(`${category.name} is using its default background.`);
    } catch (error) {
      setActionError(error.message || `Unable to reset the ${category.name} image.`);
    } finally {
      setResettingId(null);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await refreshImages();
    setLoading(false);
  };

  return (
    <div className="admin-page-shell browse-category-admin-page">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Appearance</p>
          <h1>Browse Categories</h1>
          <p className="admin-header-copy">Manage category background images. Category names and order come from the Browse section.</p>
        </div>
        <button type="button" className="admin-button admin-button-secondary" onClick={() => void handleRefresh()} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {actionError && <p className="browse-category-feedback is-error" role="alert">{actionError}</p>}
      {successMessage && <p className="browse-category-feedback is-success" role="status">{successMessage}</p>}
      {loadError && <p className="browse-category-feedback is-error" role="alert">{loadError}</p>}

      {loading ? (
        <div className="browse-category-loading"><span className="accounts-loading-mark" /><strong>Loading Browse categories…</strong></div>
      ) : (
        <div className="browse-category-admin-grid">
          {BROWSE_CATEGORIES.map((category) => {
            const currentImage = images[category.id];
            const hasPendingFile = Boolean(files[category.id] || imageLinks[category.id]?.trim());
            const imageUrl = previews[category.id] || currentImage?.image_url || category.bg;
            const isSaving = savingId === category.id;
            const isResetting = resettingId === category.id;

            return (
              <article className="browse-category-admin-card" key={category.id}>
                <div className="browse-category-admin-preview">
                  <CropImage src={imageUrl} alt="" className="browse-category-admin-preview-image" />
                  <span>{category.name}</span>
                  {previews[category.id] && <small>Unsaved preview</small>}
                </div>
                <div className="browse-category-admin-card-body">
                  <div className="browse-category-admin-title">
                    <strong>{category.name}</strong>
                    <span className={currentImage ? 'is-custom' : ''}>{currentImage ? 'Custom image' : 'Default image'}</span>
                  </div>
                  <div className="browse-category-admin-actions">
                    <label className="admin-button admin-button-secondary browse-category-upload">
                      <ImagePlus size={15} /> {currentImage ? 'Change image' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => handleFileChange(category.id, event)}
                        disabled={isSaving || isResetting}
                        aria-label={`Upload background image for ${category.name}`}
                      />
                    </label>
                    {!isSaving && !isResetting && <ImageCropButton source={previews[category.id] || currentImage?.image_url || category.bg} label={`${category.name} background`} aspectRatio="16:9" />}
                    <input
                      className="browse-category-image-url"
                      type="url"
                      value={imageLinks[category.id] || ''}
                      onChange={(event) => handleImageLinkChange(category.id, event.target.value)}
                      placeholder="Or paste a public image URL"
                      aria-label={`Image URL for ${category.name}`}
                      disabled={isSaving || isResetting}
                    />
                    {hasPendingFile && (
                      <button type="button" className="admin-button admin-button-primary" onClick={() => void handleSave(category)} disabled={isSaving || isResetting}>
                        <Save size={15} /> {isSaving ? 'Saving…' : 'Save changes'}
                      </button>
                    )}
                    {(currentImage || hasPendingFile) && (
                      <button type="button" className="admin-button admin-button-secondary browse-category-reset" onClick={() => void handleReset(category)} disabled={isSaving || isResetting}>
                        <RotateCcw size={14} /> {isResetting ? 'Resetting…' : hasPendingFile ? 'Reset preview' : 'Remove image · Reset to default'}
                      </button>
                    )}
                  </div>
                  {isSaving && <div className="browse-category-progress" role="progressbar" aria-label={`Saving ${category.name} image`}><span /></div>}
                  <p className="browse-category-hint">Upload PNG, JPEG, or WebP up to 5 MB, or paste a public image URL.</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminBrowseCategoriesPage;
