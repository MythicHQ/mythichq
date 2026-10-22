
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ImagePlus,
  Link2,
  LoaderCircle,
  Monitor,
  RefreshCw,
  RotateCcw,
  Save,
  Smartphone,
  Film,
} from 'lucide-react';

import { useAuth } from './AuthContext';

import {
  fetchProfileIntroImages,
  saveProfileIntroImages,
} from '../../services/profileIntroImages';

import '../../styles/admin.css';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const IMAGE_KEYS = ['desktop', 'mobile', 'welcoming'];

const EMPTY_FILES = {
  desktop: null,
  mobile: null,
  welcoming: null,
};

const EMPTY_PREVIEWS = {
  desktop: '',
  mobile: '',
  welcoming: '',
};

const DEVICES = [
  {
    key: 'desktop',
    title: 'Desktop profile intro',
    description: 'Shown on laptops and larger screens.',
    icon: Monitor,
    previewClass: 'is-desktop',
  },
  {
    key: 'mobile',
    title: 'Mobile profile intro',
    description: 'Shown on phones and smaller tablets.',
    icon: Smartphone,
    previewClass: 'is-mobile',
  },
  {
    key: 'welcoming',
    title: 'Welcoming Page Backdrop Image',
    description:
      'Full-page hero artwork on the MythicHQ welcome page.',
    icon: Film,
    previewClass: 'is-welcome',
  },
];

const getImageUrl = (settings, key) =>
  settings?.[`${key}_image_url`] || '';

const createImageLinks = (settings) => ({
  desktop: getImageUrl(settings, 'desktop'),
  mobile: getImageUrl(settings, 'mobile'),
  welcoming: getImageUrl(settings, 'welcoming'),
});

const revokeBlobUrl = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

const AdminProfileIntroImagesPage = () => {
  const { user } = useAuth();

  const [settings, setSettings] = useState(null);
  const [files, setFiles] = useState({ ...EMPTY_FILES });
  const [previews, setPreviews] = useState({ ...EMPTY_PREVIEWS });
  const [imageLinks, setImageLinks] = useState({
    desktop: '',
    mobile: '',
    welcoming: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const dirty = useMemo(
    () =>
      IMAGE_KEYS.some(
        (key) =>
          Boolean(files[key]) ||
          imageLinks[key] !== getImageUrl(settings, key)
      ),
    [files, imageLinks, settings]
  );

  const refreshSettings = useCallback(async () => {
    try {
      const saved = await fetchProfileIntroImages();

      setSettings(saved);
      setImageLinks(createImageLinks(saved));
      setLoadError('');

      return saved;
    } catch (error) {
      setLoadError(
        error?.message ||
          'Unable to load Profile Intro Images.'
      );

      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await refreshSettings();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [refreshSettings]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach(revokeBlobUrl);
    };
  }, [previews]);

  useEffect(() => {
    if (!dirty) return undefined;

    const warnAboutUnsaved = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener(
      'beforeunload',
      warnAboutUnsaved
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        warnAboutUnsaved
      );
    };
  }, [dirty]);

  const discardFile = (device) => {
    setFiles((current) => ({
      ...current,
      [device]: null,
    }));

    setPreviews((current) => {
      revokeBlobUrl(current[device]);

      return {
        ...current,
        [device]: '',
      };
    });
  };

  const handleFileChange = (device, event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = '';

    setActionError('');
    setSuccessMessage('');

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setActionError(
        'Choose a PNG, JPEG, or WebP image.'
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setActionError(
        'Profile intro images must be 8 MB or smaller.'
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setFiles((current) => ({
      ...current,
      [device]: file,
    }));

    setPreviews((current) => {
      revokeBlobUrl(current[device]);

      return {
        ...current,
        [device]: previewUrl,
      };
    });

    // Clear the URL because the uploaded file takes priority.
    setImageLinks((current) => ({
      ...current,
      [device]: '',
    }));
  };

  const handleLinkChange = (device, value) => {
    setActionError('');
    setSuccessMessage('');

    discardFile(device);

    setImageLinks((current) => ({
      ...current,
      [device]: value,
    }));
  };

  const handleRemove = (device) => {
    setActionError('');
    setSuccessMessage('');

    const hasPendingFile = Boolean(files[device]);

    if (hasPendingFile) {
      // Discard the pending upload and restore the saved URL.
      discardFile(device);

      setImageLinks((current) => ({
        ...current,
        [device]: getImageUrl(settings, device),
      }));

      return;
    }

    const savedUrl = getImageUrl(settings, device);
    const currentUrl = imageLinks[device];

    if (currentUrl !== savedUrl) {
      // Restore the saved URL when editing an unsaved link.
      setImageLinks((current) => ({
        ...current,
        [device]: savedUrl,
      }));
    } else {
      // Clear the current URL. Saving will remove the image.
      setImageLinks((current) => ({
        ...current,
        [device]: '',
      }));
    }
  };

  const handleDiscardChanges = useCallback(() => {
    Object.values(previews).forEach(revokeBlobUrl);

    setFiles({ ...EMPTY_FILES });
    setPreviews({ ...EMPTY_PREVIEWS });
    setImageLinks(createImageLinks(settings));

    setActionError('');
    setSuccessMessage('');
  }, [previews, settings]);

  const handleSave = async () => {
    if (!dirty || saving) return;

    setSaving(true);
    setActionError('');
    setSuccessMessage('');

    try {
      for (const key of IMAGE_KEYS) {
        const url = imageLinks[key].trim();

        if (
          url &&
          !/^https?:\/\//i.test(url)
        ) {
          throw new Error(
            'Image links must start with http:// or https://.'
          );
        }
      }

      const normalizedLinks = {
        desktop: imageLinks.desktop.trim(),
        mobile: imageLinks.mobile.trim(),
        welcoming: imageLinks.welcoming.trim(),
      };

      const saved = await saveProfileIntroImages({
        files,
        imageLinks: normalizedLinks,
        previous: settings,
        userId: user?.id,
      });

      // Release temporary previews after the save succeeds.
      Object.values(previews).forEach(revokeBlobUrl);

      setSettings(saved);
      setFiles({ ...EMPTY_FILES });
      setPreviews({ ...EMPTY_PREVIEWS });
      setImageLinks(createImageLinks(saved));

      setSuccessMessage(
        'Profile intro images saved successfully.'
      );
    } catch (error) {
      setActionError(
        error?.message ||
          'Unable to save the profile intro images.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (saving || loading) return;

    if (
      dirty &&
      !window.confirm(
        'Discard your unsaved image changes and reload the saved configuration?'
      )
    ) {
      return;
    }

    handleDiscardChanges();

    setLoading(true);
    setActionError('');
    setSuccessMessage('');

    try {
      const saved = await refreshSettings();

      if (saved) {
        setImageLinks(createImageLinks(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page-shell profile-intro-admin-page">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Appearance</p>

          <h1>Profile Intro Images</h1>

          <p className="admin-header-copy">
            Choose the artwork for desktop and mobile profile
            selection and the MythicHQ welcome page.
          </p>
        </div>

        <div className="profile-intro-header-actions">
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={() => void handleRefresh()}
            disabled={loading || saving}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          {dirty && (
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={handleDiscardChanges}
              disabled={saving}
            >
              Discard changes
            </button>
          )}

          <button
            type="button"
            className="admin-button admin-button-primary"
            onClick={() => void handleSave()}
            disabled={!dirty || loading || saving}
          >
            {saving ? (
              <LoaderCircle
                className="viewer-spinner"
                size={15}
              />
            ) : (
              <Save size={15} />
            )}

            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {loadError && (
        <p
          className="browse-category-feedback is-error"
          role="alert"
        >
          {loadError}
        </p>
      )}

      {actionError && (
        <p
          className="browse-category-feedback is-error"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {successMessage && (
        <p
          className="browse-category-feedback is-success"
          role="status"
        >
          {successMessage}
        </p>
      )}

      {loading ? (
        <div className="browse-category-loading">
          <span className="accounts-loading-mark" />
          <strong>
            Loading saved profile artwork…
          </strong>
        </div>
      ) : (
        <div className="profile-intro-admin-grid">
          {DEVICES.map(
            ({
              key,
              title,
              description,
              icon: Icon,
              previewClass,
            }) => {
              const savedUrl = getImageUrl(settings, key);
              const imageUrl =
                previews[key] || imageLinks[key];

              const pending =
                Boolean(files[key]) ||
                imageLinks[key] !== savedUrl;

              const removing =
                Boolean(savedUrl) &&
                !imageLinks[key] &&
                !files[key];

              const status = pending
                ? imageUrl
                  ? 'Unsaved changes'
                  : 'Will be removed when saved'
                : savedUrl
                  ? 'Active image'
                  : 'No image · using fallback';

              return (
                <article
                  className="profile-intro-admin-card"
                  key={key}
                >
                  <div
                    className={`profile-intro-admin-preview ${previewClass}`}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`${title} preview`}
                      />
                    ) : (
                      <div className="profile-intro-admin-empty">
                        <Icon size={27} />

                        <span>
                          {removing
                            ? 'Image will be removed'
                            : 'MythicHQ default background'}
                        </span>
                      </div>
                    )}

                    <span
                      className={`profile-intro-admin-status${
                        pending
                          ? ' is-pending'
                          : savedUrl
                            ? ' is-active'
                            : ''
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="profile-intro-admin-card-body">
                    <div className="profile-intro-admin-card-title">
                      <span className="profile-intro-admin-device-icon">
                        <Icon size={17} />
                      </span>

                      <div>
                        <h2>{title}</h2>
                        <p>{description}</p>
                      </div>
                    </div>

                    <div className="profile-intro-admin-actions">
                      <label className="admin-button admin-button-secondary profile-intro-upload">
                        <ImagePlus size={15} />

                        {savedUrl || files[key]
                          ? 'Replace image'
                          : 'Upload image'}

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) =>
                            handleFileChange(key, event)
                          }
                          disabled={saving}
                          aria-label={`${
                            savedUrl ? 'Replace' : 'Upload'
                          } ${key} profile intro image`}
                        />
                      </label>

                      {(savedUrl ||
                        files[key] ||
                        imageLinks[key]) && (
                        <button
                          type="button"
                          className="admin-button admin-button-secondary"
                          onClick={() => handleRemove(key)}
                          disabled={saving}
                        >
                          <RotateCcw size={14} />

                          {files[key]
                            ? 'Discard upload'
                            : imageLinks[key] !== savedUrl
                              ? 'Undo changes'
                              : 'Remove image'}
                        </button>
                      )}
                    </div>

                    <label className="profile-intro-link-field">
                      <span>
                        <Link2 size={14} />
                        Or use an image link
                      </span>

                      <input
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        placeholder="https://example.com/image.jpg"
                        value={imageLinks[key]}
                        onChange={(event) =>
                          handleLinkChange(
                            key,
                            event.target.value
                          )
                        }
                        disabled={saving}
                        aria-label={`${title} image URL`}
                      />
                    </label>

                    <p className="profile-intro-admin-hint">
                      {key === 'welcoming'
                        ? 'Upload PNG, JPEG, or WebP up to 8 MB, or paste a public HTTP(S) image URL. If removed, the welcome page returns to its current hero artwork.'
                        : 'Upload PNG, JPEG, or WebP up to 8 MB, or paste a public HTTP(S) image URL. The other device image is used as a fallback when this one is missing.'}
                    </p>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}

      {dirty && (
        <p
          className="profile-intro-unsaved-note"
          role="status"
        >
          You have unsaved changes. Save them to publish
          the new profile selection artwork.
        </p>
      )}
    </div>
  );
};

export default AdminProfileIntroImagesPage;
