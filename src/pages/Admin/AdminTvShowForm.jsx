import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Eye, ImagePlus, Plus, Trash2, Tv, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { deleteMovieStorageAsset, isSupabaseStoragePath } from '../../services/movieStorage';
import { invalidateCache } from '../../services/requestCache';
import { fetchOttPlatforms } from '../../services/ottPlatforms';
import {
  fetchTvShowForAdmin,
  saveTvShowCast,
  saveTvShowCrew,
  saveTvShowRecord,
  saveTvShowSeasons,
  uploadTvShowAsset,
} from '../../services/tvShows';
import CastCrewEditor from './CastCrewEditor';
import CentralCastSelector from './CentralCastSelector';
import OttProviderEditor from './OttProviderEditor';
import CropImage from '../../components/CropImage';
import ImageCropButton from '../../components/ImageCropButton';
import { copyImageCropSettings } from '../../services/imageCrops';
import SearchClearButton from '../../components/SearchClearButton';

const SHOW_STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'On Hiatus'];
const SCHEDULES = ['Weekly', 'Daily', 'Multiple Episodes Weekly', 'Completed', 'Other'];
const SERIES_TYPES = ['TV Series', 'Web Series', 'Mini-Series', 'Limited Series', 'Anthology'];
const BADGES = [
  ['trending', 'Trending'],
  ['popular', 'Popular'],
  ['rising', 'Rising'],
  ['new', 'New'],
  ['top_rated', 'Top Rated'],
];
const TV_GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Reality', 'Romance', 'Science Fiction', 'Thriller', 'War', 'Western'];
const TV_LANGUAGES = ['English', 'Hindi', 'Kannada', 'Malayalam', 'Marathi', 'Tamil', 'Telugu', 'Bengali', 'Punjabi', 'Gujarati'];
const MEDIA_FIELDS = [
  { key: 'poster_url', label: 'Poster', type: 'poster' },
  { key: 'backdrop_url', label: 'Backdrop', type: 'backdrop' },
  { key: 'title_image_url', label: 'Title Image / Logo', type: 'title' },
  { key: 'banner_url', label: 'Banner', type: 'banner' },
  { key: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' },
];
const SEASON_STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'On Hiatus'];
const EPISODE_STATUSES = ['Upcoming', 'Released', 'Postponed', 'Cancelled'];
const splitCommaSeparated = (value) => [...new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean))];
const emptyForm = {
  title: '',
  content_type: 'tv_show',
  slug: '',
  keywords: '',
  tags: '',
  meta_description: '',
  original_title: '',
  premiere_date: '',
  end_date: '',
  show_status: 'Upcoming',
  country: '',
  age_rating: '',
  production_company: '',
  network: '',
  number_of_seasons: '',
  total_episodes: '',
  average_episode_runtime: '',
  episode_release_schedule: 'Other',
  first_air_date: '',
  last_air_date: '',
  current_season: '',
  current_episode: '',
  series_type: 'TV Series',
  tagline: '',
  short_description: '',
  description: '',
  story: '',
  season_overview: '',
  poster_url: '',
  backdrop_url: '',
  title_image_url: '',
  banner_url: '',
  thumbnail_url: '',
  trailer_url: '',
  teaser_url: '',
  tmdb_rating: '',
  imdb_rating: '',
  user_rating: '',
  vote_count: '',
  popularity: '',
  initial_hype: '',
  badges: [],
  is_trending: false,
  is_popular: false,
  is_rising: false,
  is_new: false,
  is_top_rated: false,
  editors_pick: false,
  is_published: false,
};

const makeSeason = (number) => ({
  local_id: crypto.randomUUID(),
  season_number: String(number),
  title: '',
  overview: '',
  poster_url: '',
  release_date: '',
  status: 'Upcoming',
  episodes: [],
});

const makeEpisode = (number) => ({
  local_id: crypto.randomUUID(),
  episode_number: String(number),
  title: '',
  overview: '',
  air_date: '',
  runtime: '',
  still_url: '',
  trailer_url: '',
  rating: '',
  status: 'Upcoming',
  director: '',
  writer: '',
});

const TvFormSection = ({ number, title, description, children, id }) => (
  <section className="movie-form-section" id={id}>
    <header className="movie-form-section-header">
      <span>{number}</span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </header>
    <div className="movie-form-section-content">{children}</div>
  </section>
);

const isValidHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const reorder = (items, from, to) => {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const AdminTvShowForm = ({ onContentTypeChange = () => {}, lockContentType = false }) => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [genres, setGenres] = useState([]);
  const [genreOptions, setGenreOptions] = useState(TV_GENRES);
  const [genreSearch, setGenreSearch] = useState('');
  const [customGenre, setCustomGenre] = useState('');
  const [languages, setLanguages] = useState([]);
  const [languageSearch, setLanguageSearch] = useState('');
  const [providers, setProviders] = useState([]);
  const [ottPlatforms, setOttPlatforms] = useState([]);
  const [ottPlatformsError, setOttPlatformsError] = useState('');
  const [seasons, setSeasons] = useState([]);
  const [cast, setCast] = useState([]);
  const [crew, setCrew] = useState([]);
  const [heroSelected, setHeroSelected] = useState(false);
  const [mediaFiles, setMediaFiles] = useState({});
  const [mediaPreviews, setMediaPreviews] = useState({});
  const [originalMediaPaths, setOriginalMediaPaths] = useState({});
  const [originalSeasonPaths, setOriginalSeasonPaths] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    setLoading(true);
    fetchTvShowForAdmin(id).then(async (show) => {
      if (!active) return;
      const { data: heroEntry, error: heroError } = await supabase
        .from('hero_tv_shows')
        .select('tv_show_id')
        .eq('tv_show_id', id)
        .maybeSingle();
      if (heroError) throw heroError;
      if (!active) return;
      setHeroSelected(Boolean(heroEntry));
      setForm({
        ...emptyForm,
        ...show,
        keywords: Array.isArray(show.keywords) ? show.keywords.join(', ') : '',
        tags: Array.isArray(show.tags) ? show.tags.join(', ') : '',
        premiere_date: show.premiere_date || '',
        end_date: show.end_date || '',
        first_air_date: show.first_air_date || '',
        last_air_date: show.last_air_date || '',
        number_of_seasons: String(show.number_of_seasons ?? ''),
        total_episodes: String(show.total_episodes ?? ''),
        average_episode_runtime: String(show.average_episode_runtime ?? ''),
        current_season: String(show.current_season ?? ''),
        current_episode: String(show.current_episode ?? ''),
        tmdb_rating: show.tmdb_rating == null ? '' : String(show.tmdb_rating),
        imdb_rating: show.imdb_rating == null ? '' : String(show.imdb_rating),
        user_rating: show.user_rating == null ? '' : String(show.user_rating),
        vote_count: String(show.vote_count ?? ''),
        popularity: String(show.popularity ?? ''),
        initial_hype: show.initial_hype == null ? '' : String(show.initial_hype),
      });
      setGenres((show.genres || []).map((genre) => (typeof genre === 'string' ? genre : genre?.name || '')).filter(Boolean));
      setLanguages(show.languages || []);
      setProviders(Array.isArray(show.watch_providers) ? show.watch_providers : []);
      setSeasons((show.seasons || []).map((season) => ({
        ...season,
        local_id: crypto.randomUUID(),
        season_number: String(season.season_number),
        episodes: (season.episodes || []).map((episode) => ({
          ...episode,
          local_id: crypto.randomUUID(),
          episode_number: String(episode.episode_number),
          runtime: String(episode.runtime || ''),
          rating: episode.rating == null ? '' : String(episode.rating),
          air_date: episode.air_date || '',
        })),
      })));
      setOriginalSeasonPaths((show.seasons || []).flatMap((season) => [
        season.poster_url,
        ...(season.episodes || []).map((episode) => episode.still_url),
      ]).filter((path) => path && isSupabaseStoragePath(path)));
      setCast(show.centralCast || []);
      setCrew(show.crew || []);
      setMediaPreviews({
        poster_url: show.poster_path || '',
        backdrop_url: show.backdrop_path || '',
        title_image_url: show.title_image_display_url || '',
        banner_url: show.banner_display_url || '',
        thumbnail_url: show.thumbnail_display_url || '',
      });
      setOriginalMediaPaths(Object.fromEntries(MEDIA_FIELDS.map(({ key }) => [key, show[key] || ''])));
    }).catch((error) => {
      console.error('Failed to load TV Show:', error);
      if (active) setLoadError(error.message || 'Unable to load this TV Show.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.from('genre_options').select('name').eq('is_active', true).order('name')
      .then(({ data, error }) => {
        if (error) throw error;
        if (active && data?.length) setGenreOptions([...new Set([...TV_GENRES, ...data.map((item) => item.name)])]);
      }).catch((error) => console.error('Failed to load TV Show genre options:', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetchOttPlatforms({ includeDisabled: true }).then((platforms) => {
      if (active) setOttPlatforms(platforms);
    }).catch((error) => {
      console.error('Failed to load OTT platforms for TV Show form:', error);
      if (active) setOttPlatformsError(error.message || 'Unable to load OTT platforms. Apply the ott_platforms.sql migration.');
    });
    return () => { active = false; };
  }, []);

  const visibleGenres = useMemo(() => {
    const query = genreSearch.trim().toLocaleLowerCase();
    return genreOptions.filter((genre) => !query || genre.toLocaleLowerCase().includes(query));
  }, [genreOptions, genreSearch]);
  const visibleLanguages = useMemo(() => {
    const query = languageSearch.trim().toLocaleLowerCase();
    return [...new Set([...TV_LANGUAGES, ...languages])]
      .filter((language) => !query || language.toLocaleLowerCase().includes(query));
  }, [languages, languageSearch]);

  const updateForm = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleGenre = (genre) => setGenres((current) => current.includes(genre)
    ? current.filter((item) => item !== genre)
    : [...current, genre]);

  const addCustomGenre = () => {
    const value = customGenre.trim();
    if (!value) return;
    setGenreOptions((current) => [...new Set([...current, value])]);
    setGenres((current) => [...new Set([...current, value])]);
    setCustomGenre('');
  };

  const updateSeason = (seasonIndex, field, value) => setSeasons((current) => current.map((season, index) => (
    index === seasonIndex ? { ...season, [field]: value } : season
  )));
  const updateEpisode = (seasonIndex, episodeIndex, field, value) => setSeasons((current) => current.map((season, index) => (
    index === seasonIndex
      ? { ...season, episodes: season.episodes.map((episode, itemIndex) => itemIndex === episodeIndex ? { ...episode, [field]: value } : episode) }
      : season
  )));

  const chooseMediaFile = (event, key) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      window.alert('Choose a JPG, PNG, or WEBP image.');
      event.target.value = '';
      return;
    }
    setMediaFiles((current) => ({ ...current, [key]: file }));
    setMediaPreviews((current) => ({ ...current, [key]: URL.createObjectURL(file) }));
    event.target.value = '';
  };

  const removeMedia = (key) => {
    setForm((current) => ({ ...current, [key]: '' }));
    setMediaFiles((current) => ({ ...current, [key]: null }));
    setMediaPreviews((current) => ({ ...current, [key]: '' }));
  };

  const validation = () => {
    const issues = [];
    const add = (field, message, blocking = false) => issues.push({ field, message, blocking });
    const checkImage = (field, label, required = false) => {
      const value = String(form[field] || '').trim();
      if (!value) {
        if (required) add(field, `${label} is missing.`);
      }
      else if (!isSupabaseStoragePath(value) && !value.startsWith('data:image/') && !isValidHttpUrl(value)) add(field, `${label} must be a valid image URL or uploaded image.`);
    };
    if (!form.title.trim()) add('title', 'TV Show title is required.', true);
    const statedSeasonCount = Number(form.number_of_seasons || seasons.length);
    if (!Number.isInteger(statedSeasonCount) || statedSeasonCount < 1) add('series-details', 'Enter at least one season.', true);
    if (seasons.length && statedSeasonCount !== seasons.length) add('series-details', 'The stated season count does not match the Seasons & Episodes section.');
    if (!form.description.trim() && !form.short_description.trim()) add('description', 'Add a full synopsis or short description.');
    checkImage('poster_url', 'Poster', true);
    checkImage('backdrop_url', 'Backdrop', true);
    checkImage('title_image_url', 'Title image');
    checkImage('banner_url', 'Banner');
    checkImage('thumbnail_url', 'Thumbnail');
    if (!genres.length) add('genre', 'Select at least one genre.');
    if (!languages.length) add('languages', 'Select at least one language.');
    if (form.content_type !== 'tv_show') add('content_type', 'Select a valid content type.', true);
    if (form.trailer_url && !isValidHttpUrl(form.trailer_url)) add('trailer_url', 'Trailer URL must be a valid HTTP or HTTPS URL.', true);
    if (form.teaser_url && !isValidHttpUrl(form.teaser_url)) add('teaser_url', 'Teaser URL must be a valid HTTP or HTTPS URL.', true);
    providers.forEach((provider, index) => {
      if (provider.url && !isValidHttpUrl(provider.url)) add(`provider-${index}`, `${provider.name || 'Provider'} URL must be a valid HTTP or HTTPS URL.`, true);
      if (provider.logo_url && !isValidHttpUrl(provider.logo_url) && !isSupabaseStoragePath(provider.logo_url)) add(`provider-${index}`, `${provider.name || 'Provider'} logo URL is invalid.`, true);
    });
    if (!seasons.length) add('add-season', 'Add at least one season.', true);
    const episodeCount = seasons.reduce((count, season) => count + season.episodes.length, 0);
    if (form.total_episodes && Number(form.total_episodes) !== episodeCount) add('series-details', 'The total episode count does not match the Episodes listed under each season.');
    const seasonNumbers = new Set();
    seasons.forEach((season, seasonIndex) => {
      const seasonNumber = Number(season.season_number);
      if (!String(season.season_number).trim() || !Number.isInteger(seasonNumber) || seasonNumber < 0) add(`season-number-${seasonIndex}`, `Season ${seasonIndex + 1} needs a valid season number.`, true);
      if (seasonNumbers.has(seasonNumber)) add(`season-number-${seasonIndex}`, `Season number ${seasonNumber} is duplicated.`, true);
      seasonNumbers.add(seasonNumber);
      const episodeNumbers = new Set();
      season.episodes.forEach((episode, episodeIndex) => {
        const episodeNumber = Number(episode.episode_number);
        if (!String(episode.episode_number).trim() || !Number.isInteger(episodeNumber) || episodeNumber < 0) add(`episode-number-${seasonIndex}-${episodeIndex}`, `Season ${seasonNumber} contains an invalid episode number.`, true);
        if (episodeNumbers.has(episodeNumber)) add(`episode-number-${seasonIndex}-${episodeIndex}`, `Season ${seasonNumber} has duplicate episode number ${episodeNumber}.`, true);
        episodeNumbers.add(episodeNumber);
        if (!episode.title.trim()) add(`episode-title-${seasonIndex}-${episodeIndex}`, `Season ${seasonNumber}, episode ${episodeNumber} needs a title.`, true);
        if (episode.trailer_url && !isValidHttpUrl(episode.trailer_url)) add(`episode-trailer-${seasonIndex}-${episodeIndex}`, `Episode ${episodeNumber} trailer URL is invalid.`, true);
        if (episode.still_url && !isSupabaseStoragePath(episode.still_url) && !episode.still_url.startsWith('data:image/') && !isValidHttpUrl(episode.still_url)) add(`episode-still-${seasonIndex}-${episodeIndex}`, `Episode ${episodeNumber} still image URL is invalid.`, true);
      });
      if (season.poster_url && !isSupabaseStoragePath(season.poster_url) && !season.poster_url.startsWith('data:image/') && !isValidHttpUrl(season.poster_url)) add(`season-poster-${seasonIndex}`, `Season ${seasonNumber} poster URL is invalid.`, true);
    });
    if (!form.is_published) add('publishing', 'This TV Show is a draft and will not appear in public catalog queries.');
    return issues;
  };

  const focusField = (field) => {
    const target = field === 'series-details'
      ? document.getElementById('tv-series-details')
      : document.getElementById(`tv-${field}`) || document.getElementsByName(field)[0];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof target.focus === 'function') target.focus({ preventScroll: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const issues = validation();
    setValidationIssues(issues);
    const firstBlocking = issues.find((issue) => issue.blocking);
    if (firstBlocking) {
      focusField(firstBlocking.field);
      return;
    }
    setSaving(true);
    try {
      if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        keywords: splitCommaSeparated(form.keywords),
        tags: splitCommaSeparated(form.tags),
        meta_description: form.meta_description.trim(),
        original_title: form.original_title.trim(),
        premiere_date: form.premiere_date || null,
        end_date: form.end_date || null,
        show_status: form.show_status,
        country: form.country.trim(),
        age_rating: form.age_rating.trim(),
        production_company: form.production_company.trim(),
        network: form.network.trim(),
        number_of_seasons: Number(form.number_of_seasons || seasons.length),
        total_episodes: Number(form.total_episodes || seasons.reduce((sum, season) => sum + season.episodes.length, 0)),
        episodes_per_season: seasons.map((season) => season.episodes.length),
        average_episode_runtime: Number(form.average_episode_runtime || 0),
        episode_release_schedule: form.episode_release_schedule,
        first_air_date: form.first_air_date || null,
        last_air_date: form.last_air_date || null,
        current_season: Number(form.current_season || 0),
        current_episode: Number(form.current_episode || 0),
        series_type: form.series_type,
        genres,
        languages,
        tagline: form.tagline.trim(),
        short_description: form.short_description.trim(),
        description: form.description.trim(),
        story: form.story.trim(),
        season_overview: form.season_overview.trim(),
        trailer_url: form.trailer_url.trim(),
        teaser_url: form.teaser_url.trim(),
        watch_providers: providers.filter((provider) => provider.name.trim()).map((provider) => {
          const platform = ottPlatforms.find((item) => (
            String(item.id) === String(provider.platform_id)
            || item.name.toLocaleLowerCase() === provider.name.toLocaleLowerCase()
          ));
          return {
            ...provider,
            platform_id: platform?.id ?? provider.platform_id ?? null,
            name: platform?.name || provider.name.trim(),
            logo_url: platform ? platform.logo_url : (provider.logo_url || ''),
          };
        }),
        tmdb_rating: form.tmdb_rating === '' ? null : Number(form.tmdb_rating),
        imdb_rating: form.imdb_rating === '' ? null : Number(form.imdb_rating),
        user_rating: form.user_rating === '' ? null : Number(form.user_rating),
        vote_count: Number(form.vote_count || 0),
        popularity: Number(form.popularity || 0),
        initial_hype: form.initial_hype === '' ? null : Number(form.initial_hype),
        is_trending: form.is_trending,
        is_popular: form.is_popular,
        is_rising: form.is_rising,
        is_new: form.is_new,
        is_top_rated: form.is_top_rated,
        editors_pick: form.editors_pick,
        badges: form.badges || [],
        is_published: form.is_published,
      };
      MEDIA_FIELDS.forEach(({ key }) => {
        if (mediaFiles[key]) return;
        payload[key] = form[key] && !form[key].startsWith('blob:') ? form[key].trim() : '';
      });
      const saved = await saveTvShowRecord(payload, id);
      let heroSelectionWarning = '';
      try {
        if (heroSelected && form.is_published) {
          const { data: currentHero, error: currentHeroError } = await supabase
            .from('hero_tv_shows')
            .select('position')
            .eq('tv_show_id', saved.id)
            .maybeSingle();
          if (currentHeroError) throw currentHeroError;
          if (!currentHero) {
            const { data: lastHero, error: lastHeroError } = await supabase
              .from('hero_tv_shows')
              .select('position')
              .order('position', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (lastHeroError) throw lastHeroError;
            const { error: heroSaveError } = await supabase.from('hero_tv_shows').upsert({
              tv_show_id: saved.id,
              position: Number(lastHero?.position || 0) + 1,
            }, { onConflict: 'tv_show_id' });
            if (heroSaveError) throw heroSaveError;
          }
        } else {
          const { error: heroDeleteError } = await supabase
            .from('hero_tv_shows')
            .delete()
            .eq('tv_show_id', saved.id);
          if (heroDeleteError) throw heroDeleteError;
        }
      } catch (error) {
        console.error('Failed to update TV Show hero selection:', error);
        heroSelectionWarning = error.message || 'Hero selection could not be updated.';
      }
      const newlyUploadedPaths = [];
      const mediaUpdates = {};
      for (const { key, type } of MEDIA_FIELDS) {
        const file = mediaFiles[key];
        if (file) {
          const path = await uploadTvShowAsset({ file, showId: saved.id, mediaType: type });
          mediaUpdates[key] = path;
          newlyUploadedPaths.push(path);
          await copyImageCropSettings(mediaPreviews[key], path);
        }
      }
      if (Object.keys(mediaUpdates).length) {
        const { error } = await supabase.from('tv_shows').update(mediaUpdates).eq('id', saved.id);
        if (error) {
          await Promise.all(newlyUploadedPaths.map((path) => deleteMovieStorageAsset(path)));
          throw error;
        }
      }
      await Promise.all([
        saveTvShowSeasons(saved.id, seasons.map((season, display_order) => ({
          ...season,
          season_number: Number(season.season_number),
          display_order,
          episodes: season.episodes.map((episode, episode_order) => ({
            ...episode,
            episode_number: Number(episode.episode_number),
            runtime: Number(episode.runtime || 0),
            rating: episode.rating === '' ? null : Number(episode.rating),
            display_order: episode_order,
          })),
        }))),
        saveTvShowCast(saved.id, cast),
        saveTvShowCrew(saved.id, crew),
      ]);
      const savedMediaValues = { ...payload, ...mediaUpdates };
      for (const { key } of MEDIA_FIELDS) {
        const oldPath = originalMediaPaths[key];
        const nextPath = savedMediaValues[key] || '';
        if (oldPath && isSupabaseStoragePath(oldPath) && oldPath !== nextPath) await deleteMovieStorageAsset(oldPath);
      }
      const retainedSeasonPaths = new Set(seasons.flatMap((season) => [
        season.poster_url,
        ...season.episodes.map((episode) => episode.still_url),
      ]).filter(Boolean));
      await Promise.all(originalSeasonPaths
        .filter((path) => !retainedSeasonPaths.has(path))
        .map((path) => deleteMovieStorageAsset(path)));
      invalidateCache('catalog:');
      if (!id) {
        if (heroSelectionWarning) window.alert(`TV Show saved, but ${heroSelectionWarning}`);
        navigate(`/admin/tv-shows/edit/${saved.id}`, { replace: true, state: location.state });
        return;
      }
      setMediaFiles({});
      setForm((current) => ({ ...current, ...mediaUpdates }));
      setOriginalMediaPaths(Object.fromEntries(MEDIA_FIELDS.map(({ key }) => [key, savedMediaValues[key] || ''])));
      setOriginalSeasonPaths([...retainedSeasonPaths].filter((path) => isSupabaseStoragePath(path)));
      setValidationIssues(validation().filter((issue) => !issue.blocking));
      const saveMessage = form.is_published ? 'TV Show saved and published.' : 'TV Show saved as a draft.';
      window.alert(heroSelectionWarning ? `${saveMessage} ${heroSelectionWarning}` : saveMessage);
    } catch (error) {
      console.error('Failed to save TV Show:', error);
      window.alert(error.message || 'Unable to save TV Show.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-container"><div className="empty-state"><h3>Loading TV Show…</h3></div></div>;
  if (loadError) return <div className="page-container"><div className="empty-state" role="alert"><h3>Unable to load TV Show</h3><p>{loadError}</p><button className="admin-button admin-button-secondary" type="button" onClick={() => navigate('/admin/movies')}>Back to content library</button></div></div>;

  return (
    <div className="admin-page-shell tv-show-admin-shell">
      <div className="admin-header-row tv-show-admin-header">
        <div>
          <p className="admin-kicker"><span>Content library</span><span className="tv-admin-breadcrumb-separator">/</span><span>{id ? 'Edit TV Show' : 'New TV Show'}</span></p>
          <div className="tv-admin-title-row"><span className="tv-admin-title-icon"><Tv size={22} /></span><h1>{id ? 'Edit TV Show' : 'Add TV Show'}</h1></div>
          <p className="admin-header-copy">Manage series information, seasons, episodes, cast, crew, and publishing.</p>
        </div>
        <span className="tv-admin-header-status"><i /> {form.is_published ? 'Published' : 'Draft'}</span>
      </div>
      <form className="admin-movie-form movie-form-redesigned tv-show-admin-form" onSubmit={handleSubmit}>
        <TvFormSection number="01" title="Basic Information" description="Define the TV Show identity, release details, and network." id="tv-basic">
          <div className="movie-form-grid">
            <label><span>Content Type</span><select value="tv_show" disabled={lockContentType} onChange={(event) => onContentTypeChange(event.target.value)}><option value="movie">Movie</option><option value="tv_show">TV Show</option></select></label>
            <label className="movie-form-span-2"><span>TV Show Title *</span><input id="tv-title" name="title" value={form.title} onChange={updateForm} required placeholder="Enter the TV Show title" /></label>
            <div className="movie-form-field"><span>Title Image / Logo</span><button type="button" className="movie-form-text-button" onClick={() => focusField('title_image_url')}>{form.title_image_url ? 'Edit in TV Show Media' : 'Add in TV Show Media'}</button></div>
            <label><span>Original Title</span><input name="original_title" value={form.original_title} onChange={updateForm} /></label>
            <label><span>Release / Premiere Date</span><input name="premiere_date" type="date" value={form.premiere_date} onChange={updateForm} /></label>
            <label><span>End Date</span><input name="end_date" type="date" value={form.end_date} onChange={updateForm} /></label>
            <label><span>Show Status</span><select name="show_status" value={form.show_status} onChange={updateForm}>{SHOW_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label><span>Country</span><input name="country" value={form.country} onChange={updateForm} /></label>
            <label><span>Age Rating</span><input name="age_rating" value={form.age_rating} onChange={updateForm} placeholder="e.g. TV-14" /></label>
            <label><span>Production Company</span><input name="production_company" value={form.production_company} onChange={updateForm} /></label>
            <label><span>Network / Original Broadcaster</span><input name="network" value={form.network} onChange={updateForm} placeholder="e.g. Netflix" /></label>
            <div className="movie-form-field movie-form-span-2" id="tv-languages"><span className="movie-form-field-label">Language</span><div className="tv-language-search"><input aria-label="Search languages" value={languageSearch} onChange={(event) => setLanguageSearch(event.target.value)} placeholder="Search languages..." /><SearchClearButton value={languageSearch} onClear={() => setLanguageSearch('')} label="language search" /></div><div className="movie-form-choice-list">{visibleLanguages.map((language) => <button type="button" key={language} className={`movie-form-choice ${languages.includes(language) ? 'is-selected' : ''}`} onClick={() => setLanguages((current) => current.includes(language) ? current.filter((value) => value !== language) : [...current, language])} aria-pressed={languages.includes(language)}>{language}</button>)}</div><label><span>Add another language</span><input aria-label="Add custom language" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const value = event.currentTarget.value.trim(); if (value) setLanguages((current) => [...new Set([...current, value])]); event.currentTarget.value = ''; } }} placeholder="Type and press Enter" /></label></div>
          </div>
          <div className="tv-form-subsection" id="tv-series-details">
            <h3>TV Show Details</h3>
          <div className="movie-form-grid">
            <label><span>Number of Seasons *</span><input name="number_of_seasons" type="number" min="1" required value={form.number_of_seasons || (seasons.length ? String(seasons.length) : '')} onChange={updateForm} placeholder={String(seasons.length)} /></label>
            <label><span>Total Number of Episodes</span><input name="total_episodes" type="number" min="0" value={form.total_episodes} onChange={updateForm} placeholder={String(seasons.reduce((count, season) => count + season.episodes.length, 0))} /></label>
            <label><span>Episodes Per Season</span><input value={seasons.map((season) => season.episodes.length).join(', ')} readOnly placeholder="Add episodes in Seasons & Episodes" /></label>
            <label><span>Average Episode Runtime (minutes)</span><input name="average_episode_runtime" type="number" min="0" value={form.average_episode_runtime} onChange={updateForm} /></label>
            <label><span>Episode Release Schedule</span><select name="episode_release_schedule" value={form.episode_release_schedule} onChange={updateForm}>{SCHEDULES.map((schedule) => <option key={schedule}>{schedule}</option>)}</select></label>
            <label><span>First Air Date</span><input name="first_air_date" type="date" value={form.first_air_date} onChange={updateForm} /></label>
            <label><span>Last Air Date</span><input name="last_air_date" type="date" value={form.last_air_date} onChange={updateForm} /></label>
            <label><span>Current Season</span><input name="current_season" type="number" min="0" value={form.current_season} onChange={updateForm} disabled={form.show_status !== 'Ongoing'} /></label>
            <label><span>Current Episode</span><input name="current_episode" type="number" min="0" value={form.current_episode} onChange={updateForm} disabled={form.show_status !== 'Ongoing'} /></label>
            <label><span>Series Type</span><select name="series_type" value={form.series_type} onChange={updateForm}>{SERIES_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          </div>
          </div>

          <div className="tv-form-subsection" id="tv-genre">
            <h3>Genres</h3>
          <div className="movie-genre-search"><SearchIcon /><input aria-label="Search genres" placeholder="Search genres..." value={genreSearch} onChange={(event) => setGenreSearch(event.target.value)} /><SearchClearButton value={genreSearch} onClear={() => setGenreSearch('')} label="genre search" /></div>
          <div className="movie-form-choice-list">{visibleGenres.map((genre) => <button type="button" key={genre} className={`movie-form-choice ${genres.includes(genre) ? 'is-selected' : ''}`} onClick={() => toggleGenre(genre)} aria-pressed={genres.includes(genre)}>{genre}</button>)}</div>
          {genres.length > 0 && <div className="movie-form-selected-chips">{genres.map((genre) => <span className="movie-form-chip is-selected" key={genre}>{genre}<button type="button" aria-label={`Remove ${genre}`} onClick={() => toggleGenre(genre)}><X size={13} /></button></span>)}</div>}
          <div className="movie-form-inline-add"><input value={customGenre} onChange={(event) => setCustomGenre(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomGenre(); } }} placeholder="Add custom genre" /><button type="button" className="admin-button admin-button-secondary" onClick={addCustomGenre}><Plus size={14} /> Add genre</button></div>
          </div>

          <div className="tv-form-subsection" id="tv-story">
            <h3>Description</h3>
          <div className="movie-form-grid">
            <label className="movie-form-span-2"><span>Tagline</span><input name="tagline" value={form.tagline} onChange={updateForm} /></label>
            <label className="movie-form-span-2"><span>Short Description</span><textarea name="short_description" value={form.short_description} onChange={updateForm} rows="3" /></label>
            <label className="movie-form-span-2"><span>Full Synopsis</span><textarea id="tv-description" name="description" className="movie-form-synopsis" value={form.description} onChange={updateForm} rows="6" /></label>
            <label className="movie-form-span-2"><span>Story / Premise</span><textarea name="story" value={form.story} onChange={updateForm} rows="5" /></label>
            <label className="movie-form-span-2"><span>Optional Season Overview</span><textarea name="season_overview" value={form.season_overview} onChange={updateForm} rows="4" /></label>
          </div>
          </div>
        </TvFormSection>

        <TvFormSection number="02" title="Images" description="Upload or link the poster, backdrop, title image, and other show artwork." id="tv-media">
          <div className="movie-media-grid">
            {MEDIA_FIELDS.map(({ key, label }) => (
              <article className="movie-media-card" key={key}>
                <div className="movie-media-preview">{mediaPreviews[key] ? <CropImage src={mediaPreviews[key]} alt={`${label} preview`} /> : <ImagePlus size={24} />}</div>
                <div className="movie-media-controls">
                  <strong>{label}</strong>
                  <label><span>{label} URL</span><input id={`tv-${key}`} name={key} type="text" inputMode="url" value={form[key] || ''} onChange={(event) => {
                    setForm((current) => ({ ...current, [key]: event.target.value }));
                    setMediaPreviews((current) => ({ ...current, [key]: event.target.value }));
                    setMediaFiles((current) => ({ ...current, [key]: null }));
                  }} placeholder="https://..." /></label>
                  <div className="movie-media-actions"><label className="admin-button admin-button-secondary"><ImagePlus size={14} /> {mediaFiles[key] ? 'Replace upload' : 'Upload from device'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseMediaFile(event, key)} /></label><button type="button" className="movie-form-text-button" onClick={() => removeMedia(key)}>Remove</button></div>
                  {mediaPreviews[key] && <ImageCropButton source={mediaPreviews[key]} label={label.toLowerCase()} aspectRatio={key === 'poster_url' ? '2:3' : key === 'backdrop_url' || key === 'banner_url' ? '16:9' : 'original'} />}
                </div>
              </article>
            ))}
          </div>
        </TvFormSection>

        <TvFormSection number="03" title="TV Show Details: Seasons & Episodes" description="Manage season counts, episodes, air dates, and season artwork." id="tv-seasons">
          <div className="tv-season-toolbar"><strong>{seasons.length} {seasons.length === 1 ? 'season' : 'seasons'}</strong><button id="tv-add-season" type="button" className="admin-button admin-button-secondary" onClick={() => setSeasons((current) => [...current, makeSeason(current.length ? Math.max(...current.map((item) => Number(item.season_number) || 0)) + 1 : 1)])}><Plus size={15} /> Add Season</button></div>
          {seasons.map((season, seasonIndex) => (
            <article className="tv-season-card" key={season.local_id || season.id}>
              <header className="tv-season-card-header"><strong>Season {season.season_number || seasonIndex + 1}</strong><div><button type="button" className="admin-icon-btn" aria-label="Move season up" disabled={seasonIndex === 0} onClick={() => setSeasons((current) => reorder(current, seasonIndex, seasonIndex - 1))}>↑</button><button type="button" className="admin-icon-btn" aria-label="Move season down" disabled={seasonIndex === seasons.length - 1} onClick={() => setSeasons((current) => reorder(current, seasonIndex, seasonIndex + 1))}>↓</button><button type="button" className="admin-icon-btn danger" aria-label="Delete season" onClick={() => setSeasons((current) => current.filter((_, index) => index !== seasonIndex))}><Trash2 size={15} /></button></div></header>
              <div className="movie-form-grid">
                <label><span>Season Number *</span><input id={`tv-season-number-${seasonIndex}`} type="number" min="0" value={season.season_number} onChange={(event) => updateSeason(seasonIndex, 'season_number', event.target.value)} /></label>
                <label><span>Season Title</span><input value={season.title || ''} onChange={(event) => updateSeason(seasonIndex, 'title', event.target.value)} placeholder={`Season ${season.season_number}`} /></label>
                <label><span>Season Release Date</span><input type="date" value={season.release_date || ''} onChange={(event) => updateSeason(seasonIndex, 'release_date', event.target.value)} /></label>
                <label><span>Season Status</span><select value={season.status || 'Upcoming'} onChange={(event) => updateSeason(seasonIndex, 'status', event.target.value)}>{SEASON_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                <div className="movie-form-span-2"><label><span>Season Poster URL</span><input id={`tv-season-poster-${seasonIndex}`} value={season.poster_url || ''} onChange={(event) => updateSeason(seasonIndex, 'poster_url', event.target.value)} placeholder="https://..." /></label>{season.poster_url && <ImageCropButton source={season.poster_url} label={`season ${season.season_number} poster`} aspectRatio="2:3" />}</div>
                <label className="movie-form-span-2"><span>Season Overview</span><textarea rows="3" value={season.overview || ''} onChange={(event) => updateSeason(seasonIndex, 'overview', event.target.value)} /></label>
              </div>
              <div className="tv-episode-toolbar"><strong>{season.episodes.length} {season.episodes.length === 1 ? 'episode' : 'episodes'}</strong><button type="button" className="admin-button admin-button-secondary" onClick={() => updateSeason(seasonIndex, 'episodes', [...season.episodes, makeEpisode(season.episodes.length + 1)])}><Plus size={14} /> Add Episode</button></div>
              {season.episodes.map((episode, episodeIndex) => (
                <details className="tv-episode-card" key={episode.local_id || episode.id} open={episodeIndex === 0}>
                  <summary><span>Episode {episode.episode_number || episodeIndex + 1}: {episode.title || 'Untitled episode'}</span><span className="tv-episode-summary-actions"><button type="button" aria-label="Move episode up" disabled={episodeIndex === 0} onClick={(event) => { event.preventDefault(); updateSeason(seasonIndex, 'episodes', reorder(season.episodes, episodeIndex, episodeIndex - 1)); }}>↑</button><button type="button" aria-label="Move episode down" disabled={episodeIndex === season.episodes.length - 1} onClick={(event) => { event.preventDefault(); updateSeason(seasonIndex, 'episodes', reorder(season.episodes, episodeIndex, episodeIndex + 1)); }}>↓</button><button type="button" aria-label="Delete episode" onClick={(event) => { event.preventDefault(); updateSeason(seasonIndex, 'episodes', season.episodes.filter((_, index) => index !== episodeIndex)); }}><Trash2 size={14} /></button></span></summary>
                  <div className="movie-form-grid">
                    <label><span>Episode Number *</span><input id={`tv-episode-number-${seasonIndex}-${episodeIndex}`} type="number" min="0" value={episode.episode_number} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'episode_number', event.target.value)} /></label>
                    <label><span>Episode Title *</span><input id={`tv-episode-title-${seasonIndex}-${episodeIndex}`} value={episode.title} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'title', event.target.value)} /></label>
                    <label><span>Episode Air Date</span><input type="date" value={episode.air_date || ''} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'air_date', event.target.value)} /></label>
                    <label><span>Episode Runtime (minutes)</span><input type="number" min="0" value={episode.runtime || ''} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'runtime', event.target.value)} /></label>
                    <label><span>Episode Rating / 10</span><input type="number" min="0" max="10" step="0.1" value={episode.rating ?? ''} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'rating', event.target.value)} /></label>
                    <label><span>Episode Status</span><select value={episode.status || 'Upcoming'} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'status', event.target.value)}>{EPISODE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                    <div><label><span>Episode Still / Thumbnail URL</span><input id={`tv-episode-still-${seasonIndex}-${episodeIndex}`} value={episode.still_url || ''} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'still_url', event.target.value)} placeholder="https://..." /></label>{episode.still_url && <ImageCropButton source={episode.still_url} label={`episode ${episode.episode_number} thumbnail`} aspectRatio="16:9" />}</div>
                    <label><span>Episode Trailer URL</span><input id={`tv-episode-trailer-${seasonIndex}-${episodeIndex}`} value={episode.trailer_url || ''} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'trailer_url', event.target.value)} placeholder="https://..." /></label>
                    <label><span>Episode Director</span><input value={episode.director || ''} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'director', event.target.value)} /></label>
                    <label><span>Episode Writer</span><input value={episode.writer || ''} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'writer', event.target.value)} /></label>
                    <label className="movie-form-span-2"><span>Episode Overview / Synopsis</span><textarea rows="3" value={episode.overview || ''} onChange={(event) => updateEpisode(seasonIndex, episodeIndex, 'overview', event.target.value)} /></label>
                  </div>
                </details>
              ))}
            </article>
          ))}
          {!seasons.length && <p className="admin-credit-empty">Add a season to start managing episodes.</p>}
        </TvFormSection>

        <TvFormSection number="04" title="Cast & Crew" description="Add cast members and crew, assign roles, and organize credits." id="tv-cast">
          <CentralCastSelector cast={cast} onChange={setCast} />
          <div className="tv-form-subsection" id="tv-crew">
            <h3>Crew</h3>
            <p className="admin-header-copy">Use a role name matching the TV credit, such as Creator, Showrunner, Writer, Producer, Executive Producer, Cinematographer, Editor, Composer, or Production Designer.</p>
            <CastCrewEditor cast={[]} crew={crew} onCastChange={() => {}} onCrewChange={setCrew} showCast={false} />
          </div>
        </TvFormSection>

        <TvFormSection number="05" title="Where to Watch" description="Select streaming platforms and add title-specific watch links." id="tv-providers">
          <OttProviderEditor providers={providers} onChange={setProviders} platforms={ottPlatforms} platformsError={ottPlatformsError} />
        </TvFormSection>

        <TvFormSection number="06" title="Trailer & Media" description="Add trailers and teasers for this series." id="tv-trailer">
          <div className="movie-form-grid">
            <label><span>Trailer URL</span><input id="tv-trailer_url" name="trailer_url" value={form.trailer_url} onChange={updateForm} placeholder="https://..." /></label>
            <label><span>Teaser URL</span><input id="tv-teaser_url" name="teaser_url" value={form.teaser_url} onChange={updateForm} placeholder="https://..." /></label>
          </div>
        </TvFormSection>

        <TvFormSection number="07" title="SEO / Additional Information" description="Set the public URL, search metadata, ratings, and discovery badges." id="tv-ratings">
          <div className="movie-form-grid">
            <label><span>Slug</span><input name="slug" value={form.slug} onChange={updateForm} placeholder="Generated from title if blank" /></label>
            <label className="movie-form-span-2"><span>Keywords (comma-separated)</span><input name="keywords" value={form.keywords} onChange={updateForm} placeholder="mystery, drama, detective" /></label>
            <label className="movie-form-span-2"><span>Tags (comma-separated)</span><input name="tags" value={form.tags} onChange={updateForm} placeholder="award-winning, limited-series" /></label>
            <label className="movie-form-span-2"><span>Meta Description</span><textarea name="meta_description" value={form.meta_description} onChange={updateForm} rows="3" maxLength="320" /></label>
          </div>
          <div className="movie-form-grid">
            <label><span>TMDB Rating / 10</span><input name="tmdb_rating" type="number" min="0" max="10" step="0.1" value={form.tmdb_rating} onChange={updateForm} /></label>
            <label><span>IMDb Rating / 10</span><input name="imdb_rating" type="number" min="0" max="10" step="0.1" value={form.imdb_rating} onChange={updateForm} /></label>
            <label><span>User Rating / 10</span><input name="user_rating" type="number" min="0" max="10" step="0.1" value={form.user_rating} onChange={updateForm} /></label>
            <label><span>Vote Count</span><input name="vote_count" type="number" min="0" value={form.vote_count} onChange={updateForm} /></label>
            <label><span>Popularity</span><input name="popularity" type="number" min="0" step="0.001" value={form.popularity} onChange={updateForm} /></label>
            <label><span>Initial Hype</span><input name="initial_hype" type="number" min="0" max="100" step="0.1" value={form.initial_hype} onChange={updateForm} /></label>
          </div>
          <div className="movie-form-choice-list">{BADGES.map(([key, label]) => <label className="movie-form-choice" key={key}><input type="checkbox" name={key} checked={key === 'editors_pick' ? form.editors_pick : form[`is_${key}`]} onChange={(event) => setForm((current) => ({ ...current, [key === 'editors_pick' ? 'editors_pick' : `is_${key}`]: event.target.checked, badges: event.target.checked ? [...new Set([...(current.badges || []), key])] : (current.badges || []).filter((badge) => badge !== key) }))} />{label}</label>)}</div>
        </TvFormSection>

        <TvFormSection number="08" title="Publishing & Preview" description="Review the listing, choose publishing status, and manage the TV Show hero selection." id="tv-preview">
          <article className="tv-public-preview">
            <div className="tv-public-preview-art">
              {mediaPreviews.backdrop_url && <CropImage className="tv-public-preview-backdrop" src={mediaPreviews.backdrop_url} alt="" />}
              <div className="tv-public-preview-overlay" />
              <div className="tv-public-preview-main">
                <div className="tv-public-preview-poster">{mediaPreviews.poster_url ? <CropImage src={mediaPreviews.poster_url} alt={`${form.title || 'TV Show'} poster`} /> : <ImagePlus size={28} />}</div>
                <div className="tv-public-preview-copy">
                  {mediaPreviews.title_image_url && <CropImage className="tv-public-preview-logo" src={mediaPreviews.title_image_url} alt="" />}
                  <span className="tv-public-preview-kicker">SERIES · {form.show_status}</span>
                  <h3>{form.title || 'TV Show title'}</h3>
                  {form.tagline && <p className="tv-public-preview-tagline">{form.tagline}</p>}
                  <div className="tv-public-preview-meta"><span>{form.premiere_date || 'Premiere date'}</span><span>{seasons.length || form.number_of_seasons || 0} seasons</span><span>{form.total_episodes || seasons.reduce((count, season) => count + season.episodes.length, 0)} episodes</span>{form.average_episode_runtime && <span>{form.average_episode_runtime} min</span>}</div>
                  <div className="tv-public-preview-genres">{genres.length ? genres.map((genre) => <span key={genre}>{genre}</span>) : <span className="is-placeholder">Genres</span>}</div>
                  <p className="tv-public-preview-description">{form.short_description || form.description || 'The series description will appear here.'}</p>
                </div>
              </div>
            </div>
            <footer className="tv-public-preview-footer">
              <div><span>Languages</span><strong>{languages.length ? languages.join(', ') : 'Not selected'}</strong></div>
              <div><span>Where to Watch</span><strong>{providers.length ? providers.map((provider) => provider.name).filter(Boolean).join(', ') : 'No platforms selected'}</strong></div>
              <div><span>Cast</span><strong>{cast.length ? cast.slice(0, 4).map((person) => person.full_name).join(', ') : 'No cast added'}</strong></div>
            </footer>
          </article>
          <div className="tv-form-subsection" id="tv-publishing">
            <h3>Publishing</h3>
          <label className="movie-publish-toggle"><input id="tv-publishing-status" type="checkbox" name="is_published" checked={form.is_published} onChange={(event) => { updateForm(event); if (!event.target.checked) setHeroSelected(false); }} /><span><strong>{form.is_published ? 'Publish Now' : 'Draft'}</strong><small>{form.is_published ? 'Visible in public TV Show browsing and search.' : 'Hidden from all public catalog queries.'}</small></span></label>
            <div className="movie-form-choice-list">
              <label className="movie-form-choice"><input type="checkbox" checked={form.editors_pick} onChange={(event) => setForm((current) => ({ ...current, editors_pick: event.target.checked, badges: event.target.checked ? [...new Set([...(current.badges || []), 'editors_pick'])] : (current.badges || []).filter((badge) => badge !== 'editors_pick') }))} />Featured</label>
              <label className="movie-form-choice"><input type="checkbox" checked={heroSelected} disabled={!form.is_published} onChange={(event) => setHeroSelected(event.target.checked)} />Add to TV Show Hero</label>
            </div>
            <button type="button" className="movie-form-text-button" onClick={() => navigate('/admin/hero-tv-shows')}>Manage TV Show Hero Selection</button>
          </div>
        </TvFormSection>


        {validationIssues.length > 0 && <section className="movie-problem-panel" aria-live="polite"><h2>Validation warnings</h2><ul>{validationIssues.map((issue, index) => <li key={`${issue.field}-${index}`}><button type="button" onClick={() => focusField(issue.field)}>{issue.message} Fix this field</button></li>)}</ul></section>}
        <div className="movie-form-submit-row">
          <button type="button" className="admin-button admin-button-secondary" onClick={() => navigate('/admin/movies')}>Cancel</button>
          {id && form.is_published && (
            <Link
              className="admin-button admin-button-secondary"
              to={`/tv-show/${encodeURIComponent(id)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Eye size={15} /> View TV Show
            </Link>
          )}
          <button type="submit" className="admin-button admin-button-primary" disabled={saving}>{saving ? 'Saving TV Show…' : form.is_published ? 'Save & Publish TV Show' : 'Save TV Show Draft'}</button>
        </div>
      </form>
    </div>
  );
};

const SearchIcon = () => <span aria-hidden="true" className="movie-genre-search-icon">⌕</span>;

export default AdminTvShowForm;
