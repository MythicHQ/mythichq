import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ImagePlus, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LOCAL_MOVIES } from '../../data/localMovies';
import { fetchAdminMovies } from '../../services/movieCatalog';
import { deleteMovieStorageAsset, getSignedMovieAssetUrl, isSupabaseStoragePath, uploadMovieAsset } from '../../services/movieStorage';
import { invalidateCache } from '../../services/requestCache';
import CastCrewEditor from './CastCrewEditor';
import { fetchMovieCredits, saveMovieCredits, uploadMovieCreditImage } from '../../services/movieCredits';
import { fetchMovieCastMembers, saveMovieCastMembers } from '../../services/castMembers';
import { recheckMovieProblems } from '../../services/movieProblems';
import CentralCastSelector from './CentralCastSelector';

const AVAILABLE_GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Science Fiction', 'Romance', 'Thriller', 'Epic', 'Spy', 'psychological thriller', 'Fantasy', 'Adventure', 'Superhero', 'MCU', 'Dark comedy', 'Crime'];
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

const legacyCreditLists = (castCrew = [], cast = '') => {
  const structuredCredits = Array.isArray(castCrew) ? castCrew.filter((person) => person?.name) : [];
  const castMembers = structuredCredits
    .filter((person) => !person.role || /actor|actress|cast/i.test(person.role))
    .map((person, index) => ({
      person_name: person.name,
      character_name: person.character || '',
      image_url: person.image_url || '',
      storage_path: person.image_url || '',
      display_order: index,
      role: 'Actor',
    }));
  const crewMembers = structuredCredits
    .filter((person) => person.role && !/actor|actress|cast/i.test(person.role))
    .map((person, index) => ({
      person_name: person.name,
      department: person.role,
      job: person.job || '',
      image_url: person.image_url || '',
      storage_path: person.image_url || '',
      display_order: index,
    }));

  if (!castMembers.length) {
    normalizeOptionValues(cast).forEach((name, index) => {
      castMembers.push({ person_name: name, character_name: '', image_url: '', storage_path: '', display_order: index, role: 'Actor' });
    });
  }
  return { cast: castMembers, crew: crewMembers };
};

const MOVIE_BADGES = [
  { value: 'trending', label: 'Trending' },
  { value: 'popular', label: 'Popular' },
  { value: 'rising', label: 'Rising' },
  { value: 'new', label: 'New' },
  { value: 'top_rated', label: 'Top Rated' },
  { value: 'editors_pick', label: "Editor's Pick" },
];

const MovieFormSection = ({ number, title, description, children, id }) => (
  <section className="movie-form-section" id={id}>
    <header className="movie-form-section-header">
      <span>{number}</span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </header>
    <div className="movie-form-section-content">{children}</div>
  </section>
);

const normalizeProviders = (providers = []) => (Array.isArray(providers) ? providers : [])
  .map((provider) => ({
    name: String(provider?.name || provider?.platform || '').trim(),
    url: String(provider?.url || '').trim(),
    logo_url: String(provider?.logo_url || '').trim(),
    availability: String(provider?.availability || provider?.status || '').trim(),
  }))
  .filter((provider) => provider.name || provider.url || provider.logo_url);

const mergeStreamingProviders = (providers, platforms) => {
  const normalized = normalizeProviders(providers);
  const names = new Set(normalized.map((provider) => provider.name.toLocaleLowerCase()));
  (Array.isArray(platforms) ? platforms : [])
    .map((platform) => String(platform || '').trim())
    .filter(Boolean)
    .forEach((name) => {
      if (names.has(name.toLocaleLowerCase())) return;
      const platform = AVAILABLE_OTT_PLATFORMS.find((entry) => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase());
      normalized.push({ name, url: '', logo_url: platform?.logo || '', availability: '' });
      names.add(name.toLocaleLowerCase());
    });
  return normalized;
};

const isValidHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const defaultForm = {
  title: '',
  title_image_url: '',
  content_type: 'movie',
  description: '',
  tagline: '',
  poster_url: '',
  backdrop_url: '',
  trailer_url: '',
  genre: '',
  release_date: '',
  director: '',
  cast: '',
  writer: '',
  country: '',
  age_rating: '',
  production_company: '',
  imdb_rating: '',
  budget: '',
  box_office: '',
  movie_status: '',
  initial_hype: '',
  badges: [],
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
  const [centralCast, setCentralCast] = useState([]);
  const [crewMembers, setCrewMembers] = useState([]);
  const [originalCrewMembers, setOriginalCrewMembers] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');
  const [watchProviders, setWatchProviders] = useState([]);
  const [availableGenres, setAvailableGenres] = useState(AVAILABLE_GENRES);
  const [selectedLanguages, setSelectedLanguages] = useState(['English']);
  const [availableLanguages, setAvailableLanguages] = useState(AVAILABLE_LANGUAGES);
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [customLanguageInput, setCustomLanguageInput] = useState('');
  const [showManualGenreInput, setShowManualGenreInput] = useState(false);
  const [showManualLanguageInput, setShowManualLanguageInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [uploadingCredits, setUploadingCredits] = useState(false);
  const [existingPosterPath, setExistingPosterPath] = useState('');
  const [existingBackdropPath, setExistingBackdropPath] = useState('');
  const [existingTitleImagePath, setExistingTitleImagePath] = useState('');
  const [posterPreview, setPosterPreview] = useState('');
  const [backdropPreview, setBackdropPreview] = useState('');
  const [titleImagePreview, setTitleImagePreview] = useState('');
  const [posterFile, setPosterFile] = useState(null);
  const [backdropFile, setBackdropFile] = useState(null);
  const [titleImageFile, setTitleImageFile] = useState(null);
  const [movieTimestamps, setMovieTimestamps] = useState({ createdAt: '', updatedAt: '', publishedAt: '' });
  const [mediaErrors, setMediaErrors] = useState({});
  const [fixedProblems, setFixedProblems] = useState([]);
  const previousProblemKeys = useRef(new Set());
  const formFingerprintRef = useRef('');
  const [auditIssues, setAuditIssues] = useState([]);
  const [auditVisibility, setAuditVisibility] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditWarning, setAuditWarning] = useState('');
  const [auditCheckedAt, setAuditCheckedAt] = useState('');
  const [auditCheckedFingerprint, setAuditCheckedFingerprint] = useState('');
  const [persistedFingerprint, setPersistedFingerprint] = useState('');
  const [savedAndChecked, setSavedAndChecked] = useState(false);

  useEffect(() => {
    if (loading) return undefined;
    const focusField = new URLSearchParams(location.search).get('focus');
    if (!focusField) return undefined;

    const timer = window.setTimeout(() => {
      const target = focusField === 'genre'
        ? document.getElementById('movie-genre-fields')
        : focusField === 'is_published'
          ? document.getElementById('movie-publishing-status')
          : focusField === 'cast_crew'
            ? document.getElementById('movie-credits')
            : document.getElementsByName(focusField)[0];
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loading, location.search]);

  useEffect(() => {
    const loadAvailableOptions = async () => {
      try {
        if (!supabase) {
          setAvailableGenres(AVAILABLE_GENRES);
          setAvailableLanguages(AVAILABLE_LANGUAGES);
          return;
        }

        const [{ data: genreOptions, error: genresError }, movies] = await Promise.all([
          supabase.from('genre_options').select('name').eq('is_active', true).order('name', { ascending: true }),
          fetchAdminMovies(),
        ]);
        if (genresError) throw genresError;

        const uniqueLanguages = collectUniqueValues(movies, ['language', 'languages']);

        setAvailableGenres((genreOptions || []).map((option) => option.name));
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
      setLoading(true);
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
            const localOttPlatforms = Array.isArray(localMovie.otts)
              ? localMovie.otts
              : String(localMovie.ott || '').split(',').map((item) => item.trim()).filter(Boolean);

            const legacyCredits = legacyCreditLists(localMovie.cast_crew, localMovie.cast);
            setCentralCast([]);
            setCrewMembers(legacyCredits.crew);
            setOriginalCrewMembers(legacyCredits.crew);
            setSelectedGenres(movieGenres);
            setSelectedLanguages(movieLanguages);
            setWatchProviders(mergeStreamingProviders(localMovie.watch_providers, localOttPlatforms));
            setTitleImagePreview(localMovie.title_image_url || '');
            setPosterPreview(localMovie.poster_path || localMovie.poster_url || '');
            setBackdropPreview(localMovie.backdrop_path || localMovie.backdrop_url || '');
            setMovieTimestamps({ createdAt: localMovie.created_at || '', updatedAt: localMovie.updated_at || '', publishedAt: localMovie.published_at || '' });
            setForm({
              title: localMovie.title || '',
              title_image_url: localMovie.title_image_url || '',
              content_type: localMovie.content_type || localMovie.media_type || 'movie',
              description: localMovie.overview || '',
              tagline: localMovie.tagline || '',
              poster_url: localMovie.poster_path || '',
              backdrop_url: localMovie.backdrop_path || '',
              trailer_url: localMovie.trailer_key ? `https://www.youtube.com/watch?v=${localMovie.trailer_key}` : '',
              genre: movieGenres.join(', '),
              release_date: localMovie.release_date || '',
              director: localMovie.director || '',
              cast: Array.isArray(localMovie.cast) ? localMovie.cast.join(', ') : '',
              writer: localMovie.writer || '',
              country: localMovie.country || '',
              age_rating: localMovie.age_rating || '',
              production_company: localMovie.production_company || '',
              imdb_rating: localMovie.imdb_rating == null ? '' : String(localMovie.imdb_rating),
              budget: localMovie.budget == null ? '' : String(localMovie.budget),
              box_office: localMovie.box_office == null ? '' : String(localMovie.box_office),
              movie_status: localMovie.movie_status || '',
              initial_hype: localMovie.initial_hype == null ? '' : String(localMovie.initial_hype),
              badges: Array.isArray(localMovie.badges) ? localMovie.badges : [],
              language: movieLanguages.join(', ') || 'English',
              ott: Array.isArray(localMovie.otts) ? localMovie.otts.join(', ') : (localMovie.ott || ''),
              runtime: String(localMovie.runtime || 120),
              rating: String(localMovie.vote_average || 8.5),
              is_published: true,
            });
          }
          return;
        }

        const { data, error } = await supabase.from('movies').select('*').eq('id', Number(id)).maybeSingle();
        if (error) throw error;
        if (!data) {
          throw new Error('Movie not found.');
        }

        const storedCredits = await fetchMovieCredits(data.id);
        const linkedCast = await fetchMovieCastMembers(data.id);
        const legacyCredits = legacyCreditLists(data.cast_crew, data.cast);
        const loadedCrew = storedCredits.crew.length ? storedCredits.crew : legacyCredits.crew;
        setCentralCast(linkedCast);
        setCrewMembers(loadedCrew);
        setOriginalCrewMembers(storedCredits.crew);

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
        setTitleImagePreview(await getSignedMovieAssetUrl(data.title_image_url || ''));
        setExistingTitleImagePath(isSupabaseStoragePath(data.title_image_url) ? data.title_image_url : '');
        setMovieTimestamps({ createdAt: data.created_at || '', updatedAt: data.updated_at || '', publishedAt: data.published_at || '' });
        const dataOttPlatforms = Array.isArray(data.otts)
          ? data.otts
          : String(data.ott || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
        setWatchProviders(mergeStreamingProviders(data.watch_providers, dataOttPlatforms));
        setForm({
          title: data.title || '',
          title_image_url: data.title_image_url || '',
          content_type: data.content_type || data.media_type || 'movie',
          description: data.description || '',
          tagline: data.tagline || '',
          poster_url: data.poster_url || '',
          backdrop_url: data.backdrop_url || '',
          trailer_url: data.trailer_url || '',
          genre: movieGenres.join(', '),
          release_date: data.release_date || '',
          director: data.director || '',
          cast: data.cast || '',
          writer: data.writer || '',
          country: data.country || '',
          age_rating: data.age_rating || '',
          production_company: data.production_company || '',
          imdb_rating: data.imdb_rating == null ? '' : String(data.imdb_rating),
          budget: data.budget == null ? '' : String(data.budget),
          box_office: data.box_office == null ? '' : String(data.box_office),
          movie_status: data.movie_status || '',
          initial_hype: data.initial_hype == null ? '' : String(data.initial_hype),
          badges: Array.isArray(data.badges) ? data.badges : [],
          language: movieLanguages.join(', ') || 'English',
          ott: Array.isArray(data.otts) ? data.otts.join(', ') : (data.ott || ''),
          runtime: String(data.runtime || 120),
          rating: String(data.rating || 8.5),
          is_published: data.is_published !== false,
        });
        setExistingPosterPath(data.poster_url || data.poster_path || '');
        setExistingBackdropPath(data.backdrop_url || data.backdrop_path || '');
        setPosterPreview(await getSignedMovieAssetUrl(data.poster_url || data.poster_path || ''));
        setBackdropPreview(await getSignedMovieAssetUrl(data.backdrop_url || data.backdrop_path || ''));
      } catch (error) {
        console.error('Failed to load movie:', error);
        window.alert(error.message || 'Unable to load movie details. Confirm the movie cast and crew migration has been applied.');
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === 'title_image_url') {
      setTitleImagePreview(value);
      setExistingTitleImagePath(isSupabaseStoragePath(value) ? value : '');
      setTitleImageFile(null);
    }
    if (['poster_url', 'backdrop_url', 'title_image_url'].includes(name)) {
      const mediaKey = name === 'poster_url' ? 'poster' : name === 'backdrop_url' ? 'backdrop' : 'titleImage';
      setMediaErrors((current) => ({ ...current, [mediaKey]: '' }));
      if (name === 'poster_url') {
        setPosterPreview(value);
        setPosterFile(null);
      }
      if (name === 'backdrop_url') {
        setBackdropPreview(value);
        setBackdropFile(null);
      }
    }
  };

  const toggleGenre = (genre) => {
    setSelectedGenres((current) => {
      const nextGenres = current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre];

      setForm((previous) => ({ ...previous, genre: nextGenres.join(', ') }));
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

  const addCustomGenre = async () => {
    const trimmedValue = customGenreInput.trim();
    if (!trimmedValue) return;

    try {
      if (supabase) {
        const { error } = await supabase.from('genre_options').upsert(
          { name: trimmedValue, is_active: true },
          { onConflict: 'name' },
        );
        if (error) throw error;
      }

      setAvailableGenres((current) => [...new Set([...current, trimmedValue])]);
      setSelectedGenres((current) => {
        const nextGenres = [...new Set([...current, trimmedValue])];
        setForm((previous) => ({ ...previous, genre: nextGenres.join(', ') }));
        return nextGenres;
      });
      setCustomGenreInput('');
      setShowManualGenreInput(false);
    } catch (error) {
      console.error('Failed to add genre option:', error);
      window.alert(error.message || 'Unable to add genre option.');
    }
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

  const visibleGenres = useMemo(() => {
    const query = genreSearch.trim().toLocaleLowerCase();
    return availableGenres.filter((genre) => !query || genre.toLocaleLowerCase().includes(query));
  }, [availableGenres, genreSearch]);

  const updateProvider = (index, field, value) => {
    setWatchProviders((current) => current.map((provider, providerIndex) => (
      providerIndex === index ? { ...provider, [field]: value } : provider
    )));
  };

  const addProvider = (name = '') => {
    setWatchProviders((current) => [...current, { name, url: '', logo_url: '', availability: '' }]);
  };

  const removeProvider = (index) => {
    setWatchProviders((current) => current.filter((_, providerIndex) => providerIndex !== index));
  };

  const handleFileChange = async (event, mediaType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (mediaType === 'poster') {
      setPosterFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPosterPreview(previewUrl);
      setForm((current) => ({ ...current, poster_url: previewUrl }));
    } else if (mediaType === 'backdrop') {
      setBackdropFile(file);
      const previewUrl = URL.createObjectURL(file);
      setBackdropPreview(previewUrl);
      setForm((current) => ({ ...current, backdrop_url: previewUrl }));
    } else {
      setTitleImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setTitleImagePreview(previewUrl);
      setForm((current) => ({ ...current, title_image_url: previewUrl }));
    }

    if (!id) {
      event.target.value = '';
      return;
    }

    try {
      if (mediaType === 'poster') {
        setUploadingPoster(true);
      } else if (mediaType === 'backdrop') {
        setUploadingBackdrop(true);
      }

      const currentPath = mediaType === 'poster'
        ? existingPosterPath
        : mediaType === 'backdrop' ? existingBackdropPath : existingTitleImagePath;
      const uploadedPath = await uploadMovieAsset({
        file,
        movieId: Number(id),
        mediaType,
        currentStoragePath: currentPath,
      });

      const nextValue = uploadedPath || '';
      const fieldName = mediaType === 'poster' ? 'poster_url' : mediaType === 'backdrop' ? 'backdrop_url' : 'title_image_url';

      setForm((current) => ({ ...current, [fieldName]: nextValue }));
      if (mediaType === 'poster') {
        setExistingPosterPath(nextValue);
        setPosterPreview(await getSignedMovieAssetUrl(nextValue));
      } else if (mediaType === 'backdrop') {
        setExistingBackdropPath(nextValue);
        setBackdropPreview(await getSignedMovieAssetUrl(nextValue));
      } else {
        setExistingTitleImagePath(nextValue);
        setTitleImagePreview(await getSignedMovieAssetUrl(nextValue));
      }

      window.alert(`${mediaType === 'poster' ? 'Poster' : mediaType === 'backdrop' ? 'Backdrop' : 'Title image'} uploaded successfully.`);
    } catch (error) {
      console.error(`Failed to upload ${mediaType}:`, error);
      window.alert(error.message || `Unable to upload ${mediaType}.`);
    } finally {
      if (mediaType === 'poster') {
        setUploadingPoster(false);
      } else if (mediaType === 'backdrop') {
        setUploadingBackdrop(false);
      }
      event.target.value = '';
    }
  };

  const handleRemoveFile = async (mediaType) => {
    const currentPath = mediaType === 'poster'
      ? existingPosterPath
      : mediaType === 'backdrop' ? existingBackdropPath : existingTitleImagePath;

    if (mediaType === 'poster') {
      setPosterFile(null);
      setPosterPreview('');
    } else if (mediaType === 'backdrop') {
      setBackdropFile(null);
      setBackdropPreview('');
    } else {
      setTitleImageFile(null);
      setTitleImagePreview('');
    }

    if (!currentPath) {
      const fieldName = mediaType === 'poster' ? 'poster_url' : mediaType === 'backdrop' ? 'backdrop_url' : 'title_image_url';
      setForm((current) => ({ ...current, [fieldName]: '' }));
      return;
    }

    try {
      await deleteMovieStorageAsset(currentPath);

      if (mediaType === 'poster') {
        setExistingPosterPath('');
        setPosterPreview('');
        setForm((current) => ({ ...current, poster_url: '' }));
      } else if (mediaType === 'backdrop') {
        setExistingBackdropPath('');
        setBackdropPreview('');
        setForm((current) => ({ ...current, backdrop_url: '' }));
      } else {
        setExistingTitleImagePath('');
        setForm((current) => ({ ...current, title_image_url: '' }));
      }

      window.alert(`${mediaType === 'poster' ? 'Poster' : mediaType === 'backdrop' ? 'Backdrop' : 'Title image'} removed.`);
    } catch (error) {
      console.error(`Failed to remove ${mediaType}:`, error);
      window.alert(error.message || `Unable to remove ${mediaType}.`);
    }
  };

  const currentFormFingerprint = JSON.stringify({ form, selectedGenres, centralCast, crewMembers, watchProviders });
  useEffect(() => {
    formFingerprintRef.current = currentFormFingerprint;
  }, [currentFormFingerprint]);

  const localMovieProblems = useMemo(() => {
    const findings = [];
    const add = (code, severity, problem, field, reason, solution) => findings.push({
      code, severity, problem, field, reason, solution, status: 'Unresolved',
    });
    const checkMedia = (field, label, key, value, required = false) => {
      if (!value) {
        if (required) add(`missing_${key}`, 'warning', `${label} is missing`, field, `No ${label.toLowerCase()} is saved. The public page falls back to default artwork.`, `Add a valid ${label.toLowerCase()} URL or upload an image.`);
        return;
      }
      if (!value.startsWith('blob:') && !isSupabaseStoragePath(value) && !value.startsWith('/') && !value.startsWith('data:image/') && !isValidHttpUrl(value)) {
        add(`invalid_${key}_url`, 'warning', `${label} URL is invalid`, field, 'The value is not a supported URL or movie storage path.', 'Use a valid http or https URL, or upload an image.');
      } else if (mediaErrors[key] === value) {
        add(`broken_${key}`, 'warning', `${label} could not be loaded`, field, 'The browser failed to load this image URL.', 'Replace the URL or upload a working image.');
      }
    };

    if (!form.title.trim()) add('missing_title', 'critical', 'Movie title is required', 'title', 'The public movie page has no usable title.', 'Enter a movie title.');
    if (!form.description.trim()) add('missing_description', 'warning', 'Description is missing', 'description', 'The movie detail page will show its generic synopsis fallback.', 'Add a short synopsis.');
    if (!selectedGenres.length) add('missing_genre', 'warning', 'No genres selected', 'genre', 'The movie will not appear in genre-based browsing.', 'Select one or more genres.');
    if (!selectedLanguages.length) add('missing_language', 'warning', 'Movie language is missing', 'language', 'No language is available for language-based browsing.', 'Select at least one language.');
    checkMedia('poster_url', 'Poster', 'poster', form.poster_url, true);
    checkMedia('backdrop_url', 'Backdrop', 'backdrop', form.backdrop_url, true);
    checkMedia('title_image_url', 'Title image', 'titleImage', form.title_image_url);
    if (form.trailer_url && !isValidHttpUrl(form.trailer_url)) {
      add('invalid_trailer_url', 'warning', 'Trailer URL is invalid', 'trailer_url', 'The trailer value is not a valid HTTP or HTTPS URL.', 'Enter a valid http or https trailer URL.');
    }
    watchProviders.forEach((provider, index) => {
      if (provider.url && !isValidHttpUrl(provider.url)) {
        add(`invalid_provider_url_${index}`, 'warning', `${provider.name || 'Provider'} URL is invalid`, 'watch_providers', 'The provider value is not a valid HTTP or HTTPS URL.', 'Enter a valid http or https provider URL.');
      }
      if (provider.logo_url && !isValidHttpUrl(provider.logo_url) && !isSupabaseStoragePath(provider.logo_url)) {
        add(`invalid_provider_logo_${index}`, 'warning', `${provider.name || 'Provider'} logo URL is invalid`, 'watch_providers', 'The provider logo value is not a valid URL or movie storage path.', 'Enter a valid http or https logo URL.');
      }
    });
    if (form.content_type && !['movie', 'tv_show'].includes(form.content_type)) {
      add('invalid_content_type', 'warning', 'Movie category is invalid', 'content_type', 'The public catalog supports Movie and TV Show content types.', 'Select Movie or TV Show.');
    }
    if (!form.is_published) add('draft_visibility', 'warning', 'Movie is not public', 'is_published', 'The movie is explicitly marked as a draft and the public query excludes it.', 'Choose Publish Now if this movie should be visible to website visitors.');
    return findings;
  }, [form, mediaErrors, selectedGenres.length, selectedLanguages.length, watchProviders]);

  const runMovieProblemCheck = useCallback(async (targetId = id) => {
    if (!targetId) {
      setAuditError('Save the movie before checking its database record and public visibility.');
      return null;
    }
    setAuditLoading(true);
    setAuditError('');
    setAuditWarning('');
    setAuditCheckedFingerprint('');
    setAuditIssues([]);
    setAuditVisibility(null);
    setSavedAndChecked(false);
    const checkedFingerprint = formFingerprintRef.current;
    try {
      const result = await recheckMovieProblems(targetId);
      setAuditIssues(result.issues);
      setAuditVisibility(result.visibility.find((entry) => String(entry.movieId) === String(targetId)) || null);
      setAuditCheckedAt(result.auditedAt);
      setAuditWarning(result.creditWarning);
      setAuditCheckedFingerprint(checkedFingerprint);
      return result;
    } catch (error) {
      console.error('Movie form problem check failed:', error);
      setAuditError(error.message || 'The database and public movie query could not be checked.');
      return null;
    } finally {
      setAuditLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id || loading) return undefined;
    const timer = window.setTimeout(() => {
      setPersistedFingerprint(formFingerprintRef.current);
      runMovieProblemCheck(id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, loading, runMovieProblemCheck]);

  const movieProblems = auditCheckedFingerprint === currentFormFingerprint
    ? auditIssues.map((issue) => ({
      ...issue,
      reason: issue.why,
      status: 'Unresolved',
    }))
    : localMovieProblems;
  const visibilityInfo = auditCheckedFingerprint === currentFormFingerprint
    ? auditVisibility || { status: 'pending-check', reason: 'Visibility could not be determined from the latest check.' }
    : {
      status: form.is_published ? 'pending-check' : 'draft',
      reason: form.is_published
        ? id ? 'Unsaved changes are not yet reflected in the public catalog.' : 'Save the movie before checking public visibility.'
        : 'This movie is intentionally marked as a draft and the public catalog hides it.',
    };

  useEffect(() => {
    const currentKeys = new Set(movieProblems.map((problem) => problem.code));
    const fixed = [...previousProblemKeys.current]
      .filter((key) => !currentKeys.has(key))
      .map((key) => key.replaceAll('_', ' '));
    if (fixed.length) {
      setFixedProblems((current) => [...new Set([...fixed, ...current])].slice(0, 8));
    }
    previousProblemKeys.current = currentKeys;
  }, [movieProblems]);

  const focusProblem = (field) => {
    const targetId = field === 'genre' ? 'movie-genre-fields'
      : field === 'cast_crew' ? 'movie-cast'
        : field === 'is_published' ? 'movie-publishing-status'
          : field === 'watch_providers' ? 'movie-providers'
            : '';
    const target = targetId ? document.getElementById(targetId) : document.getElementsByName(field)[0];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof target.focus === 'function') target.focus({ preventScroll: true });
  };

  const previewImage = (key, value) => ({
    onLoad: () => setMediaErrors((current) => ({ ...current, [key]: '' })),
    onError: () => setMediaErrors((current) => ({ ...current, [key]: value })),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }

      const ottPlatforms = [...new Set(watchProviders.map((provider) => provider.name.trim()).filter(Boolean))];
      const movieFields = form;
      const savedCast = centralCast.map((person) => person.full_name.trim()).filter(Boolean);
      let savedMovieId = id ? Number(id) : null;

      const payload = {
        ...movieFields,
        title: String(form.title || '').trim(),
        title_image_url: titleImageFile && !id ? '' : String(form.title_image_url || '').trim(),
        tagline: String(form.tagline || '').trim(),
        country: String(form.country || '').trim(),
        age_rating: String(form.age_rating || '').trim(),
        writer: String(form.writer || '').trim(),
        production_company: String(form.production_company || '').trim(),
        imdb_rating: form.imdb_rating === '' ? null : Number(form.imdb_rating),
        budget: form.budget === '' ? null : Number(form.budget),
        box_office: form.box_office === '' ? null : Number(form.box_office),
        movie_status: String(form.movie_status || '').trim(),
        initial_hype: form.initial_hype === '' ? null : Number(form.initial_hype),
        cast: savedCast.join(', '),
        cast_crew: [
          ...crewMembers.map((person) => ({
            name: person.person_name.trim(),
            role: person.department || 'Other',
            job: person.job || '',
            image_url: person.image_url || '',
          })),
        ],
        watch_providers: watchProviders.filter((provider) => provider.name),
        badges: Array.isArray(form.badges) ? form.badges : [],
        genre: String(form.genre || ''),
        genres: String(form.genre || '').split(',').map((genre) => genre.trim()).filter(Boolean),
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
        const { data: insertedMovies, error: insertError } = await supabase.from('movies').insert(payload).select();
        if (insertError) throw insertError;
        invalidateCache('catalog:');

        const insertedMovie = Array.isArray(insertedMovies) ? insertedMovies[0] : insertedMovies;
        const nextMovieId = insertedMovie?.id;
        savedMovieId = nextMovieId ? Number(nextMovieId) : null;

        if (savedMovieId) {
          const promisedPoster = posterFile
            ? uploadMovieAsset({ file: posterFile, movieId: savedMovieId, mediaType: 'poster', currentStoragePath: '' })
            : Promise.resolve('');

          const promisedBackdrop = backdropFile
            ? uploadMovieAsset({ file: backdropFile, movieId: savedMovieId, mediaType: 'backdrop', currentStoragePath: '' })
            : Promise.resolve('');
          const promisedTitleImage = titleImageFile
            ? uploadMovieAsset({ file: titleImageFile, movieId: savedMovieId, mediaType: 'title', currentStoragePath: '' })
            : Promise.resolve('');

          const [uploadedPoster, uploadedBackdrop, uploadedTitleImage] = await Promise.all([promisedPoster, promisedBackdrop, promisedTitleImage]);

          const updates = {};
          if (uploadedPoster) updates.poster_url = uploadedPoster;
          if (uploadedBackdrop) updates.backdrop_url = uploadedBackdrop;
          if (uploadedTitleImage) updates.title_image_url = uploadedTitleImage;

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase.from('movies').update(updates).eq('id', savedMovieId);
            if (updateError) throw updateError;
          }
        }
      }

      if (!savedMovieId) {
        throw new Error('The movie was saved, but its ID was not returned. Reload the movie and try saving cast and crew again.');
      }

      setUploadingCredits(true);
      const uploadedPaths = [];
      const uploadEntries = async (entries, type) => Promise.all(entries.map(async (entry) => {
        let imagePath = entry.removeImage ? '' : entry.storage_path || entry.image_url || '';
        if (entry.imageFile) {
          imagePath = await uploadMovieCreditImage({ file: entry.imageFile, movieId: savedMovieId, creditType: type });
          uploadedPaths.push(imagePath);
        }
        return { ...entry, image_url: imagePath, storage_path: imagePath, imageFile: null, imagePreview: '' };
      }));

      try {
        const savedCrewMembers = await uploadEntries(crewMembers, 'crew');
        await saveMovieCredits({
          movieId: savedMovieId,
          cast: [],
          crew: savedCrewMembers,
          existingCast: [],
          existingCrew: originalCrewMembers,
          saveCast: false,
        });
        await saveMovieCastMembers(savedMovieId, centralCast);
      } catch (creditError) {
        try {
          const persistedCredits = await fetchMovieCredits(savedMovieId);
          const persistedPaths = new Set([...persistedCredits.cast, ...persistedCredits.crew].map((entry) => entry.storage_path));
          await Promise.all(uploadedPaths
            .filter((path) => !persistedPaths.has(path))
            .map((path) => deleteMovieStorageAsset(path)));
        } catch (cleanupError) {
          console.warn('Could not verify uploaded cast and crew images for cleanup:', cleanupError);
        }
        throw creditError;
      } finally {
        setUploadingCredits(false);
      }

      invalidateCache('catalog:');
      if (!id) {
        navigate(`/admin/movies/edit/${savedMovieId}`, { replace: true, state: location.state });
        return;
      }
      setPersistedFingerprint(currentFormFingerprint);
      const auditResult = await runMovieProblemCheck(savedMovieId);
      setSavedAndChecked(Boolean(auditResult));
      if (auditResult) {
        setMovieTimestamps((current) => ({
          ...current,
          updatedAt: new Date().toISOString(),
          publishedAt: form.is_published ? current.publishedAt || new Date().toISOString() : '',
        }));
      }
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

      <form className="admin-movie-form movie-form-redesigned" onSubmit={handleSubmit}>
        <MovieFormSection number="01" title="Basic Information" description="Set the movie identity, format, release details, and essential metadata.">
          <div className="movie-form-grid">
            <label className="movie-form-span-2"><span>Movie Title *</span><input name="title" value={form.title} onChange={handleChange} placeholder="Enter the movie title" required /></label>
            <label><span>Title Image / Logo</span><input name="title_image_url" type="text" inputMode="url" value={form.title_image_url} onChange={handleChange} placeholder="https://..." /></label>
            <label><span>Content Type</span><select name="content_type" value={form.content_type} onChange={handleChange}><option value="movie">Movie</option><option value="tv_show">TV Show</option></select></label>
            <label><span>Release Date</span><input name="release_date" type="date" value={form.release_date} onChange={handleChange} /></label>
            <label><span>Movie Status</span><input name="movie_status" value={form.movie_status} onChange={handleChange} placeholder="e.g. Released, In production" /></label>
            <div className="movie-form-field movie-form-span-2"><span className="movie-form-field-label">Language</span><div className="movie-form-choice-list">{availableLanguages.map((language) => <button key={language} type="button" className={`movie-form-choice ${selectedLanguages.includes(language) ? 'is-selected' : ''}`} onClick={() => toggleLanguage(language)} aria-pressed={selectedLanguages.includes(language)}>{language}</button>)}</div>
              {showManualLanguageInput && <div className="movie-form-inline-add"><input value={customLanguageInput} onChange={(event) => setCustomLanguageInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomLanguage(); } }} placeholder="Add a language" /><button type="button" className="admin-button admin-button-secondary" onClick={addCustomLanguage}><Plus size={14} /> Add</button></div>}
              <button type="button" className="movie-form-text-button" onClick={() => setShowManualLanguageInput((current) => !current)}>{showManualLanguageInput ? 'Cancel custom language' : '+ Add custom language'}</button>
            </div>
            <label><span>Country</span><input id="movie-country-field" name="country" value={form.country} onChange={handleChange} placeholder="e.g. India" /></label>
            <label><span>Age Rating</span><input name="age_rating" value={form.age_rating} onChange={handleChange} placeholder="e.g. PG-13, 16+" /></label>
            <label><span>Runtime (minutes)</span><input name="runtime" type="number" min="0" value={form.runtime} onChange={handleChange} placeholder="120" /></label>
            <label><span>Director</span><input name="director" value={form.director} onChange={handleChange} placeholder="Director name" /></label>
          </div>
        </MovieFormSection>

        <MovieFormSection number="02" title="Genres" description="Search and select only the genres that describe this title." id="movie-genre-fields">
          <label className="movie-genre-search"><span>Search genres</span><div><Search size={16} /><input value={genreSearch} onChange={(event) => setGenreSearch(event.target.value)} placeholder="Type to find a genre..." /></div></label>
          <div className="movie-selected-genres">
            <span className="movie-selected-genres-label">Selected genres <span>{selectedGenres.length}</span></span>
            <div className="movie-form-selected-chips" aria-label="Selected genres">
              {selectedGenres.length ? selectedGenres.map((genre) => <span className="movie-form-chip is-selected" key={genre}>{genre}<button type="button" aria-label={`Remove ${genre}`} title={`Remove ${genre}`} onClick={() => toggleGenre(genre)}><X size={13} /></button></span>) : <span className="movie-form-helper">No genres selected yet.</span>}
            </div>
          </div>
          <div className="movie-form-choice-list movie-genre-options">{visibleGenres.map((genre) => <button key={genre} type="button" className={`movie-form-choice ${selectedGenres.includes(genre) ? 'is-selected' : ''}`} onClick={() => toggleGenre(genre)} aria-pressed={selectedGenres.includes(genre)}>{genre}</button>)}{!visibleGenres.length && <span className="movie-form-helper">No genres match that search.</span>}</div>
          {showManualGenreInput && <div className="movie-form-inline-add"><input value={customGenreInput} onChange={(event) => setCustomGenreInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomGenre(); } }} placeholder="Add a new genre" /><button type="button" className="admin-button admin-button-secondary" onClick={addCustomGenre}><Plus size={14} /> Add genre</button></div>}
          <div className="movie-form-genre-footer"><button type="button" className="movie-form-text-button" onClick={() => setShowManualGenreInput((current) => !current)} aria-expanded={showManualGenreInput}>{showManualGenreInput ? 'Cancel new genre' : '+ Add custom genre'}</button></div>
        </MovieFormSection>

        <MovieFormSection number="03" title="Story & Description" description="Give viewers a concise hook and a complete synopsis.">
          <div className="movie-form-grid"><label className="movie-form-span-2"><span>Tagline</span><input name="tagline" value={form.tagline} onChange={handleChange} maxLength={240} placeholder="A memorable one-line hook" /></label><label className="movie-form-span-2"><span>Description / Synopsis *</span><textarea className="movie-form-synopsis" name="description" value={form.description} onChange={handleChange} rows={7} placeholder="Tell viewers what this movie is about..." required /></label></div>
        </MovieFormSection>

        <MovieFormSection number="04" title="Movie Media" description="Upload artwork or use image links. Preview each asset before saving.">
          <div className="movie-media-grid">
            <article className="movie-media-card"><div className="movie-media-card-heading"><strong>Poster</strong><span>Portrait artwork</span></div><div className="movie-media-preview is-poster">{posterPreview ? <img src={posterPreview} alt={`${form.title || 'Movie'} poster preview`} {...previewImage('poster', form.poster_url || posterPreview)} /> : <ImagePlus size={22} />}</div><label><span>Poster URL</span><input name="poster_url" type="text" inputMode="url" value={form.poster_url} onChange={handleChange} placeholder="https://..." /></label><label className="movie-media-upload"><ImagePlus size={15} /> Upload poster<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleFileChange(event, 'poster')} disabled={uploadingPoster} /></label>{existingPosterPath && <button className="movie-form-text-button is-danger" type="button" onClick={() => handleRemoveFile('poster')}>Remove poster</button>}{uploadingPoster && <small className="movie-form-helper">Uploading poster...</small>}</article>
            <article className="movie-media-card"><div className="movie-media-card-heading"><strong>Backdrop</strong><span>Wide artwork</span></div><div className="movie-media-preview is-backdrop">{backdropPreview ? <img src={backdropPreview} alt={`${form.title || 'Movie'} backdrop preview`} {...previewImage('backdrop', form.backdrop_url || backdropPreview)} /> : <ImagePlus size={22} />}</div><label><span>Backdrop URL</span><input name="backdrop_url" type="text" inputMode="url" value={form.backdrop_url} onChange={handleChange} placeholder="https://..." /></label><label className="movie-media-upload"><ImagePlus size={15} /> Upload backdrop<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleFileChange(event, 'backdrop')} disabled={uploadingBackdrop} /></label>{existingBackdropPath && <button className="movie-form-text-button is-danger" type="button" onClick={() => handleRemoveFile('backdrop')}>Remove backdrop</button>}{uploadingBackdrop && <small className="movie-form-helper">Uploading backdrop...</small>}</article>
            <article className="movie-media-card"><div className="movie-media-card-heading"><strong>Title Image / Logo</strong><span>Transparent title artwork</span></div><div className="movie-media-preview is-title-image">{titleImagePreview ? <img src={titleImagePreview} alt={`${form.title || 'Movie'} title artwork preview`} {...previewImage('titleImage', form.title_image_url || titleImagePreview)} /> : <ImagePlus size={22} />}</div><label><span>Title image URL</span><input name="title_image_url" type="text" inputMode="url" value={form.title_image_url} onChange={handleChange} placeholder="https://..." /></label><label className="movie-media-upload"><ImagePlus size={15} /> Upload title image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleFileChange(event, 'title')} /></label>{existingTitleImagePath && <button className="movie-form-text-button is-danger" type="button" onClick={() => handleRemoveFile('title')}>Remove title image</button>}</article>
            <article className="movie-media-card movie-trailer-card"><div className="movie-media-card-heading"><strong>Trailer</strong><span>YouTube or video link</span></div><label><span>Trailer URL</span><input name="trailer_url" type="text" inputMode="url" value={form.trailer_url} onChange={handleChange} placeholder="https://youtube.com/watch?v=..." /></label>{form.trailer_url && /^https?:\/\//i.test(form.trailer_url) && <div className="movie-trailer-preview">{/\.(mp4|webm|ogg)(\?.*)?$/i.test(form.trailer_url) ? <video src={form.trailer_url} controls preload="metadata" /> : /(?:youtube\.com|youtu\.be)/i.test(form.trailer_url) ? <iframe title={`${form.title || 'Movie'} trailer preview`} src={`https://www.youtube-nocookie.com/embed/${(form.trailer_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/i) || [])[1] || ''}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <span>Trailer link saved. Preview is available for YouTube or direct video links.</span>}</div>}</article>
          </div>
        </MovieFormSection>

        <MovieFormSection number="05" title="Cast" description="Search shared cast profiles, assign characters, reorder, or add a new profile." id="movie-cast">
          <div id="movie-credits" tabIndex={-1}><CentralCastSelector cast={centralCast} onChange={setCentralCast} /></div>
        </MovieFormSection>

        <MovieFormSection number="06" title="Crew" description="Add directors, writers, producers, cinematographers, composers, editors, and other credits.">
          <CastCrewEditor cast={[]} crew={crewMembers} onCrewChange={setCrewMembers} showCast={false} />
          <label className="movie-legacy-writer"><span>Additional writer names</span><input name="writer" value={form.writer} onChange={handleChange} placeholder="Writer name(s)" /></label>
        </MovieFormSection>

        <MovieFormSection number="07" title="Where to Watch" description="Add streaming, rental, or purchase providers and their availability details." id="movie-providers">
          <div className="movie-provider-list">{watchProviders.map((provider, index) => <article className="movie-provider-card" key={`provider-${index}`}><header><strong>Provider {index + 1}</strong><button type="button" className="movie-provider-remove" onClick={() => removeProvider(index)} aria-label={`Remove provider ${index + 1}`}><Trash2 size={15} /> Remove</button></header><div className="movie-form-grid"><label><span>Platform Name *</span><input value={provider.name} onChange={(event) => updateProvider(index, 'name', event.target.value)} placeholder="e.g. Netflix" /></label><label><span>Availability</span><select value={provider.availability} onChange={(event) => updateProvider(index, 'availability', event.target.value)}><option value="">Select availability</option><option value="streaming">Streaming</option><option value="rent">Rent</option><option value="buy">Buy</option><option value="coming_soon">Coming soon</option></select></label><label><span>Provider URL</span><input type="text" inputMode="url" value={provider.url} onChange={(event) => updateProvider(index, 'url', event.target.value)} placeholder="https://..." /></label><label><span>Logo URL</span><input type="text" inputMode="url" value={provider.logo_url} onChange={(event) => updateProvider(index, 'logo_url', event.target.value)} placeholder="https://..." /></label></div></article>)}</div>
          <button type="button" className="admin-button admin-button-secondary movie-form-add-provider" onClick={() => addProvider()}><Plus size={15} /> Add Provider</button>
        </MovieFormSection>

        <MovieFormSection number="08" title="Ratings & Hype" description="Set viewer ratings and the movie's initial hype score.">
          <div className="movie-form-grid"><label><span>TMDB Rating / 10</span><input name="rating" type="number" step="0.1" min="0" max="10" value={form.rating} onChange={handleChange} /></label><label><span>IMDb Rating / 10</span><input name="imdb_rating" type="number" step="0.1" min="0" max="10" value={form.imdb_rating} onChange={handleChange} placeholder="Optional" /></label><label><span>Initial Hype / 100</span><input name="initial_hype" type="number" min="0" max="100" value={form.initial_hype} onChange={handleChange} placeholder="Optional" /></label></div>
        </MovieFormSection>

        <MovieFormSection number="09" title="Production & Financial" description="Add production details and financial figures when available.">
          <div className="movie-form-grid"><label><span>Production Company</span><input name="production_company" value={form.production_company} onChange={handleChange} placeholder="Production company" /></label><div className="movie-production-country"><span>Production Country</span><strong>{form.country || 'Not set'}</strong><button type="button" className="movie-form-text-button" onClick={() => { const field = document.getElementById('movie-country-field'); field?.scrollIntoView({ behavior: 'smooth', block: 'center' }); field?.focus({ preventScroll: true }); }}>Edit country in Basic Information</button></div><label><span>Budget</span><input name="budget" type="number" min="0" step="1" value={form.budget} onChange={handleChange} placeholder="Optional" /></label><label><span>Box Office</span><input name="box_office" type="number" min="0" step="1" value={form.box_office} onChange={handleChange} placeholder="Optional" /></label></div>
        </MovieFormSection>

        <MovieFormSection number="10" title="Movie Badges" description="Choose the labels that should appear with this movie.">
          <div className="movie-form-choice-list">{MOVIE_BADGES.map((badge) => { const selected = form.badges.includes(badge.value); return <button key={badge.value} type="button" className={`movie-form-choice ${selected ? 'is-selected' : ''}`} onClick={() => setForm((current) => ({ ...current, badges: selected ? current.badges.filter((item) => item !== badge.value) : [...current.badges, badge.value] }))} aria-pressed={selected}>{badge.label}</button>; })}</div>
          {form.badges.some((value) => !MOVIE_BADGES.some((badge) => badge.value === value)) && <div className="movie-form-selected-chips">{form.badges.filter((value) => !MOVIE_BADGES.some((badge) => badge.value === value)).map((value) => <span className="movie-form-chip is-selected" key={value}>{value}<button type="button" aria-label={`Remove ${value} badge`} onClick={() => setForm((current) => ({ ...current, badges: current.badges.filter((badge) => badge !== value) }))}><X size={13} /></button></span>)}</div>}
        </MovieFormSection>

        <MovieFormSection number="11" title="Publishing" description="Choose whether this title is a draft or visible on the public website." id="movie-publishing-status">
          <p className="admin-publish-help">Drafts stay in your content library and remain hidden from public pages.</p>
          <div className="admin-publish-options"><button type="button" className={`admin-publish-option ${!form.is_published ? 'is-selected is-draft' : ''}`} onClick={() => setForm((current) => ({ ...current, is_published: false }))} aria-pressed={!form.is_published}><span className="admin-publish-option-mark" /><span><strong>Draft</strong><small>Only admins can see this title.</small></span></button><button type="button" className={`admin-publish-option ${form.is_published ? 'is-selected' : ''}`} onClick={() => setForm((current) => ({ ...current, is_published: true }))} aria-pressed={form.is_published}><span className="admin-publish-option-mark" /><span><strong>Publish Now</strong><small>Make this title available on public pages.</small></span></button></div>
          <div className="movie-publish-metadata"><div><span>Visibility</span><strong>{form.is_published ? 'Public after saving' : 'Hidden draft'}</strong></div><div><span>Current status</span><strong>{id ? (form.is_published ? 'Published' : 'Draft') : 'Not saved yet'}</strong></div><div><span>Published date</span><strong>{movieTimestamps.publishedAt ? new Date(movieTimestamps.publishedAt).toLocaleDateString() : form.is_published && id ? 'Not recorded' : '—'}</strong></div><div><span>Last updated</span><strong>{movieTimestamps.updatedAt ? new Date(movieTimestamps.updatedAt).toLocaleString() : 'Not saved yet'}</strong></div></div>
        </MovieFormSection>

        <MovieFormSection number="12" title="Movie Problems" description="Check saved movie data, artwork, credits, and whether the public catalog can display this title.">
          <div className="movie-form-problems-toolbar">
            <div className="movie-form-problems-summary">
              <span className={movieProblems.some((problem) => problem.severity === 'critical') ? 'has-critical' : movieProblems.length ? 'has-warning' : 'is-clear'}>
                {auditCheckedFingerprint === currentFormFingerprint
                  ? movieProblems.length ? `${movieProblems.length} problem${movieProblems.length === 1 ? '' : 's'} found` : auditWarning ? 'Partially checked' : 'Healthy'
                  : movieProblems.length ? `${movieProblems.length} form issue${movieProblems.length === 1 ? '' : 's'} found` : 'No form issues detected'}
              </span>
              <small>{auditCheckedFingerprint === currentFormFingerprint
                ? `Database and public catalog checked${auditCheckedAt ? ` at ${new Date(auditCheckedAt).toLocaleTimeString()}` : ''}.`
                : id ? 'Unsaved edits are shown locally. Save changes before rechecking database and public visibility.' : 'Save the movie before checking database and public visibility.'}</small>
            </div>
            <button type="button" className="admin-button admin-button-secondary" onClick={() => runMovieProblemCheck()} disabled={auditLoading || !id || currentFormFingerprint !== persistedFingerprint}>
              <RefreshCw size={14} className={auditLoading ? 'is-spinning' : ''} /> {auditLoading ? 'Checking…' : 'Recheck Problems'}
            </button>
          </div>
          <div className={`movie-form-visibility is-${visibilityInfo.status}`}>
            <span>Public visibility</span>
            <strong>{visibilityInfo.status === 'visible' ? 'Visible in public catalog'
              : visibilityInfo.status === 'draft' ? 'Hidden draft'
                : visibilityInfo.status === 'duplicate' ? 'Suppressed duplicate'
                  : visibilityInfo.status === 'excluded' ? 'Excluded from catalog'
                    : visibilityInfo.status === 'missing-from-catalog' ? 'Not returned by public query'
                      : visibilityInfo.status === 'detail-unavailable' ? 'Public details unavailable'
                        : 'Needs a saved-data check'}</strong>
            <small>{visibilityInfo.reason}</small>
          </div>
          {auditError && <div className="movie-form-audit-error" role="alert"><AlertTriangle size={15} /><span>{auditError}</span></div>}
          {auditWarning && <div className="movie-form-audit-warning" role="status"><AlertTriangle size={15} /><span>{auditWarning}</span></div>}
          {auditLoading && <div className="movie-form-audit-loading"><RefreshCw size={15} className="is-spinning" /> Checking the latest database record, public movie query, and artwork…</div>}
          {!auditLoading && movieProblems.length ? (
            <div className="movie-form-problem-list">
              {movieProblems.map((problem) => (
                <article className={`movie-form-problem is-${problem.severity}`} key={problem.key || problem.code}>
                  <span className="movie-form-problem-icon"><AlertTriangle size={15} /></span>
                  <div className="movie-form-problem-content">
                    <div className="movie-form-problem-title-row">
                      <strong>{problem.problem}</strong>
                      <span className={`movie-form-problem-severity is-${problem.severity}`}>{problem.severity === 'critical' ? 'Critical' : 'Warning'}</span>
                    </div>
                    <p>{problem.reason || problem.why}</p>
                    <small><b>Affected field:</b> {problem.field || 'Movie record'} <span>·</span> <b>Status:</b> {problem.status || 'Unresolved'}</small>
                    {problem.solution && <small><b>Suggested fix:</b> {problem.solution}</small>}
                    <div className="movie-form-problem-actions">
                      <button type="button" onClick={() => focusProblem(problem.field)}>Fix Problem</button>
                      {id && <button type="button" onClick={() => navigate(`/admin/movies/edit/${id}?focus=${encodeURIComponent(problem.field || '')}`, { state: location.state })}>Edit Movie</button>}
                      {id && <button type="button" onClick={() => runMovieProblemCheck()} disabled={auditLoading}>Recheck</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : !auditLoading && auditCheckedFingerprint === currentFormFingerprint ? (
            <div className="movie-form-all-clear"><CheckCircle2 size={17} /> {auditWarning ? 'No display problems detected, but some cast/crew checks could not be completed.' : 'No problems detected. This movie is ready to display.'}</div>
          ) : !auditLoading && movieProblems.length === 0 ? (
            <div className="movie-form-all-clear"><CheckCircle2 size={17} /> No issues detected in the current form fields.</div>
          ) : null}
          {savedAndChecked && <div className="movie-form-save-checked"><CheckCircle2 size={15} /> Changes saved and the movie was rechecked against the database and public catalog.</div>}
          {fixedProblems.length > 0 && <div className="movie-form-fixed-list"><strong><CheckCircle2 size={15} /> Fixed during this edit</strong><span>{fixedProblems.join(' · ')}</span></div>}
        </MovieFormSection>

        <MovieFormSection number="13" title="Movie Preview" description="A live preview of the information visitors will see after publishing.">
          <article className="movie-public-preview"><div className="movie-public-preview-backdrop">{backdropPreview && <img src={backdropPreview} alt="" {...previewImage('backdrop', form.backdrop_url || backdropPreview)} />}</div><div className="movie-public-preview-body"><div className="movie-public-preview-poster">{posterPreview ? <img src={posterPreview} alt={`${form.title || 'Movie'} poster`} {...previewImage('poster', form.poster_url || posterPreview)} /> : <ImagePlus size={24} />}</div><div className="movie-public-preview-copy">{titleImagePreview && <img className="movie-public-preview-title-art" src={titleImagePreview} alt="" {...previewImage('titleImage', form.title_image_url || titleImagePreview)} />}<h3>{form.title || 'Movie title'}</h3><div className="movie-public-preview-meta"><span>★ {form.rating || '—'}</span><span>{form.release_date ? form.release_date.slice(0, 4) : 'Release year'}</span><span>{form.runtime ? `${form.runtime} min` : 'Runtime'}</span><span>{form.age_rating || 'Age rating'}</span></div><div className="movie-public-preview-genres">{selectedGenres.length ? selectedGenres.map((genre) => <span key={genre}>{genre}</span>) : <span className="is-placeholder">Genres</span>}</div><p>{form.description || 'The movie synopsis will appear here.'}</p><div className="movie-preview-details-grid"><div><strong>Cast</strong><span>{centralCast.length ? centralCast.map((person) => person.full_name).join(', ') : 'Cast credits will appear here.'}</span></div><div><strong>Crew</strong><span>{crewMembers.length ? crewMembers.map((person) => `${person.person_name} · ${person.department || person.job || 'Crew'}`).join(', ') : 'Crew credits will appear here.'}</span></div><div><strong>Where to Watch</strong><span>{watchProviders.length ? watchProviders.map((provider) => provider.name).filter(Boolean).join(', ') : 'Streaming providers will appear here.'}</span></div>{form.badges.length > 0 && <div><strong>Badges</strong><span>{form.badges.map((badge) => MOVIE_BADGES.find((option) => option.value === badge)?.label || badge).join(', ')}</span></div>}</div></div></div></article>
        </MovieFormSection>

        <div className="admin-form-actions movie-form-actions"><button type="button" className="btn-secondary" onClick={() => navigate(location.state?.returnTo || '/admin/movies')}>Back</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? (uploadingCredits ? 'Uploading cast and crew...' : 'Saving...') : form.is_published ? (id ? 'Save changes' : 'Publish movie') : 'Save draft'}</button></div>
      </form>
    </div>
  );
};

export default AdminMovieFormPage;
