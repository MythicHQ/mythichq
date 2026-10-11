import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Film, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react';
import {
  addCastMemberToMovie,
  getCastMember,
  loadCastMemberMovies,
  removeCastMemberFromMovie,
  searchMoviesForCast,
  updateCastMovieLink,
} from '../../services/castMembers';
import CastMemberDialog from './CastMemberDialog';
import CropImage from '../../components/CropImage';
import SearchClearButton from '../../components/SearchClearButton';
import '../../styles/admin.css';

const movieYear = (date) => date ? String(date).slice(0, 4) : 'Year unknown';

const AdminCastDetailsPage = () => {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [movies, setMovies] = useState([]);
  const [query, setQuery] = useState('');
  const [movieResults, setMovieResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextMember, nextMovies] = await Promise.all([getCastMember(id), loadCastMemberMovies(id)]);
      setMember(nextMember);
      setMovies(nextMovies);
    } catch (loadError) {
      console.error('Failed to load cast member details:', loadError);
      setError(loadError.message || 'Unable to load cast member details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setMovieResults([]);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const results = await searchMoviesForCast(query);
        if (active) {
          const linkedIds = new Set(movies.map((item) => String(item.movie_id)));
          setMovieResults(results.filter((movie) => !linkedIds.has(String(movie.id))));
        }
      } catch (searchError) {
        console.error('Failed to search movies for cast connection:', searchError);
        if (active) setError(searchError.message || 'Unable to search movies.');
      } finally {
        if (active) setSearching(false);
      }
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [movies, query]);

  const titleCount = movies.length;
  const sortedMovies = useMemo(() => [
    ...movies.filter((item) => item.content_type !== 'tv_show').sort((a, b) => Number(a.cast_order) - Number(b.cast_order)),
    ...movies.filter((item) => item.content_type === 'tv_show').sort((a, b) => Number(a.cast_order) - Number(b.cast_order)),
  ], [movies]);

  const addMovie = async (movie) => {
    if (!member) return;
    setSaving(true);
    setError('');
    try {
      await addCastMemberToMovie(member, movie.id);
      setQuery('');
      setMovieResults([]);
      setNotice(`${movie.title} added to ${member.full_name}.`);
      await load();
    } catch (addError) {
      console.error('Failed to add cast member to movie:', addError);
      setError(addError.message || 'Unable to add this movie.');
    } finally {
      setSaving(false);
    }
  };

  const removeMovie = async (link) => {
    const title = link.movie_record.title || 'this movie';
    if (!window.confirm(`Remove ${member.full_name} from "${title}"? The cast profile will remain in the directory.`)) return;
    setSaving(true);
    setError('');
    try {
      await removeCastMemberFromMovie(link);
      const remainingMovies = sortedMovies.filter((item) => item.content_type !== 'tv_show' && item.id !== link.id);
      const tvShowLinks = sortedMovies.filter((item) => item.content_type === 'tv_show');
      await Promise.all(remainingMovies.map((item, index) => updateCastMovieLink(item.id, {
        cast_order: index,
        display_order: index,
        credit_order: index,
      })));
      setMovies([...remainingMovies.map((item, index) => ({ ...item, cast_order: index })), ...tvShowLinks]);
      setNotice(`Removed from ${title}.`);
    } catch (removeError) {
      console.error('Failed to remove cast/movie connection:', removeError);
      setError(removeError.message || 'Unable to remove this movie connection.');
    } finally {
      setSaving(false);
    }
  };

  const persistOrder = async (from, to) => {
    const movieLinks = sortedMovies.filter((item) => item.content_type !== 'tv_show');
    const tvShowLinks = sortedMovies.filter((item) => item.content_type === 'tv_show');
    if (to < 0 || to >= movieLinks.length || from === to) return;
    const next = [...movieLinks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setMovies([...next.map((item, index) => ({ ...item, cast_order: index })), ...tvShowLinks]);
    setSaving(true);
    setError('');
    try {
      await Promise.all(next.map((item, index) => updateCastMovieLink(item.id, {
        cast_order: index,
        display_order: index,
        credit_order: index,
      })));
    } catch (orderError) {
      console.error('Failed to save cast order:', orderError);
      setError(orderError.message || 'Unable to save movie cast order.');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveCharacter = async (link, characterName) => {
    const value = characterName.trim();
    if (value === (link.character_name || '')) return;
    setError('');
    try {
      await updateCastMovieLink(link.id, { character_name: value });
      setMovies((current) => current.map((item) => item.id === link.id ? { ...item, character_name: value } : item));
      setNotice('Character name saved.');
    } catch (characterError) {
      console.error('Failed to update cast character name:', characterError);
      setError(characterError.message || 'Unable to update the character name.');
    }
  };

  if (loading) return <div className="admin-page-shell"><div className="cast-directory-state"><LoaderCircle className="viewer-spinner" size={22} /> Loading cast profile…</div></div>;
  if (!member) return <div className="admin-page-shell"><div className="admin-error-banner" role="alert">{error || 'Cast member not found.'}</div><Link className="admin-button admin-button-secondary" to="/admin/cast"><ArrowLeft size={15} /> Back to Cast</Link></div>;

  return (
    <div className="admin-page-shell cast-profile-page">
      <Link className="admin-button admin-button-secondary cast-profile-back" to="/admin/cast"><ArrowLeft size={15} /> Cast directory</Link>
      <section className="cast-profile-hero">
        <div className="cast-profile-portrait">{member.profile_image_url ? <CropImage src={member.profile_image_url} alt={`${member.full_name}`} /> : <span>{member.full_name.slice(0, 1).toUpperCase()}</span>}</div>
        <div className="cast-profile-copy">
          <span className="admin-kicker">CAST PROFILE</span>
          <h1>{member.full_name}</h1>
          <p>{member.profession || 'Actor'}{member.nationality ? ` · ${member.nationality}` : ''}</p>
          <div className="cast-profile-movie-count"><Film size={16} /><strong>Movies & TV Shows: {titleCount}</strong></div>
          {member.biography && <p className="cast-profile-biography">{member.biography}</p>}
          <div className="cast-profile-socials">{[['Instagram', member.instagram_url], ['X / Twitter', member.x_url], ['Facebook', member.facebook_url], ['Website', member.website_url]].filter(([, url]) => url).map(([label, url]) => <a href={url} target="_blank" rel="noreferrer" key={label}>{label}</a>)}</div>
        </div>
        <button type="button" className="admin-button admin-button-secondary cast-profile-edit" onClick={() => setDialogOpen(true)}>Edit profile</button>
      </section>

      <section className="cast-profile-movies-section">
        <div className="cast-profile-section-header"><div><p className="admin-kicker">FILMOGRAPHY</p><h2>Movies & TV Shows featuring {member.full_name}</h2></div><span>{titleCount} {titleCount === 1 ? 'title' : 'titles'}</span></div>
        {error && <div className="admin-error-banner" role="alert">{error}</div>}
        {notice && <div className="cast-profile-notice" role="status">{notice}</div>}

        <div className="cast-movie-search-wrap">
          <label className="cast-movie-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies to add this cast member…" aria-label="Search movies to add" /><SearchClearButton value={query} onClear={() => setQuery('')} label="movie search" /></label>
          {searching && <span className="cast-movie-search-status"><LoaderCircle className="viewer-spinner" size={14} /> Searching movies…</span>}
          {query.trim().length >= 2 && !searching && movieResults.length > 0 && <div className="cast-movie-search-results">
            {movieResults.map((movie) => <button key={movie.id} type="button" disabled={saving} onClick={() => void addMovie(movie)}>
              {movie.poster_display_url ? <CropImage src={movie.poster_display_url} alt="" /> : <span className="cast-movie-poster-fallback"><Film size={17} /></span>}
              <span><strong>{movie.title}</strong><small>{movieYear(movie.release_date)} · {movie.movie_status || (movie.is_published === false ? 'Draft' : 'Published')}</small></span>
              <Plus size={16} />
            </button>)}
          </div>}
          {query.trim().length >= 2 && !searching && movieResults.length === 0 && <p className="cast-movie-search-empty">No unlinked movies found.</p>}
        </div>

        {sortedMovies.length ? <div className="cast-filmography-list">
          {sortedMovies.map((link, index) => {
            const movie = link.movie_record;
            return <article className="cast-filmography-row" key={link.id}>
              <div className="cast-filmography-poster">{link.movie ? <CropImage src={link.movie} alt="" /> : <span><Film size={20} /></span>}</div>
              <div className="cast-filmography-title"><strong>{movie.title}</strong><span>{movie.content_type === 'tv_show' ? 'TV Show' : 'Movie'} · {movieYear(movie.release_date)} · {movie.movie_status || (movie.is_published === false ? 'Draft' : 'Published')}</span></div>
              {movie.content_type === 'tv_show'
                ? <span className="cast-filmography-character">{link.character_name || 'No character set'}</span>
                : <label className="cast-filmography-character"><span>Character</span><input key={`${link.id}-${link.character_name}`} defaultValue={link.character_name || ''} placeholder="Add character name" onBlur={(event) => void saveCharacter(link, event.target.value)} /></label>}
              <div className="cast-filmography-actions">
                {movie.content_type === 'tv_show'
                  ? <Link className="admin-button admin-button-secondary" to={`/admin/tv-shows/edit/${movie.id}`}>Edit TV Show</Link>
                  : <><button type="button" title="Move up" aria-label={`Move ${movie.title} up`} disabled={saving || index === 0} onClick={() => void persistOrder(index, index - 1)}><ArrowUp size={15} /></button>
                    <button type="button" title="Move down" aria-label={`Move ${movie.title} down`} disabled={saving || index === sortedMovies.filter((item) => item.content_type !== 'tv_show').length - 1} onClick={() => void persistOrder(index, index + 1)}><ArrowDown size={15} /></button>
                    <Link className="admin-button admin-button-secondary" to={`/admin/movies/edit/${movie.id}`}>Edit movie</Link>
                    <button type="button" className="is-danger" title="Remove from movie" aria-label={`Remove ${member.full_name} from ${movie.title}`} disabled={saving} onClick={() => void removeMovie(link)}><Trash2 size={15} /></button></>}
              </div>
            </article>;
          })}
        </div> : <div className="cast-directory-empty"><Film size={28} /><strong>No movies linked yet</strong><span>Search for a movie above to add this cast member. The cast profile will stay in the directory if a movie link is removed.</span></div>}
      </section>
      {dialogOpen && <CastMemberDialog member={member} onClose={() => setDialogOpen(false)} onSaved={async () => { setDialogOpen(false); await load(); }} />}
    </div>
  );
};

export default AdminCastDetailsPage;
