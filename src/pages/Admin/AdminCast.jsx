import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Film, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { deleteCastMember, loadCastMembers } from '../../services/castMembers';
import CastMemberDialog from './CastMemberDialog';
import CropImage from '../../components/CropImage';
import SearchClearButton from '../../components/SearchClearButton';
import '../../styles/admin.css';

const PAGE_SIZE = 24;

const AdminCastPage = () => {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [dialogMember, setDialogMember] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async ({ nextPage = 0, append = false } = {}) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const result = await loadCastMembers({ page: nextPage, pageSize: PAGE_SIZE, query });
      setMembers((current) => append ? [...current, ...result.members] : result.members);
      setTotal(result.count);
      setPage(nextPage);
    } catch (loadError) {
      console.error('Failed to load cast directory:', loadError);
      setError(loadError.message || 'Unable to load cast members.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const removeMember = async (member) => {
    const linkedMovies = Number(member.movie_count || 0);
    const warning = linkedMovies
      ? `Delete ${member.full_name}? This will also remove them from ${linkedMovies} movie${linkedMovies === 1 ? '' : 's'}.`
      : `Delete ${member.full_name}? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    try {
      await deleteCastMember(member.id);
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setTotal((current) => Math.max(0, current - 1));
    } catch (deleteError) {
      console.error('Failed to delete cast member:', deleteError);
      setError(deleteError.message || 'Unable to delete this cast member.');
    }
  };

  const refreshAfterSave = async (saved) => {
    await load();
    setMembers((current) => current.some((item) => item.id === saved.id)
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current]);
  };

  return (
    <div className="admin-page-shell cast-directory-page">
      <div className="admin-header-row">
        <div><p className="admin-kicker">CONTENT / PEOPLE</p><h1>Cast</h1><p className="admin-header-copy">One shared cast directory for every movie.</p></div>
        <div className="admin-header-actions"><button type="button" className="admin-button admin-button-primary" onClick={() => { setDialogMember(null); setDialogOpen(true); }}><Plus size={16} /> Add New Cast</button></div>
      </div>
      <div className="cast-directory-toolbar">
        <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cast by name or profession…" aria-label="Search cast" /><SearchClearButton value={query} onClear={() => setQuery('')} label="cast search" /></label>
        <span>{total} {total === 1 ? 'cast member' : 'cast members'}</span>
      </div>
      {error && <div className="admin-error-banner" role="alert">{error}</div>}
      {loading ? <div className="cast-directory-state"><LoaderCircle className="viewer-spinner" size={22} /> Loading cast directory…</div>
        : members.length ? (
          <>
            <div className="cast-directory-grid">
              {members.map((member) => (
                <article className="cast-directory-card" key={member.id}>
                  <Link className="cast-directory-main-link" to={`/admin/cast/${member.id}`}>
                    <div className="cast-directory-photo">{member.profile_image_url ? <CropImage src={member.profile_image_url} alt="" /> : <span>{member.full_name.slice(0, 1).toUpperCase()}</span>}</div>
                    <div className="cast-directory-info">
                    <div className="cast-directory-title"><div><h2>{member.full_name}</h2><span>{member.profession || 'Actor'} · <b>{member.movie_count} Movies</b></span></div>
                    </div>
                    {member.biography && <p>{member.biography}</p>}
                    <div className="cast-directory-meta"><span><Film size={13} /> {member.movie_count} movies</span>{member.nationality && <span>{member.nationality}</span>}{member.date_of_birth && <span>{member.date_of_birth}</span>}<span>Added {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'recently'}</span></div>
                    <div className="cast-directory-socials">{[['Instagram', member.instagram_url], ['X', member.x_url], ['Facebook', member.facebook_url], ['Website', member.website_url]].filter(([, url]) => url).map(([label, url]) => <span key={label}>{label}</span>)}</div>
                    </div>
                  </Link>
                  <div className="cast-directory-actions">
                      <button type="button" className="admin-icon-btn" aria-label={`Edit ${member.full_name}`} onClick={() => { setDialogMember(member); setDialogOpen(true); }}><Pencil size={14} /></button>
                      <button type="button" className="admin-icon-btn danger" aria-label={`Delete ${member.full_name}`} onClick={() => void removeMember(member)}><Trash2 size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
            {members.length < total && <button type="button" className="admin-button admin-button-secondary cast-load-more" disabled={loadingMore} onClick={() => void load({ nextPage: page + 1, append: true })}>{loadingMore ? 'Loading…' : 'Load more cast'}</button>}
          </>
        ) : <div className="cast-directory-empty"><Film size={28} /><strong>{query ? 'No matching cast members' : 'No cast members yet'}</strong><span>{query ? 'Try another name or profession.' : 'Add a cast member to make them available in movie forms.'}</span></div>}
      {dialogOpen && <CastMemberDialog member={dialogMember} onClose={() => setDialogOpen(false)} onSaved={refreshAfterSave} />}
    </div>
  );
};

export default AdminCastPage;
