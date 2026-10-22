import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Film,
  Tv,
  Home,
  Flame,
  Search,
  Bookmark,
  Calendar,
  User,
  Menu,
  X,
  Dices,
  Compass,
  Languages,
  Building2,
  Bell,
  ChevronDown,
  Settings,
  Maximize2,
  Minimize2,
} from 'lucide-react';

import { useWatchlist } from '../pages/Admin/WatchlistContext';
import { useAuth } from '../pages/Admin/AuthContext';
import { useNotifications } from '../pages/Admin/NotificationContext';
import RandomPickerModal from './RandomPickerModal';
import { fetchPublicMovies, getMovieDetailRoute } from '../services/movieCatalog';
import { getPosterDisplayUrl } from '../services/tmdb';
import { getProfileAvatarUrl } from '../services/profileIcons';
import ViewerProfileAvatar from './ViewerProfileAvatar';
import CropImage from './CropImage';
import SearchClearButton from './SearchClearButton';
import MobileBottomNavigation from './MobileBottomNavigation';
import {
  getMovieSuggestions,
  normalizeSearchText,
} from '../utils/movieSearch';

const formatNotificationTime = (timestamp) => {
  if (!timestamp) return null;

  const elapsedSeconds = (new Date(timestamp).getTime() - Date.now()) / 1000;
  if (!Number.isFinite(elapsedSeconds)) return null;
  if (Math.abs(elapsedSeconds) < 60) return 'just now';

  const units = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];
  const [unit, secondsPerUnit] = units.find(([, seconds]) => Math.abs(elapsedSeconds) >= seconds);
  return new Intl.RelativeTimeFormat('en', { numeric: 'always' })
    .format(Math.round(elapsedSeconds / secondsPerUnit), unit);
};

const Navbar = ({ onPlayTrailer }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { watchlist } = useWatchlist();
  const { user, profile, selectedViewerProfile, signOut } = useAuth();
  const { notifications, unreadCount, markNotificationAsRead, markAllAsRead } = useNotifications();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationDetailFullScreen, setNotificationDetailFullScreen] = useState(false);
  const [profileGreetingAnimated, setProfileGreetingAnimated] = useState(false);
  const [profileGreetingVisible, setProfileGreetingVisible] = useState(false);
  const [catalogMovies, setCatalogMovies] = useState([]);

  const searchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);

  useEffect(() => {
    if (!selectedNotification) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedNotification(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNotification]);

  /*
   * --------------------------------------------------
   * Scroll Handler
   * --------------------------------------------------
   */
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  /*
   * --------------------------------------------------
   * Close menus when route changes
   * --------------------------------------------------
   */
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setExploreOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  /*
   * --------------------------------------------------
   * Close Explore/Profile when clicking outside
   * --------------------------------------------------
   */
  useEffect(() => {
    const closeMenusOnOutsideClick = (event) => {
      const target = event.target;

      if (!target.closest('.explore-nav-item')) {
        setExploreOpen(false);
      }

      if (!target.closest('.profile-nav-item')) {
        setProfileOpen(false);
      }

      if (
        !target.closest('.nav-search-form') &&
        !target.closest('.mobile-search-form')
      ) {
        // Keep search state unchanged here so typing isn't interrupted.
      }
    };

    document.addEventListener('pointerdown', closeMenusOnOutsideClick);

    return () => {
      document.removeEventListener('pointerdown', closeMenusOnOutsideClick);
    };
  }, []);

  /*
   * --------------------------------------------------
   * Close search on browser history navigation
   * --------------------------------------------------
   */
  useEffect(() => {
    const closeSearchOnHistoryChange = () => {
      setSearchOpen(false);
    };

    window.addEventListener('popstate', closeSearchOnHistoryChange);

    return () => {
      window.removeEventListener('popstate', closeSearchOnHistoryChange);
    };
  }, []);

  /*
   * --------------------------------------------------
   * One-time profile greeting animation
   * --------------------------------------------------
   */
  useEffect(() => {
    if (!user) {
      setProfileGreetingAnimated(false);
      setProfileGreetingVisible(false);
      return;
    }

    if (profileGreetingAnimated) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setProfileGreetingAnimated(true);
      setProfileGreetingVisible(true);
    });

    const hideGreetingTimer = window.setTimeout(() => {
      setProfileGreetingVisible(false);
    }, 3000);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(hideGreetingTimer);
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    fetchPublicMovies()
      .then((movies) => {
        if (isMounted) {
          setCatalogMovies(movies);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCatalogMovies([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * --------------------------------------------------
   * Search Suggestions
   * --------------------------------------------------
   */
  const quickSuggestions = getMovieSuggestions(
    catalogMovies,
    quickSearch,
    5
  );

  const renderQuickSuggestions = () => {
    if (normalizeSearchText(quickSearch).length < 2 || quickSuggestions.length === 0) return null;

    return (
      <div className="nav-search-suggestions" aria-label="Movie suggestions">
        {quickSuggestions.map((movie) => {
          const posterUrl = getPosterDisplayUrl(movie.poster_path, 'w92');
          return (
            <button
              key={`${movie.record_type || 'movie'}-${movie.id}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                navigate(getMovieDetailRoute(movie));
                setQuickSearch('');
                setSearchOpen(false);
              }}
            >
              <span className="nav-search-suggestion-poster-wrap">
                {posterUrl ? (
                  <img
                    className="nav-search-suggestion-poster"
                    src={posterUrl}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                      event.currentTarget.nextElementSibling.style.display = 'grid';
                    }}
                  />
                ) : null}
                <span
                  className="nav-search-suggestion-poster-fallback"
                  style={{ display: posterUrl ? 'none' : 'grid' }}
                  aria-hidden="true"
                >
                  {movie.record_type === 'tv_show' ? <Tv size={15} /> : <Film size={15} />}
                </span>
              </span>
              <span className="nav-search-suggestion-copy">
                <strong>{movie.title}</strong>
                <small>{movie.record_type === 'tv_show' ? 'TV Show' : 'Movie'} · {movie.release_date?.slice(0, 4) || 'TBA'}</small>
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const openMobileSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => mobileSearchInputRef.current?.focus());
  };

  /*
   * --------------------------------------------------
   * Navigation Items
   * --------------------------------------------------
   */
  const navItems = [
    {
      label: 'Home',
      path: '/',
      icon: <Home size={18} />,
    },
    {
      label: 'Movies',
      path: '/movies',
      icon: <Film size={18} />,
    },
    {
      label: 'TV Shows',
      path: '/tv-shows',
      icon: <Tv size={18} />,
    },
    {
      label: 'Studios',
      path: '/studios',
      icon: <Building2 size={18} />,
    },
    {
      label: 'Trending',
      path: '/trending',
      icon: <Flame size={18} />,
    },
  ];

  /*
   * --------------------------------------------------
   * Explore Items
   * --------------------------------------------------
   */
  const exploreItems = [
    {
      label: 'Search',
      path: '/search',
      icon: <Search size={17} />,
    },
    {
      label: 'Top Rated',
      path: '/top-rated',
      icon: <Flame size={17} />,
    },
    {
      label: 'Genres',
      path: '/genres',
      icon: <Compass size={17} />,
    },
    {
      label: 'Languages',
      path: '/languages',
      icon: <Languages size={17} />,
    },
    {
      label: 'Upcoming',
      path: '/upcoming',
      icon: <Calendar size={17} />,
    },
  ];

  /*
   * --------------------------------------------------
   * Active Explore State
   * --------------------------------------------------
   */
  const isExploreActive = exploreItems.some(
    (item) => location.pathname === item.path
  );

  /*
   * --------------------------------------------------
   * Profile Information
   * --------------------------------------------------
   */
  const profileDisplayName =
    selectedViewerProfile?.name ||
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'Profile';

  const profileAvatarUrl = getProfileAvatarUrl(profile, user);

  /*
   * --------------------------------------------------
   * Search Submit
   * --------------------------------------------------
   */
  const handleQuickSearchSubmit = (event) => {
    event.preventDefault();

    const normalizedQuery = normalizeSearchText(quickSearch);

    if (normalizedQuery.length >= 2) {
      navigate(
        `/search?q=${encodeURIComponent(normalizedQuery)}`
      );

      setQuickSearch('');
      setSearchOpen(false);
    }
  };

  /*
   * --------------------------------------------------
   * Open Search
   * --------------------------------------------------
   */
  const openSearch = () => {
    setSearchOpen(true);

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  /*
   * --------------------------------------------------
   * Sign Out
   * --------------------------------------------------
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  /*
   * --------------------------------------------------
   * Close Everything
   * --------------------------------------------------
   */
  const closeAllMenus = () => {
    setSearchOpen(false);
    setExploreOpen(false);
    setProfileOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`navbar ${
          isScrolled ? 'scrolled' : ''
        }`}
      >
        <div className="navbar-container">

          {/* =========================
              Brand Logo
          ========================== */}
          <NavLink
            to="/"
            className="navbar-logo"
            onClick={closeAllMenus}
          >
            <img src="/mythichq-logo.png" alt="" className="navbar-brand-mark" />

            <span className="logo-text">
              Mythic
              <span className="logo-accent">HQ</span>
            </span>
          </NavLink>

          <div className="navbar-mobile-actions" aria-label="Quick links">
            <button type="button" className="navbar-mobile-action" onClick={openMobileSearch} aria-label="Search MythicHQ" title="Search" aria-expanded={searchOpen}>
              <Search size={19} />
            </button>
            <NavLink to="/watchlist" className="navbar-mobile-action" aria-label="Open My List" title="My List">
              <Bookmark size={18} />
              {watchlist.length > 0 && <span className="navbar-mobile-badge">{watchlist.length > 9 ? '9+' : watchlist.length}</span>}
            </NavLink>
          </div>

          {searchOpen && (
            <form className="mobile-nav-search-panel" onSubmit={handleQuickSearchSubmit} role="search">
              <div className="mobile-nav-search-field">
                <Search size={17} aria-hidden="true" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="Search movies, actors..."
                  value={quickSearch}
                  onChange={(event) => setQuickSearch(event.target.value)}
                  aria-label="Search movies, actors, and filmmakers"
                  autoComplete="off"
                />
                <SearchClearButton value={quickSearch} onClear={() => { setQuickSearch(''); mobileSearchInputRef.current?.focus(); }} label="movie search" />
                <button type="button" className="mobile-nav-search-close" onClick={() => { setSearchOpen(false); setQuickSearch(''); }} aria-label="Close search">
                  <X size={17} />
                </button>
              </div>
              {renderQuickSuggestions()}
            </form>
          )}

          {/* =========================
              Desktop Navigation
          ========================== */}
          <nav className="desktop-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-link ${
                    isActive ? 'active' : ''
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>

                {item.badge > 0 && (
                  <span className="nav-badge">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}

          </nav>

          {/* =========================
              Right Side Actions
          ========================== */}
          <div className="navbar-actions">

            {/* =========================
                Quick Search
            ========================== */}
            <form
              onSubmit={handleQuickSearchSubmit}
              className={`nav-search-form ${
                searchOpen ? 'open' : ''
              }`}
            >
              <button
                type="button"
                className="search-toggle"
                onClick={() => {
                  if (searchOpen) {
                    setSearchOpen(false);
                    setQuickSearch('');
                  } else {
                    openSearch();
                  }
                }}
                aria-label={
                  searchOpen
                    ? 'Close movie search'
                    : 'Open movie search'
                }
                title="Search movies"
              >
                <Search size={19} />
              </button>

              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search movies, actors..."
                value={quickSearch}
                onChange={(event) =>
                  setQuickSearch(event.target.value)
                }
                className="nav-search-input"
                onFocus={() => setSearchOpen(true)}
              />
              <SearchClearButton value={quickSearch} onClear={() => { setQuickSearch(''); searchInputRef.current?.focus(); }} label="movie search" />

              {/* Search Suggestions */}
              {normalizeSearchText(quickSearch).length >= 2 &&
                quickSuggestions.length > 0 && (
                  <div className="nav-search-suggestions">
                    {quickSuggestions.map((movie) => {
                      const posterUrl = getPosterDisplayUrl(movie.poster_path, 'w92');
                      return (
                        <button
                          key={`${movie.record_type || 'movie'}-${movie.id}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            navigate(getMovieDetailRoute(movie));
                            setQuickSearch('');
                            setSearchOpen(false);
                          }}
                        >
                          <span className="nav-search-suggestion-poster-wrap">
                            {posterUrl ? (
                              <img
                                className="nav-search-suggestion-poster"
                                src={posterUrl}
                                alt=""
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                  event.currentTarget.nextElementSibling.style.display = 'grid';
                                }}
                              />
                            ) : null}
                            <span
                              className="nav-search-suggestion-poster-fallback"
                              style={{ display: posterUrl ? 'none' : 'grid' }}
                              aria-hidden="true"
                            >
                              {movie.record_type === 'tv_show' ? <Tv size={15} /> : <Film size={15} />}
                            </span>
                          </span>
                          <span className="nav-search-suggestion-copy">
                            <strong>{movie.title}</strong>
                            <small>{movie.record_type === 'tv_show' ? 'TV Show' : 'Movie'} · {movie.release_date?.slice(0, 4) || 'TBA'}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
            </form>

            {/* =========================
                Notifications
            ========================== */}
            <button
              type="button"
              className="nav-icon-button notification-button"
              onClick={() => {
                setSearchOpen(false);
                setNotificationMenuOpen((open) => !open);
              }}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-dot">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationMenuOpen && (
              <div className="notification-panel">
                <div className="notification-panel-header">
                  <strong>Notifications</strong>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllAsRead}>
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="notification-empty">No notifications yet.</p>
                ) : (
                  <div className="notification-list">
                    {notifications.map((notification) => {
                      const timestamp = notification.sent_at || notification.created_at;
                      const relativeTime = formatNotificationTime(timestamp);
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          className={`notification-item${notification.isRead ? '' : ' is-unread'}`}
                          onClick={() => {
                            setNotificationMenuOpen(false);
                            setNotificationDetailFullScreen(false);
                            setSelectedNotification(notification);
                            if (!notification.isRead) {
                              void markNotificationAsRead(notification.id);
                            }
                          }}
                        >
                          {notification.image_url ? (
                            <CropImage className="notification-item-image" src={notification.image_url} alt="" />
                          ) : (
                            <span className="notification-item-placeholder" aria-hidden="true"><Film size={20} /></span>
                          )}
                          <div className="notification-item-copy">
                            <strong>{notification.title}</strong>
                            <p>{notification.message ?? notification.body}</p>
                            {relativeTime && <time dateTime={timestamp}>{relativeTime}</time>}
                          </div>
                          {!notification.isRead && <span className="notification-item-unread" aria-label="Unread" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selectedNotification && (
              <div className="notification-detail-backdrop" role="presentation" onClick={() => setSelectedNotification(null)}>
                <section className={`notification-detail-dialog${notificationDetailFullScreen ? ' is-full-screen' : ''}`} role="dialog" aria-modal="true" aria-labelledby="notification-detail-title" onClick={(event) => event.stopPropagation()}>
                  <header className="notification-detail-header">
                    <span>Notification</span>
                    <div className="notification-detail-controls">
                      <button type="button" onClick={() => setNotificationDetailFullScreen((fullScreen) => !fullScreen)} aria-label={notificationDetailFullScreen ? 'Exit full screen' : 'View full screen'} title={notificationDetailFullScreen ? 'Exit full screen' : 'View full screen'}>
                        {notificationDetailFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                      </button>
                      <button type="button" onClick={() => setSelectedNotification(null)} aria-label="Close notification" title="Close"><X size={20} /></button>
                    </div>
                  </header>
                  <div className={`notification-detail-content${selectedNotification.image_url ? ' has-image' : ''}`}>
                    {selectedNotification.image_url && <div className="notification-detail-media"><CropImage className="notification-detail-image" src={selectedNotification.image_url} alt="" /></div>}
                    <article className="notification-detail-copy">
                      <h2 id="notification-detail-title">{selectedNotification.title}</h2>
                      <p>{selectedNotification.message ?? selectedNotification.body}</p>
                      {selectedNotification.created_at && <time dateTime={selectedNotification.created_at}>{new Date(selectedNotification.created_at).toLocaleString()}</time>}
                    </article>
                  </div>
                </section>
              </div>
            )}

            {/* =========================
                Watchlist
            ========================== */}
            <button
              type="button"
              className="nav-icon-button"
              onClick={() => {
                setSearchOpen(false);
                navigate('/watchlist');
              }}
              title="Open watchlist"
              aria-label="Open watchlist"
            >
              <Bookmark size={19} />

              {watchlist.length > 0 && (
                <span className="notification-dot">
                  {watchlist.length}
                </span>
              )}
            </button>

            {/* =========================
                Authenticated User
            ========================== */}
            {user ? (
              <div className="profile-nav-item">
                <button
                  type="button"
                  className="profile-btn profile-btn--avatar-only"
                  onClick={() => {
                    setSearchOpen(false);
                    setProfileOpen(
                      (open) => !open
                    );
                  }}
                  title={`Open ${profileDisplayName}'s profile menu`}
                  aria-label={`Open ${profileDisplayName}'s profile menu`}
                  aria-expanded={profileOpen}
                >
                  {selectedViewerProfile ? (
                    <ViewerProfileAvatar profile={selectedViewerProfile} className="profile-greeting-avatar" />
                  ) : (
                    <span className="profile-greeting-avatar" aria-hidden="true">
                      <CropImage src={profileAvatarUrl} alt="" />
                    </span>
                  )}

                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`profile-menu-chevron ${profileOpen ? 'is-open' : ''}`}
                  />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="profile-menu">
                    <strong>
                      {profileDisplayName}
                    </strong>

                    {/* Admin Links */}
                    {profile?.role === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            navigate(
                              '/admin/dashboard'
                            );
                          }}
                        >
                          Admin Dashboard
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            navigate('/admin/movies');
                          }}
                        >
                          Admin Movies
                        </button>
                      </>
                    )}

                    {/* User Links */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/profiles');
                      }}
                    >
                      Switch profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/profile');
                      }}
                    >
                      My Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/settings');
                      }}
                    >
                      <Settings size={16} />
                      Settings
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/watchlist');
                      }}
                    >
                      My Wishlist
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/my-reviews');
                      }}
                    >
                      My Reviews
                    </button>

                    {/* Logout */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        void handleSignOut();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* =========================
                 Sign-in Actions
              ========================== */
              <div className="auth-inline-actions">
                <button
                  type="button"
                  className="btn-outline auth-nav-btn"
                  onClick={() => {
                    setSearchOpen(false);
                    navigate('/login');
                  }}
                >
                  Login
                </button>

                <button
                  type="button"
                  className="btn-primary auth-nav-btn small"
                  onClick={() => {
                    setSearchOpen(false);
                    navigate('/register');
                  }}
                >
                  Register
                </button>
              </div>
            )}

            {/* =========================
                Mobile Hamburger
            ========================== */}
            <button
              type="button"
              className="mobile-hamburger"
              onClick={() => {
                setSearchOpen(false);
                setMobileMenuOpen(
                  (open) => !open
                );
              }}
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X size={26} />
              ) : (
                <Menu size={26} />
              )}
            </button>
          </div>
        </div>

        {/* =========================
            Mobile Navigation Drawer
        ========================== */}
        {mobileMenuOpen && (
          <div className="mobile-drawer">

            {/* Mobile Search */}
            <form
              onSubmit={handleQuickSearchSubmit}
              className="mobile-search-form"
            >
              <Search size={18} />

              <input
                type="text"
                placeholder="Search movies, cast, directors..."
                value={quickSearch}
                onChange={(event) =>
                  setQuickSearch(event.target.value)
                }
              />
              <SearchClearButton value={quickSearch} onClear={() => setQuickSearch('')} label="movie search" />
            </form>

            {/* Mobile Navigation */}
            <nav className="mobile-nav-links">

              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `mobile-nav-link ${
                      isActive ? 'active' : ''
                    }`
                  }
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                >
                  <span className="mobile-link-icon">
                    {item.icon}
                  </span>

                  <span className="mobile-link-label">
                    {item.label}
                  </span>

                  {item.badge > 0 && (
                    <span className="nav-badge">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}

              {/* =========================
                  Mobile Explore
              ========================== */}
              <div className="explore-nav-item mobile-explore-item">
                <button
                  type="button"
                  className={`mobile-nav-link explore-nav-button ${
                    isExploreActive ? 'active' : ''
                  }`}
                  onClick={() =>
                    setExploreOpen(
                      (open) => !open
                    )
                  }
                  aria-expanded={exploreOpen}
                  aria-haspopup="menu"
                >
                  <span className="mobile-link-icon">
                    <Compass size={18} />
                  </span>

                  <span className="mobile-link-label">
                    Explore
                  </span>

                  <ChevronDown
                    size={17}
                    className={
                      exploreOpen
                        ? 'is-open'
                        : ''
                    }
                  />
                </button>

                {exploreOpen && (
                  <div
                    className="explore-nav-menu mobile-explore-menu"
                    role="menu"
                  >
                    {exploreItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        role="menuitem"
                        onClick={() => {
                          setExploreOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </NavLink>
                    ))}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExploreOpen(false);
                        setMobileMenuOpen(false);
                        setPickerModalOpen(true);
                      }}
                    >
                      <Dices size={17} />
                      <span>Pick a Movie</span>
                    </button>
                  </div>
                )}
              </div>

              {/* =========================
                  Mobile Profile
              ========================== */}
              <button
                type="button"
                className="mobile-nav-link settings-link"
                onClick={() => {
                  setMobileMenuOpen(false);

                  if (user) {
                    setProfileOpen(true);
                  } else {
                    navigate('/login');
                  }
                }}
              >
                <span className="mobile-link-icon">
                  <User size={18} />
                </span>

                <span className="mobile-link-label">
                  {user ? 'Profile' : 'Account'}
                </span>
              </button>

              {/* =========================
                  Guest Login
              ========================== */}
              {!user && (
                <NavLink
                  to="/login"
                  className="mobile-nav-link account-login-link"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                >
                  <span className="mobile-link-icon">
                    <User size={18} />
                  </span>

                  <span className="mobile-link-label">
                    Account Login
                  </span>
                </NavLink>
              )}
            </nav>
          </div>
        )}
      </header>

      <MobileBottomNavigation />

      {/* =========================
          Random Movie Picker Modal
      ========================== */}
      <RandomPickerModal
        isOpen={pickerModalOpen}
        onClose={() =>
          setPickerModalOpen(false)
        }
        onPlayTrailer={onPlayTrailer}
      />
    </>
  );
};

export default Navbar;
