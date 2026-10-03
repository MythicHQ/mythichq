import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search, ShieldCheck, Users, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const getInitials = (name, email) => {
  const source = String(name || email || 'U').trim();
  return source.includes(' ')
    ? source.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : source.slice(0, 2).toUpperCase();
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

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
            <label className="accounts-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search accounts" /></label>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter accounts by role">
              <option value="all">All roles</option><option value="user">Members</option><option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {loading ? <div className="accounts-empty"><span className="accounts-loading-mark" /><strong>Loading accounts</strong><p>Getting the latest account directory.</p></div> : (
          <div className="admin-table-wrap accounts-table-wrap">
            <table className="admin-table accounts-table">
              <thead><tr><th>Account</th><th>Role</th><th>Joined</th><th>Account ID</th></tr></thead>
              <tbody>
                {filteredUsers.length ? filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td><div className="account-person"><span className="account-avatar">{getInitials(user.full_name, user.email)}</span><span><strong>{user.full_name || 'MythicHQ member'}</strong><small>{user.email || 'Email unavailable'}</small></span></div></td>
                    <td><span className={`account-role ${user.role === 'admin' ? 'is-admin' : ''}`}><UserRound size={13} />{user.role || 'user'}</span></td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td><span className="account-id">{user.id ? `${String(user.id).slice(0, 8)}…` : '—'}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan="4"><div className="accounts-empty"><strong>{users.length ? 'No matching accounts' : 'No accounts yet'}</strong><p>{users.length ? 'Try a different name, email, or role.' : 'Registered members will appear here.'}</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminUsersPage;
