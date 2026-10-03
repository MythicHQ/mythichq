import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LOCAL_MOVIES } from '../../data/localMovies';
import { fetchAdminMovies } from '../../services/movieCatalog';
import { deleteMovieStorageAsset, uploadMovieAsset } from '../../services/movieStorage';
import { invalidateCache } from '../../services/requestCache';

const AVAILABLE_GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Science Fiction', 'Romance'];
const AVAILABLE_LANGUAGES = ['Kannada', 'English', 'Hindi', 'Telugu', 'Tamil', 'Malayalam', 'Marathi', 'Bengali', 'Punjabi', 'Gujarati', 'Other'];
const buildOttLogoDataUrl = ({ symbol, background, foreground, accent }) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${background}"/>
          <stop offset="100%" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#g)"/>
      <circle cx="48" cy="16" r="8" fill="rgba(255,255,255,0.18)"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="${foreground}" letter-spacing="-1">${symbol}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const OTT_PLATFORM_META = {
  Netflix: { short: 'N', color: '#FFFFFF', background: '#E50914', accent: '#B91C1C', logo: 'https://www.image2url.com/r2/default/images/1790355848446-0c66f76c-cf75-43f1-8f17-e12eada0d657.png' },
  'Prime Video': { short: 'P', color: '#FFFFFF', background: '#1A73E8', accent: '#0F172A', logo: 'https://www.image2url.com/r2/default/images/1790358294504-b3aad16c-b9ce-403b-9951-6dd7db77b23c.png' },
  JioHotstar: { short: 'J', color: '#0F172A', background: '#67E8F9', accent: '#7DD3FC', logo: 'https://www.image2url.com/r2/default/images/1790358540004-d3880f2e-69d3-4652-b70f-15b77cf393c4.png' },
  SonyLIV: { short: 'S', color: '#FFFFFF', background: '#E11D48', accent: '#7F1D1D', logo: 'https://www.image2url.com/r2/default/images/1790358663312-a2ac02f3-9d5e-42b5-bcc4-767cb9f431de.png' },
  ZEE5: { short: 'Z', color: '#FFFFFF', background: '#6D28D9', accent: '#4C1D95', logo: 'https://www.image2url.com/r2/default/images/1790358399019-ba2cfe18-a6b8-4e73-a35f-692fb154f608.png' },
  'Apple TV+': { short: 'A', color: '#111827', background: '#F8FAFC', accent: '#D1D5DB', logo: buildOttLogoDataUrl({ symbol: 'A', background: '#F8FAFC', foreground: '#111827', accent: '#D1D5DB' }) },
  'Disney+ Hotstar': { short: 'D', color: '#FFFFFF', background: '#1D4ED8', accent: '#1E3A8A', logo: buildOttLogoDataUrl({ symbol: 'D', background: '#1D4ED8', foreground: '#FFFFFF', accent: '#1E3A8A' }) },
  'MX Player': { short: 'M', color: '#0F172A', background: '#FBBF24', accent: '#F59E0B', logo: buildOttLogoDataUrl({ symbol: 'M', background: '#FBBF24', foreground: '#0F172A', accent: '#F59E0B' }) },
  Aha: { short: 'A', color: '#FFFFFF', background: '#F97316', accent: '#C2410C', logo: buildOttLogoDataUrl({ symbol: 'A', background: '#F97316', foreground: '#FFFFFF', accent: '#C2410C' }) },
  'Sun NXT': { short: 'S', color: '#FFFFFF', background: '#14B8A6', accent: '#0F766E', logo: buildOttLogoDataUrl({ symbol: 'S', background: '#14B8A6', foreground: '#FFFFFF', accent: '#0F766E' }) },
  'Eros Now': { short: 'E', color: '#FFFFFF', background: '#EC4899', accent: '#9D174D', logo: buildOttLogoDataUrl({ symbol: 'E', background: '#EC4899', foreground: '#FFFFFF', accent: '#9D174D' }) },
  'YouTube Movies': { short: 'YT', color: '#FFFFFF', background: '#FF0000', accent: '#991B1B', logo: buildOttLogoDataUrl({ symbol: 'YT', background: '#FF0000', foreground: '#FFFFFF', accent: '#991B1B' }) },
};
const AVAILABLE_OTT_PLATFORMS = Object.entries(OTT_PLATFORM_META).map(([name, meta]) => ({ name, logo: meta.logo, background: meta.background, color: meta.color }));
const getOttPlatformMeta = (platformName) => {
  const normalizedName = String(platformName || '').trim();
  const fallback = normalizedName ? normalizedName.slice(0, 2).toUpperCase() : 'OT';

  return OTT_PLATFORM_META[normalizedName] || {
    short: fallback,
    color: '#F8FAFC',
    background: '#1F2937',
    accent: '#374151',
    logo: buildOttLogoDataUrl({ symbol: fallback, background: '#1F2937', foreground: '#F8FAFC', accent: '#374151' }),
  };
};

const normalizeOptionValues = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : (item?.name ? item.name.trim() : '')))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const collectUniqueValues = (movies = [], fieldNames = []) => {
  const uniqueValues = new Set();

  movies.forEach((movie) => {
    fieldNames.forEach((fieldName) => {
      normalizeOptionValues(movie?.[fieldName]).forEach((value) => uniqueValues.add(value));
    });
  });

  return [...uniqueValues];
};

const defaultForm = {
  title: '',
  content_type: 'movie',
  description: '',
  poster_url: '',
  backdrop_url: '',
  trailer_url: '',
  genre: '',
  release_date: '',
  director: '',
  cast: '',
  language: 'English',
  ott: '',
  runtime: '120',
  rating: '8.5',
  is_published: true,
};

const AdminMovieFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [form, setForm] = useState(defaultForm);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState(['English']);
  const [selectedOttPlatforms, setSelectedOttPlatforms] = useState([]);
  const [availableGenres, setAvailableGenres] = useState(AVAILABLE_GENRES);
  const [availableLanguages, setAvailableLanguages] = useState(AVAILABLE_LANGUAGES);
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [customLanguageInput, setCustomLanguageInput] = useState('');
  const [customOttInput, setCustomOttInput] = useState('');
  const [showManualGenreInput, setShowManualGenreInput] = useState(false);
  const [showManualLanguageInput, setShowManualLanguageInput] = useState(false);
  const [showManualOttInput, setShowManualOttInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [existingPosterPath, setExistingPosterPath] = useState('');
  const [existingBackdropPath, setExistingBackdropPath] = useState('');
  const [posterFile, setPosterFile] = useState(null);
  const [backdropFile, setBackdropFile] = useState(null);

  useEffect(() => {
    const loadAvailableOptions = async () => {
      try {
        if (!supabase) {
          setAvailableGenres(AVAILABLE_GENRES);
          setAvailableLanguages(AVAILABLE_LANGUAGES);
          return;
        }

        const movies = await fetchAdminMovies();
        const uniqueGenres = collectUniqueValues(movies, ['genre', 'genres']);
        const uniqueLanguages = collectUniqueValues(movies, ['language', 'languages']);

        setAvailableGenres([...new Set([...AVAILABLE_GENRES, ...uniqueGenres])]);
        setAvailableLanguages([...new Set([...AVAILABLE_LANGUAGES, ...uniqueLanguages])]);
      } catch (error) {
        console.error('Failed to load selectable options:', error);
      }
    };

    loadAvailableOptions();
  }, []);

  useEffect(() => {
    const loadMovie = async () => {
      if (!id) return;
      try {
        if (!supabase) {
          const localMovie = LOCAL_MOVIES.find((item) => String(item.id) === String(id));
          if (localMovie) {
            const movieGenres = Array.isArray(localMovie.genre)
              ? localMovie.genre
              : (Array.isArray(localMovie.genres)
                ? localMovie.genres.map((entry) => (typeof entry === 'string' ? entry : entry.name))
                : (typeof localMovie.genre === 'string'
                  ? localMovie.genre.split(',').map((item) => item.trim()).filter(Boolean)
                  : []));

            const movieLanguages = Array.isArray(localMovie.languages)
              ? localMovie.languages
              : (Array.isArray(localMovie.language)
                ? localMovie.language
                : (typeof localMovie.language === 'string'
                  ? localMovie.language.split(',').map((item) => item.trim()).filter(Boolean)
                  : []));

            setSelectedGenres(movieGenres);
            setSelectedLanguages(movieLanguages);
            setForm({
              title: localMovie.title || '',
              content_type: localMovie.content_type || localMovie.media_type || 'movie',
              description: localMovie.overview || '',
              poster_url: localMovie.poster_path || '',
              backdrop_url: localMovie.backdrop_path || '',
              trailer_url: localMovie.trailer_key ? `https://www.youtube.com/watch?v=${localMovie.trailer_key}` : '',
              genre: movieGenres.join(', '),
              release_date: localMovie.release_date || '',
              director: localMovie.director || '',
              cast: Array.isArray(localMovie.cast) ? localMovie.cast.join(', ') : '',
              language: movieLanguages.join(', ') || 'English',
              ott: Array.isArray(localMovie.otts) ? localMovie.otts.join(', ') : (localMovie.ott || ''),
              runtime: String(localMovie.runtime || 120),
              rating: String(localMovie.vote_average || 8.5),
              is_published: true,
            });
          }
          return;
        }

        const { data, error } = await supabase.from('movies').select('*').eq('id', Number(id)).single();
        if (error) throw error;

        const movieGenres = Array.isArray(data.genre)
          ? data.genre
          : (Array.isArray(data.genres)
            ? data.genres.map((entry) => (typeof entry === 'string' ? entry : entry.name))
            : (typeof data.genre === 'string'
              ? data.genre.split(',').map((item) => item.trim()).filter(Boolean)
              : []));

        const movieLanguages = Array.isArray(data.languages)
          ? data.languages
          : (Array.isArray(data.language)
            ? data.language
            : (typeof data.language === 'string'
              ? data.language.split(',').map((item) => item.trim()).filter(Boolean)
              : []));

        setSelectedGenres(movieGenres);
        setSelectedLanguages(movieLanguages);
        const dataOttPlatforms = Array.isArray(data.otts)
          ? data.otts
          : String(data.ott || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
        setSelectedOttPlatforms(dataOttPlatforms);
        setForm({
          title: data.title || '',
          content_type: data.content_type || data.media_type || 'movie',
          description: data.description || '',
          poster_url: data.poster_url || '',
          backdrop_url: data.backdrop_url || '',
          trailer_url: data.trailer_url || '',
          genre: movieGenres.join(', '),
          release_date: data.release_date || '',
          director: data.director || '',
          cast: data.cast || '',
          language: movieLanguages.join(', ') || 'English',
          ott: Array.isArray(data.otts) ? data.otts.join(', ') : (data.ott || ''),
          runtime: String(data.runtime || 120),
          rating: String(data.rating || 8.5),
          is_published: data.is_published !== false,
        });
        setExistingPosterPath(data.poster_url || data.poster_path || '');
        setExistingBackdropPath(data.backdrop_url || data.backdrop_path || '');
      } catch (error) {
        console.error('Failed to load movie:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleGenre = (genre) => {
    setSelectedGenres((current) => {
      const exists = current.includes(genre);
      const nextGenres = exists
        ? current.filter((item) => item !== genre)
        : [...current, genre];

      setForm((prev) => ({ ...prev, genre: nextGenres.join(', ') }));
      return nextGenres;
    });
  };

  const toggleLanguage = (language) => {
    setSelectedLanguages((current) => {
      const exists = current.includes(language);
      const nextLanguages = exists
        ? current.filter((item) => item !== language)
        : [...current, language];

      setForm((prev) => ({ ...prev, language: nextLanguages.join(', ') }));
      return nextLanguages;
    });
  };

  const addCustomGenre = () => {
    const trimmedValue = customGenreInput.trim();

    if (!trimmedValue) {
      return;
    }

    setAvailableGenres((current) => [...new Set([...current, trimmedValue])]);
    setSelectedGenres((current) => {
      const nextGenres = [...new Set([...current, trimmedValue])];
      setForm((prev) => ({ ...prev, genre: nextGenres.join(', ') }));
      return nextGenres;
    });
    setCustomGenreInput('');
    setShowManualGenreInput(false);
  };

  const addCustomLanguage = () => {
    const trimmedValue = customLanguageInput.trim();

    if (!trimmedValue) {
      return;
    }

    setAvailableLanguages((current) => [...new Set([...current, trimmedValue])]);
    setSelectedLanguages((current) => {
      const nextLanguages = [...new Set([...current, trimmedValue])];
      setForm((prev) => ({ ...prev, language: nextLanguages.join(', ') }));
      return nextLanguages;
    });
    setCustomLanguageInput('');
    setShowManualLanguageInput(false);
  };

  const toggleOttPlatform = (platformName) => {
    setSelectedOttPlatforms((current) => {
      const nextPlatforms = current.includes(platformName)
        ? current.filter((platform) => platform !== platformName)
        : [...current, platformName];

      const nextCombinedValue = Array.from(new Set([...nextPlatforms, ...String(form.ott || '').split(',').map((item) => item.trim()).filter(Boolean)])).join(', ');
      setForm((prev) => ({ ...prev, ott: nextCombinedValue }));
      return nextPlatforms;
    });
  };

  const addCustomOttPlatform = () => {
    const trimmedValue = customOttInput.trim();

    if (!trimmedValue) {
      return;
    }

    setSelectedOttPlatforms((current) => {
      const nextPlatforms = Array.from(new Set([...current, trimmedValue]));
      const nextCombinedValue = Array.from(new Set([...nextPlatforms, ...String(form.ott || '').split(',').map((item) => item.trim()).filter(Boolean)])).join(', ');
      setForm((prev) => ({ ...prev, ott: nextCombinedValue }));
      return nextPlatforms;
    });
    setCustomOttInput('');
    setShowManualOttInput(false);
  };

  const handleFileChange = async (event, mediaType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (mediaType === 'poster') {
      setPosterFile(file);
      setForm((current) => ({ ...current, poster_url: URL.createObjectURL(file) }));
    } else {
      setBackdropFile(file);
      setForm((current) => ({ ...current, backdrop_url: URL.createObjectURL(file) }));
    }

    if (!id) {
      event.target.value = '';
      return;
    }

    try {
      if (mediaType === 'poster') {
        setUploadingPoster(true);
      } else {
        setUploadingBackdrop(true);
      }

      const currentPath = mediaType === 'poster' ? existingPosterPath : existingBackdropPath;
      const uploadedPath = await uploadMovieAsset({
        file,
        movieId: Number(id),
        mediaType: mediaType === 'poster' ? 'poster' : 'backdrop',
        currentStoragePath: currentPath,
      });

      const nextValue = uploadedPath || '';
      const fieldName = mediaType === 'poster' ? 'poster_url' : 'backdrop_url';

      setForm((current) => ({ ...current, [fieldName]: nextValue }));
      if (mediaType === 'poster') {
        setExistingPosterPath(nextValue);
      } else {
        setExistingBackdropPath(nextValue);
      }

      window.alert(`${mediaType === 'poster' ? 'Poster' : 'Backdrop'} uploaded successfully.`);
    } catch (error) {
      console.error(`Failed to upload ${mediaType}:`, error);
      window.alert(error.message || `Unable to upload ${mediaType}.`);
    } finally {
      if (mediaType === 'poster') {
        setUploadingPoster(false);
      } else {
        setUploadingBackdrop(false);
      }
      event.target.value = '';
    }
  };

  const handleRemoveFile = async (mediaType) => {
    const currentPath = mediaType === 'poster' ? existingPosterPath : existingBackdropPath;

    if (mediaType === 'poster') {
      setPosterFile(null);
    } else {
      setBackdropFile(null);
    }

    if (!currentPath) {
      if (mediaType === 'poster') {
        setForm((current) => ({ ...current, poster_url: '' }));
      } else {
        setForm((current) => ({ ...current, backdrop_url: '' }));
      }
      return;
    }

    try {
      await deleteMovieStorageAsset(currentPath);

      if (mediaType === 'poster') {
        setExistingPosterPath('');
        setForm((current) => ({ ...current, poster_url: '' }));
      } else {
        setExistingBackdropPath('');
        setForm((current) => ({ ...current, backdrop_url: '' }));
      }

      window.alert(`${mediaType === 'poster' ? 'Poster' : 'Backdrop'} removed.`);
    } catch (error) {
      console.error(`Failed to remove ${mediaType}:`, error);
      window.alert(error.message || `Unable to remove ${mediaType}.`);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }

      const ottPlatforms = Array.isArray(form.ott)
        ? form.ott
        : String(form.ott || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

      const payload = {
        ...form,
        genre: selectedGenres.join(', '),
        genres: selectedGenres,
        language: selectedLanguages.join(', ') || form.language || 'English',
        languages: selectedLanguages,
        ott: ottPlatforms.join(', '),
        otts: ottPlatforms,
        poster_url: form.poster_url && !form.poster_url.startsWith('blob:') ? form.poster_url : '',
        backdrop_url: form.backdrop_url && !form.backdrop_url.startsWith('blob:') ? form.backdrop_url : '',
        runtime: Number(form.runtime || 0),
        rating: Number(form.rating || 0),
        vote_count: 0,
        is_published: form.is_published,
      };

      if (id) {
        const { error } = await supabase.from('movies').update(payload).eq('id', Number(id));
        if (error) throw error;
        invalidateCache('catalog:');
      } else {
        const { data: insertedMovie, error: insertError } = await supabase.from('movies').insert(payload).select().single();
        if (insertError) throw insertError;
        invalidateCache('catalog:');

        const nextMovieId = insertedMovie?.id;

        if (nextMovieId) {
          const promisedPoster = posterFile
            ? uploadMovieAsset({ file: posterFile, movieId: Number(nextMovieId), mediaType: 'poster', currentStoragePath: '' })
            : Promise.resolve('');

          const promisedBackdrop = backdropFile
            ? uploadMovieAsset({ file: backdropFile, movieId: Number(nextMovieId), mediaType: 'backdrop', currentStoragePath: '' })
            : Promise.resolve('');

          const [uploadedPoster, uploadedBackdrop] = await Promise.all([promisedPoster, promisedBackdrop]);

          const updates = {};
          if (uploadedPoster) updates.poster_url = uploadedPoster;
          if (uploadedBackdrop) updates.backdrop_url = uploadedBackdrop;

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase.from('movies').update(updates).eq('id', Number(nextMovieId));
            if (updateError) throw updateError;
          }
        }
      }

      navigate(location.state?.returnTo || '/admin/movies', { replace: true });
    } catch (error) {
      window.alert(error.message || 'Unable to save movie.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-container"><div className="empty-state"><h3>Loading movie…</h3></div></div>;

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Content library / {id ? 'Edit' : 'New title'}</p>
          <h1>{id ? 'Edit Movie' : 'Add Movie'}</h1>
          <p className="admin-header-copy">Build a complete movie record with clear publishing controls.</p>
        </div>
      </div>

      <form className="admin-movie-form" onSubmit={handleSubmit}>
        <div className="admin-form-section-heading"><div><span>01</span><div><strong>Basic information</strong><small>Give your movie a clear identity.</small></div></div></div>
        <div className="admin-form-grid">
          <label>
            <span>Movie Title</span>
            <input name="title" value={form.title} onChange={handleChange} required />
          </label>
          <label>
            <span>Content Type</span>
            <select name="content_type" value={form.content_type} onChange={handleChange}>
              <option value="movie">Movie</option>
              <option value="tv_show">TV Show</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>Genre</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
              {availableGenres.map((genre) => {
                const active = selectedGenres.includes(genre);

                return (
                  <button
                    key={genre}
                    type="button"
                    className="genre-toggle-button"
                    onClick={() => toggleGenre(genre)}
                    style={{
                      borderRadius: '999px',
                      border: active ? '1px solid rgba(255, 46, 77, 0.7)' : '1px solid rgba(255, 255, 255, 0.18)',
                      background: active ? 'rgba(255, 46, 77, 0.18)' : 'rgba(255,255,255,0.02)',
                      color: '#f8fafc',
                      padding: '8px 14px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {genre}
                  </button>
                );
              })}
              <button
                type="button"
                className="genre-toggle-button"
                onClick={() => setShowManualGenreInput((current) => !current)}
                style={{
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#f8fafc',
                  padding: '8px 14px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                + Manual
              </button>
            </div>
            {showManualGenreInput && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                <input
                  value={customGenreInput}
                  onChange={(event) => setCustomGenreInput(event.target.value)}
                  placeholder="Enter custom genre..."
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-secondary" onClick={addCustomGenre}>Add</button>
              </div>
            )}
          </label>
          <label>
            <span>Release Date</span>
            <input name="release_date" type="date" value={form.release_date} onChange={handleChange} />
          </label>
          <label>
            <span>Director</span>
            <input name="director" value={form.director} onChange={handleChange} />
          </label>
          <label>
            <span>Cast <em>manual</em></span>
            <textarea
              name="cast"
              value={form.cast}
              onChange={handleChange}
              rows={3}
              placeholder="Add actor names separated by commas"
            />
            <small>Example: Actor One, Actor Two, Actor Three</small>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>Language</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
              {availableLanguages.map((language) => {
                const active = selectedLanguages.includes(language);

                return (
                  <button
                    key={language}
                    type="button"
                    className="genre-toggle-button"
                    onClick={() => toggleLanguage(language)}
                    style={{
                      borderRadius: '999px',
                      border: active ? '1px solid rgba(255, 46, 77, 0.7)' : '1px solid rgba(255, 255, 255, 0.18)',
                      background: active ? 'rgba(255, 46, 77, 0.18)' : 'rgba(255,255,255,0.02)',
                      color: '#f8fafc',
                      padding: '8px 14px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {language}
                  </button>
                );
              })}
              <button
                type="button"
                className="genre-toggle-button"
                onClick={() => setShowManualLanguageInput((current) => !current)}
                style={{
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#f8fafc',
                  padding: '8px 14px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                + Manual
              </button>
            </div>
            {showManualLanguageInput && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                <input
                  value={customLanguageInput}
                  onChange={(event) => setCustomLanguageInput(event.target.value)}
                  placeholder="Enter custom language..."
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-secondary" onClick={addCustomLanguage}>Add</button>
              </div>
            )}
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>OTT Platform(s)</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
              {AVAILABLE_OTT_PLATFORMS.map((platform) => {
                const active = selectedOttPlatforms.includes(platform.name);
                const platformMeta = getOttPlatformMeta(platform.name);

                return (
                  <button
                    key={platform.name}
                    type="button"
                    className="genre-toggle-button"
                    onClick={() => toggleOttPlatform(platform.name)}
                    style={{
                      borderRadius: '999px',
                      border: active ? '1px solid rgba(255, 46, 77, 0.7)' : '1px solid rgba(255, 255, 255, 0.18)',
                      background: active ? 'rgba(255, 46, 77, 0.18)' : 'rgba(255,255,255,0.02)',
                      color: '#f8fafc',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <img
                      src={platform.logo}
                      alt={`${platform.name} logo`}
                      style={{
                        width: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform.name) ? '108px' : '20px',
                        height: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform.name) ? '36px' : '20px',
                        borderRadius: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform.name) ? '0' : '6px',
                        objectFit: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform.name) ? 'contain' : 'cover',
                        display: 'block',
                        boxShadow: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform.name) ? 'none' : '0 0 0 1px rgba(255,255,255,0.12)',
                      }}
                    />
                    {!['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform.name) && platform.name}
                  </button>
                );
              })}
              <button
                type="button"
                className="genre-toggle-button"
                onClick={() => setShowManualOttInput((current) => !current)}
                style={{
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#f8fafc',
                  padding: '8px 14px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                + Manual
              </button>
            </div>
            {showManualOttInput && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                <input
                  value={customOttInput}
                  onChange={(event) => setCustomOttInput(event.target.value)}
                  placeholder="Add custom OTT platform..."
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-secondary" onClick={addCustomOttPlatform}>Add</button>
              </div>
            )}
            <input
              name="ott"
              value={form.ott}
              onChange={handleChange}
              placeholder="Netflix, Prime Video, JioHotstar"
              style={{ marginTop: '10px' }}
            />
            <small>List every streaming platform or service where this movie is available.</small>
          </label>
          <label>
            <span>Runtime</span>
            <input name="runtime" type="number" value={form.runtime} onChange={handleChange} />
          </label>
          <label>
            <span>Rating</span>
            <input name="rating" type="number" step="0.1" min="0" max="10" value={form.rating} onChange={handleChange} />
          </label>
        </div>

        <div className="admin-form-section-heading"><div><span>02</span><div><strong>Story &amp; media</strong><small>Help viewers discover what makes this title special.</small></div></div></div>
        <label>
          <span>Description</span>
          <textarea name="description" value={form.description} onChange={handleChange} rows={7} required />
        </label>

        <div className="admin-form-grid">
          <label>
            <span>Poster Upload <em>optional</em></span>
            <input type="file" accept="image/*" onChange={(event) => handleFileChange(event, 'poster')} disabled={uploadingPoster} />
            <small>{uploadingPoster ? 'Uploading poster...' : 'Upload to Supabase Storage bucket POSTER'}</small>
          </label>
          <label>
            <span>Backdrop Upload <em>optional</em></span>
            <input type="file" accept="image/*" onChange={(event) => handleFileChange(event, 'backdrop')} disabled={uploadingBackdrop} />
            <small>{uploadingBackdrop ? 'Uploading backdrop...' : 'Upload to Supabase Storage bucket POSTER'}</small>
          </label>
          <label><span>Poster URL <em>optional</em></span><input name="poster_url" value={form.poster_url} onChange={handleChange} placeholder="https://..." /></label>
          <label><span>Backdrop URL <em>optional</em></span><input name="backdrop_url" value={form.backdrop_url} onChange={handleChange} placeholder="https://..." /></label>
          <label><span>Trailer URL <em>optional</em></span><input name="trailer_url" value={form.trailer_url} onChange={handleChange} placeholder="YouTube or video URL" /></label>
        </div>

        <div className="admin-form-grid">
          <label>
            <span>Poster</span>
            {form.poster_url ? <img src={form.poster_url} alt="Poster preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} /> : <div style={{ marginTop: '8px', color: '#8c96a7' }}>No poster uploaded yet.</div>}
            {existingPosterPath && <button type="button" className="btn-secondary" onClick={() => handleRemoveFile('poster')} style={{ marginTop: '8px' }}>Remove poster</button>}
          </label>
          <label>
            <span>Backdrop</span>
            {form.backdrop_url ? <img src={form.backdrop_url} alt="Backdrop preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} /> : <div style={{ marginTop: '8px', color: '#8c96a7' }}>No backdrop uploaded yet.</div>}
            {existingBackdropPath && <button type="button" className="btn-secondary" onClick={() => handleRemoveFile('backdrop')} style={{ marginTop: '8px' }}>Remove backdrop</button>}
          </label>
        </div>

        <fieldset className="admin-publish-box">
          <legend>Publishing status</legend>
          <p className="admin-publish-help">Drafts stay in your content library and remain hidden from the public website.</p>
          <div className="admin-publish-options">
            <button type="button" className={`admin-publish-option ${form.is_published ? 'is-selected' : ''}`} onClick={() => setForm((current) => ({ ...current, is_published: true }))} aria-pressed={form.is_published}>
              <span className="admin-publish-option-mark" />
              <span><strong>Publish now</strong><small>Make this movie visible on the website.</small></span>
            </button>
            <button type="button" className={`admin-publish-option ${!form.is_published ? 'is-selected is-draft' : ''}`} onClick={() => setForm((current) => ({ ...current, is_published: false }))} aria-pressed={!form.is_published}>
              <span className="admin-publish-option-mark" />
              <span><strong>Save as draft</strong><small>Only admins can see it in the content library.</small></span>
            </button>
          </div>
        </fieldset>

        <div className="admin-form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin/movies')}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : form.is_published ? (id ? 'Save changes' : 'Publish movie') : 'Save draft'}</button>
        </div>
      </form>
    </div>
  );
};

export default AdminMovieFormPage;
