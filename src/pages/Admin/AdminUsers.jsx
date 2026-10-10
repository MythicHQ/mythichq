import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, Globe, Mail, Search, ShieldCheck, Users, UserRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getProfileAvatarUrl } from '../../services/profileIcons';
import CropImage from '../../components/CropImage';
import SearchClearButton from '../../components/SearchClearButton';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      setLoading(true);
      try {
        if (!supabase) {
          if (active) setUsers([]);
          return;
        }
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (active) setUsers(data || []);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadUsers();
    return () => { active = false; };
  }, []);

  const adminCount = users.filter((user) => user.role === 'admin').length;
  const recentCount = users.filter((user) => {
    if (!user.created_at) return false;
    const createdAt = new Date(user.created_at);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !query || `${user.full_name || ''} ${user.email || ''}`.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || (user.role || 'user') === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, search, roleFilter]);

  useEffect(() => {
    if (!selectedUser) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedUser(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUser]);

  const socialLinks = [
    ['YouTube', selectedUser?.youtube_url],
    ['Instagram', selectedUser?.instagram_url],
    ['X', selectedUser?.x_url],
    ['Website', selectedUser?.website_url],
  ].filter(([, value]) => value);

  const safeExternalUrl = (value) => {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };

  return (
    <div className="admin-page-shell accounts-page">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Accounts</p>
          <h1>People & access</h1>
          <p className="admin-header-copy">Browse the MythicHQ community and review account access.</p>
        </div>
      </div>

      <div className="accounts-metrics" aria-label="Account overview">
        <article className="accounts-metric-card"><span className="accounts-metric-icon"><Users size={18} /></span><div><strong>{users.length}</strong><span>Total accounts</span></div></article>
        <article className="accounts-metric-card"><span className="accounts-metric-icon is-purple"><ShieldCheck size={18} /></span><div><strong>{adminCount}</strong><span>Administrators</span></div></article>
        <article className="accounts-metric-card"><span className="accounts-metric-icon is-blue"><CalendarDays size={18} /></span><div><strong>{recentCount}</strong><span>Joined this month</span></div></article>
      </div>

      <section className="accounts-directory">
        <div className="accounts-directory-heading">
          <div><h2>Account directory</h2><p>{loading ? 'Loading accounts...' : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'account' : 'accounts'}`}</p></div>
          <div className="accounts-tools">
            <label className="accounts-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search accounts" /><SearchClearButton value={search} onClear={() => setSearch('')} label="account search" /></label>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter accounts by role">
              <option value="all">All roles</option><option value="user">Members</option><option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {loading ? <div className="accounts-empty"><span className="accounts-loading-mark" /><strong>Loading accounts</strong><p>Getting the latest account directory.</p></div> : (
          <div className="admin-table-wrap accounts-table-wrap">
            <table className="admin-table accounts-table">
              <thead><tr><th>Account</th><th>Role</th><th>Joined</th><th>Account ID</th><th><span className="sr-only">Details</span></th></tr></thead>
              <tbody>
                {filteredUsers.length ? filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td><div className="account-person"><CropImage className="account-avatar" src={getProfileAvatarUrl(user)} alt="" /><span><strong>{user.full_name || 'MythicHQ member'}</strong><small>{user.email || 'Email unavailable'}</small></span></div></td>
                    <td><span className={`account-role ${user.role === 'admin' ? 'is-admin' : ''}`}><UserRound size={13} />{user.role || 'user'}</span></td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td><span className="account-id">{user.id ? `${String(user.id).slice(0, 8)}…` : '—'}</span></td>
                    <td><button type="button" className="account-view-button" onClick={() => setSelectedUser(user)}>View details</button></td>
                  </tr>
                )) : (
                  <tr><td colSpan="5"><div className="accounts-empty"><strong>{users.length ? 'No matching accounts' : 'No accounts yet'}</strong><p>{users.length ? 'Try a different name, email, or role.' : 'Registered members will appear here.'}</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedUser && (
        <div className="account-detail-overlay" onClick={() => setSelectedUser(null)}>
          <section
            className="account-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="account-detail-header">
              <div className="account-detail-person">
                <CropImage className="account-detail-avatar" src={getProfileAvatarUrl(selectedUser)} alt="" />
                <div>
                  <p className="admin-kicker">Account details</p>
                  <h2 id="account-detail-title">{selectedUser.full_name || selectedUser.username || 'MythicHQ member'}</h2>
                  <span className={`account-role ${selectedUser.role === 'admin' ? 'is-admin' : ''}`}><UserRound size={13} />{selectedUser.role || 'user'}</span>
                </div>
              </div>
              <button type="button" className="profile-close-button" onClick={() => setSelectedUser(null)} aria-label="Close account details"><X size={18} /></button>
            </header>

            <div className="account-detail-content">
              <div className="account-detail-grid">
                <article><span>Full name</span><strong>{selectedUser.full_name || 'Not provided'}</strong></article>
                <article><span>Username</span><strong>{selectedUser.username || 'Not provided'}</strong></article>
                <article><span>Email</span><strong>{selectedUser.email || 'Not available'}</strong></article>
                <article><span>Account ID</span><strong className="account-detail-id">{selectedUser.id || 'Not available'}</strong></article>
                <article><span>Member since</span><strong>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'Not available'}</strong></article>
                <article><span>Last profile update</span><strong>{selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleString() : 'Not available'}</strong></article>
              </div>

              <section className="account-detail-section">
                <h3>Bio</h3>
                <p>{selectedUser.bio || 'No bio has been added.'}</p>
              </section>

              <section className="account-detail-section">
                <h3>Favorite genres</h3>
                <p>{selectedUser.favorite_genres || 'No favorite genres selected.'}</p>
              </section>

              <section className="account-detail-section">
                <h3>Social links</h3>
                {socialLinks.length ? (
                  <div className="account-detail-links">
                    {socialLinks.map(([label, value]) => {
                      const href = safeExternalUrl(value);
                      return href ? (
                        <a key={label} href={href} target="_blank" rel="noreferrer"><Globe size={14} />{label}<ExternalLink size={12} /></a>
                      ) : <span key={label}>{label}: {value}</span>;
                    })}
                  </div>
                ) : <p>No social links added.</p>}
              </section>
            </div>
            <footer className="account-detail-footer">
              {selectedUser.email && <a className="admin-button admin-button-secondary" href={`mailto:${selectedUser.email}`}><Mail size={15} /> Email user</a>}
              <button type="button" className="admin-button admin-button-primary" onClick={() => setSelectedUser(null)}>Done</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
