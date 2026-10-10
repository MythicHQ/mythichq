import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Film, Shield, Users, Settings, LogOut, FileText, LayoutDashboard, Plus, Menu, X, SlidersHorizontal, ExternalLink, Bell, Mail, Image, UserRound, AlertTriangle, Tv } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getProfileAvatarUrl } from '../../services/profileIcons';
import CropImage from '../../components/CropImage';
import '../../styles/admin.css';

const navSections = [
  { label: 'Main', items: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard size={17} /> },
    { label: 'Content library', to: '/admin/movies', icon: <Film size={17} /> },
    { label: 'Movie Problems', to: '/admin/movie-problems', icon: <AlertTriangle size={17} /> },
    { label: 'Cast', to: '/admin/cast', icon: <UserRound size={17} /> },
    { label: 'OTT Platform', to: '/admin/ott-platforms', icon: <Tv size={17} /> },
    { label: 'Add Movie', to: '/admin/movies/add', icon: <Plus size={17} /> },
  ] },
  { label: 'Curated Sections', items: [
    { label: 'Home Hero Selection', to: '/admin/hero', icon: <Film size={17} /> },
    { label: 'Hero TV Show', to: '/admin/hero-tv-shows', icon: <Tv size={17} /> },
    { label: 'Trending Now', to: '/admin/curated/trending', icon: <Film size={17} /> },
    { label: 'New Releases', to: '/admin/curated/new-releases', icon: <Film size={17} /> },
    { label: 'Top Rated Masterpieces', to: '/admin/curated/top-rated-masterpieces', icon: <Film size={17} /> },
    { label: 'Hidden Gems', to: '/admin/curated/hidden-gems', icon: <Film size={17} /> },
  ] },
  { label: 'Content', items: [
    { label: 'Reviews', to: '/admin/reviews', icon: <FileText size={17} /> },
    { label: 'Contact Inbox', to: '/admin/contact-messages', icon: <Mail size={17} /> },
    { label: 'Accounts', to: '/admin/users', icon: <Users size={17} /> },
    { label: 'Profile Icons', to: '/admin/profile-icons', icon: <Image size={17} /> },
  ] },
  { label: 'NOTIFICATIONS', items: [
    { label: 'Notifications', to: '/admin/notifications', icon: <Bell size={17} /> },
  ] },
  { label: 'System', items: [
    { label: 'Settings', to: '/admin/settings', icon: <Settings size={17} /> },
  ] },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('admin-mode');
    return () => document.body.classList.remove('admin-mode');
  }, []);

  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className={`admin-layout ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <div className="admin-mobile-backdrop" onClick={() => setMobileOpen(false)} />
      <aside className="admin-sidebar">
        <div className="admin-brand-block">
          <div className="logo-icon-box small-logo">
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <strong>MythicHQ</strong>
            <span>Content Studio</span>
          </div>
          <button className="admin-close-mobile" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="admin-nav">
          {navSections.map((section) => (
            <div className="admin-nav-section" key={section.label}>
              <span className="admin-nav-label">{section.label}</span>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                  {item.icon}<span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink to="/" className="admin-view-site"><ExternalLink size={16} /><span>View website</span></NavLink>
          <button className="admin-logout" onClick={handleSignOut}>
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="admin-main-panel">
        <header className="admin-topbar">
          <button className="admin-menu-toggle" onClick={() => setMobileOpen(true)} aria-label="Open admin menu"><Menu size={20} /></button>
          <div className="admin-breadcrumb"><span>Workspace</span><strong> / {window.location.pathname.split('/').filter(Boolean).pop() || 'dashboard'}</strong></div>
          <div className="admin-topbar-actions">
            <span className="admin-status-dot"><i /> Live</span>
            <div className="admin-user-chip"><CropImage src={getProfileAvatarUrl(profile, user)} alt="" /><strong>{profile?.full_name || 'Admin'}</strong></div>
            <button className="admin-collapse-toggle" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar"><SlidersHorizontal size={17} /></button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
