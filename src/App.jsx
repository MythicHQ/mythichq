import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, matchPath, useLocation, useNavigationType } from 'react-router-dom';
import { useAuth } from './pages/Admin/AuthContext';
import { WatchlistProvider } from './pages/Admin/WatchlistContext';
import { NotificationProvider } from './pages/Admin/NotificationContext';
import Navbar from './components/Navbar';
import MobileBottomNavigation from './components/MobileBottomNavigation';
import Footer from './components/Footer';
import PublicInfoLayout from './components/PublicInfoLayout';
import TrailerModal from './components/TrailerModal';
import RandomPickerModal from './components/RandomPickerModal';
import Toast from './components/Toast';
import AuthPrompt from './components/AuthPrompt';
import LoadingIndicator from './components/LoadingIndicator';
import OfflinePage from './components/OfflinePage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './pages/Admin/AdminLayout';
import AdminLoginPage from './pages/Admin/AdminLogin';
import AdminDashboardPage from './pages/Admin/AdminDashboard';
import AdminNotificationsPage from './pages/Admin/AdminNotifications';
import AdminMoviesPage from './pages/Admin/AdminMovies';
import AdminMovieProblemsPage from './pages/Admin/AdminMovieProblems';
import AdminMovieFormPage from './pages/Admin/AdminMovieForm';
import AdminCuratedSectionPage from './pages/Admin/AdminCuratedSectionPage';
import AdminHeroSectionPage from './pages/Admin/AdminHeroSectionPage';
import AdminTvHeroSectionPage from './pages/Admin/AdminTvHeroSectionPage';
import AdminReviewsPage from './pages/Admin/AdminReviews';
import AdminUsersPage from './pages/Admin/AdminUsers';
import AdminSettingsPage from './pages/Admin/AdminSettings';
import AdminContactMessagesPage from './pages/Admin/AdminContactMessages';
import AdminProfileIconsPage from './pages/Admin/AdminProfileIcons';
import AdminProfileIntroImagesPage from './pages/Admin/AdminProfileIntroImages';
import AdminBrowseCategoriesPage from './pages/Admin/AdminBrowseCategories';
import AdminLanguagesPage from './pages/Admin/AdminLanguages';
import AdminOttPlatformsPage from './pages/Admin/AdminOttPlatforms';
import AdminCastPage from './pages/Admin/AdminCast';
import AdminCastDetailsPage from './pages/Admin/AdminCastDetails';
import AdminStudiosPage from './pages/Admin/AdminStudios';
import AdminStudioPhasesPage from './pages/Admin/AdminStudioPhases';
import { TrendingRankProvider } from './contexts/TrendingRankContext';

import Home from './pages/Home';
import WelcomePage from './pages/in';
import Movies from './pages/Movies';
import TvShows from './pages/TvShows';
import Trending from './pages/Trending';
import TopRated from './pages/TopRated';
import NewReleases from './pages/NewReleases';
import Genres from './pages/Genres';
import LanguagesPage from './pages/Languages';
import GenreDetail from './pages/GenreDetail';
import Upcoming from './pages/Upcoming';
import SearchPage from './pages/Search';
import MovieDetails from './pages/MovieDetails';
import TvShowDetails from './pages/TvShowDetails';
import CastMemberProfile from './pages/CastMemberProfile';
import Watchlist from './pages/Watchlist';
import Discovery from './pages/Discovery';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import ForgotPasswordPage from './pages/Auth/ForgotPassword';
import ResetPasswordPage from './pages/Auth/ResetPassword';
import ProfileSetupPage from './pages/Auth/ProfileSetup';
import ProfilesPage from './pages/Profiles';
import ProfileOnboarding from './pages/ProfileOnboarding';
import ProfilePage from './pages/Profile';
import SettingsPage from './pages/Settings';
import { MarvelFranchisePage, StudiosPage, StudioDetailPage } from './pages/Studios';
import StudioPhasesPage from './pages/StudioPhases';
import HelpPage from './pages/Help';
import ContactPage from './pages/Contact';
import AboutPage from './pages/About';
import PrivacyPolicyPage from './pages/PrivacyPolicy';
import TermsOfServicePage from './pages/TermsOfService';
import NotFound from './pages/NotFound';
import { applyAppearanceSettings, loadCachedAppearance } from './services/userSettings';

import './styles/index.css';
import './styles/App.css';
import './styles/profiles.css';
import './styles/movieDetails.css';
import './styles/notFound.css';

const APP_ROUTE_PATTERNS = [
  '/',
  '/movie',
  '/movies',
  '/tv-shows',
  '/discovery',
  '/trending',
  '/top-rated',
  '/new-releases',
  '/genres',
  '/languages',
  '/genre/:id',
  '/upcoming',
  '/search',
  '/movie/:movieIdentifier',
  '/tv-show/:identifier',
  '/cast/:castMemberIdentifier',
  '/studios',
  '/studios/phases',
  '/studios/:slug/franchise/:franchiseSlug',
  '/studios/:slug',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/complete-profile',
  '/profiles',
  '/profile-onboarding',
  '/watchlist',
  '/profile',
  '/settings',
  '/about',
  '/entertainment',
  '/help',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/admin/login',
  '/admin',
  '/admin/dashboard',
  '/admin/notifications',
  '/admin/movies',
  '/admin/movie-problems',
  '/admin/cast',
  '/admin/cast/:id',
  '/admin/ott-platforms',
  '/admin/movies/add',
  '/admin/movies/edit/:id',
  '/admin/tv-shows/add',
  '/admin/tv-shows/edit/:id',
  '/admin/hero',
  '/admin/hero-tv-shows',
  '/admin/curated/:section',
  '/admin/reviews',
  '/admin/contact-messages',
  '/admin/users',
  '/admin/profile-icons',
  '/admin/profile-intro-images',
  '/admin/browse-categories',
  '/admin/languages',
  '/admin/studios',
  '/admin/studio-phases',
  '/admin/settings',
];

function RouteScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const routeKey = `${location.pathname}${location.search}`;

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const savedPosition = navigationType === 'POP'
      ? Number(sessionStorage.getItem(`mythichq:scroll:${routeKey}`) || 0)
      : 0;
    requestAnimationFrame(() => window.scrollTo({ top: savedPosition, left: 0, behavior: 'instant' }));

    return () => {
      sessionStorage.setItem(`mythichq:scroll:${routeKey}`, String(window.scrollY));
      window.history.scrollRestoration = previousRestoration;
    };
  }, [routeKey, navigationType]);

  return null;
}

function RootRoute({ onPlayTrailer, onOpenPicker }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-container auth-page-shell"><LoadingIndicator label="Checking your session..." /></div>
    );
  }

  return user
    ? <Home onPlayTrailer={onPlayTrailer} onOpenPicker={onOpenPicker} />
    : <WelcomePage />;
}

function ProfileSetupRoute() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="page-container auth-page-shell"><LoadingIndicator label="Loading your profile..." /></div>;
  }

  return profile?.profile_completed === false
    ? <ProfileSetupPage />
    : <Navigate to="/" replace />;
}

const PROFILE_FLOW_EXEMPT_PATHS = [
  '/profiles',
  '/profile-onboarding',
  '/complete-profile',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/help',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
];

const getRouteMetadata = (pathname, search) => {
  const params = new URLSearchParams(search);
  const slugLabel = (value = '') => {
    try {
      return decodeURIComponent(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    } catch {
      return 'MythicHQ';
    }
  };
  const pageMap = {
    '/': ['MythicHQ — Discover Movies Worth Watching', 'Find your next favorite movie or show. Explore trending titles, hidden gems, and stories worth watching.'],
    '/movies': ['Movies to Discover | MythicHQ', 'Browse movies, explore genres, and find your next favorite story.'],
    '/tv-shows': ['TV Shows to Discover | MythicHQ', 'Explore TV shows, seasons, and stories worth watching.'],
    '/trending': ['Trending Movies & Shows | MythicHQ', 'See what everyone is watching on MythicHQ.'],
    '/top-rated': ['Top Rated Movies | MythicHQ', 'Explore top-rated movies and audience favorites.'],
    '/new-releases': ['New Releases | MythicHQ', 'Discover new movies and shows recently added to MythicHQ.'],
    '/discovery': ['Discover Movies | MythicHQ', 'Find hidden gems and your next favorite movie.'],
    '/genres': ['Browse Genres | MythicHQ', 'Explore movies by genre on MythicHQ.'],
    '/languages': ['Browse Languages | MythicHQ', 'Discover movies in the languages you love.'],
    '/studios': ['Studios & Franchises | MythicHQ', 'Explore studios, franchises, and their movie collections.'],
    '/upcoming': ['Upcoming Movies | MythicHQ', 'Explore upcoming movie releases.'],
    '/about': ['About MythicHQ', 'Learn about MythicHQ and our movie discovery experience.'],
    '/help': ['Help Center | MythicHQ', 'Get help using MythicHQ.'],
    '/contact': ['Contact MythicHQ', 'Contact the MythicHQ team.'],
    '/privacy-policy': ['Privacy Policy | MythicHQ', 'Read the MythicHQ privacy policy.'],
    '/terms-of-service': ['Terms of Service | MythicHQ', 'Read the MythicHQ terms of service.'],
  };
  if (pageMap[pathname]) return pageMap[pathname];
  if (pathname === '/search') {
    const query = params.get('q')?.trim();
    return query
      ? [`Search: ${query} | MythicHQ`, `Search MythicHQ for ${query}, including movies, TV shows, actors, and filmmakers.`]
      : ['Search Movies & Shows | MythicHQ', 'Search movies, TV shows, actors, and filmmakers on MythicHQ.'];
  }
  const detail = pathname.match(/^\/(movie|tv-show)\/([^/]+)/);
  if (detail) {
    const title = slugLabel(detail[2]);
    return [`${title} | MythicHQ`, `Explore ${title}: details, ratings, trailers, cast, and similar titles on MythicHQ.`];
  }
  const genre = pathname.match(/^\/genre\/([^/]+)/);
  if (genre) return [`${slugLabel(genre[1])} Movies | MythicHQ`, `Browse ${slugLabel(genre[1])} movies and discover what to watch next.`];
  if (pathname.startsWith('/cast/')) return [`${slugLabel(pathname.split('/').pop())} | MythicHQ`, 'Explore cast credits and related movies on MythicHQ.'];
  if (pathname.startsWith('/studios/')) return [`${slugLabel(pathname.split('/').pop())} | MythicHQ`, 'Explore this studio, its franchises, and related movies on MythicHQ.'];
  return ['MythicHQ — Discover Movies Worth Watching', 'Discover movies, TV shows, and stories worth watching on MythicHQ.'];
};

function AppContent() {
  const location = useLocation();
  const { user, profile, selectedViewerProfile, loading } = useAuth();
  const [trailerState, setTrailerState] = useState({ isOpen: false, movie: null, videoKey: null });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [trailerAutoplay, setTrailerAutoplay] = useState(() => loadCachedAppearance().trailerAutoplay);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const [title, description] = getRouteMetadata(location.pathname, location.search);
    document.title = title;
    const knownPath = APP_ROUTE_PATTERNS.some((path) => matchPath({ path, end: true }, location.pathname));
    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) descriptionTag.setAttribute('content', description);
    const privateRoute = /^\/(?:admin|profile|profiles|settings|watchlist|complete-profile|profile-onboarding|login|register|forgot-password|reset-password)(?:\/|$)/.test(location.pathname);
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement('meta');
      robotsTag.name = 'robots';
      document.head.appendChild(robotsTag);
    }
    robotsTag.content = privateRoute || !knownPath || (location.pathname === '/search' && Boolean(new URLSearchParams(location.search).get('q')))
      ? 'noindex, nofollow'
      : 'index, follow';
    const canonicalUrl = `https://mythichq.vercel.app${location.pathname === '/' ? '/' : location.pathname}`;
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.rel = 'canonical';
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.href = canonicalUrl;
    for (const property of ['og:title', 'og:description']) {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', property === 'og:title' ? title : description);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const appearance = loadCachedAppearance();
    applyAppearanceSettings(appearance);
    const handleAppearanceChange = (event) => {
      applyAppearanceSettings(event.detail?.appearance);
      setTrailerAutoplay(event.detail?.appearance?.trailerAutoplay === true);
    };
    window.addEventListener('mythichq:user-settings-updated', handleAppearanceChange);
    return () => window.removeEventListener('mythichq:user-settings-updated', handleAppearanceChange);
  }, []);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password', '/complete-profile', '/profiles', '/profile-onboarding'].includes(location.pathname)
    || (!user && ['/', '/movie'].includes(location.pathname));
  const isPublicInfoPage = ['/help', '/contact', '/privacy-policy', '/terms-of-service'].includes(location.pathname);
  const isKnownRoute = APP_ROUTE_PATTERNS.some((path) => matchPath({ path, end: true }, location.pathname));
  const isNotFoundPage = !isKnownRoute;

  const handlePlayTrailer = useCallback((movie, videoKey = null) => {
    setTrailerState({ isOpen: true, movie, videoKey });
  }, []);

  const handleCloseTrailer = useCallback(() => {
    setTrailerState({ isOpen: false, movie: null, videoKey: null });
  }, []);

  if (isOffline) {
    return <OfflinePage />;
  }

  if (isPublicInfoPage && loading) {
    return <div className="app-layout"><main className="app-main page-container auth-page-shell"><LoadingIndicator label="Checking your session..." /></main></div>;
  }

  if (user && loading) {
    return <div className="page-container auth-page-shell"><LoadingIndicator label="Loading your profile..." /></div>;
  }

  if (user && profile?.profile_completed === false && !['/complete-profile', '/profile-onboarding'].includes(location.pathname) && !isPublicInfoPage && isKnownRoute) {
    return <Navigate to="/complete-profile" replace />;
  }

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isProfileSelectionPage = location.pathname === '/profiles';
  const isStandalonePublicPage = isPublicInfoPage && !user;
  const isProfileFlowExempt = PROFILE_FLOW_EXEMPT_PATHS.includes(location.pathname);
  if (user && selectedViewerProfile?.onboarding_completed === false && !['/profile-onboarding', '/profiles'].includes(location.pathname) && !isAdminRoute && !isPublicInfoPage && isKnownRoute) {
    return <Navigate to="/profile-onboarding" replace />;
  }
  if (user && isKnownRoute && !selectedViewerProfile && !isAdminRoute && !isProfileFlowExempt) {
    return <Navigate to="/profiles" replace state={{ from: location }} />;
  }

  return (
    <div className={`app-layout${isNotFoundPage ? ' not-found-layout' : ''}`}>
      {!isNotFoundPage && !isAuthPage && !isStandalonePublicPage && !isProfileSelectionPage && <Navbar onPlayTrailer={handlePlayTrailer} />}
      <RouteScrollRestoration />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<RootRoute onPlayTrailer={handlePlayTrailer} onOpenPicker={() => setPickerOpen(true)} />} />
          <Route path="/movie" element={<ProtectedRoute><Home onPlayTrailer={handlePlayTrailer} onOpenPicker={() => setPickerOpen(true)} /></ProtectedRoute>} />
          <Route path="/movies" element={<Movies onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/tv-shows" element={<TvShows onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/discovery" element={<Discovery onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/trending" element={<Trending onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/top-rated" element={<TopRated onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/new-releases" element={<NewReleases onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/genres" element={<Genres />} />
          <Route path="/languages" element={<LanguagesPage />} />
          <Route path="/genre/:id" element={<GenreDetail onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/upcoming" element={<Upcoming onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/search" element={<SearchPage onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/movie/:movieIdentifier" element={<MovieDetails onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/tv-show/:identifier" element={<TvShowDetails onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/cast/:castMemberIdentifier" element={<CastMemberProfile />} />
          <Route path="/studios" element={<StudiosPage />} />
          <Route path="/studios/phases" element={<StudioPhasesPage />} />
          <Route path="/studios/:slug/franchise/:franchiseSlug" element={<MarvelFranchisePage onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/studios/:slug" element={<StudioDetailPage onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/complete-profile" element={<ProtectedRoute><ProfileSetupRoute /></ProtectedRoute>} />
          <Route path="/profiles" element={<ProtectedRoute><ProfilesPage /></ProtectedRoute>} />
          <Route path="/profile-onboarding" element={<ProtectedRoute><ProfileOnboarding /></ProtectedRoute>} />

          <Route path="/watchlist" element={<ProtectedRoute><Watchlist onPlayTrailer={handlePlayTrailer} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/entertainment" element={<Movies onPlayTrailer={handlePlayTrailer} />} />
          <Route element={isStandalonePublicPage ? <PublicInfoLayout /> : <Outlet />}>
            <Route path="/help" element={<HelpPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          </Route>

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<ProtectedRoute adminOnly redirectTo="/admin/login"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="movies" element={<AdminMoviesPage />} />
            <Route path="movie-problems" element={<AdminMovieProblemsPage />} />
            <Route path="cast" element={<AdminCastPage />} />
            <Route path="cast/:id" element={<AdminCastDetailsPage />} />
            <Route path="ott-platforms" element={<AdminOttPlatformsPage />} />
            <Route path="movies/add" element={<AdminMovieFormPage />} />
            <Route path="movies/edit/:id" element={<AdminMovieFormPage />} />
            <Route path="tv-shows/add" element={<AdminMovieFormPage />} />
            <Route path="tv-shows/edit/:id" element={<AdminMovieFormPage />} />
            <Route path="hero" element={<AdminHeroSectionPage />} />
            <Route path="hero-tv-shows" element={<AdminTvHeroSectionPage />} />
            <Route path="curated/:section" element={<AdminCuratedSectionPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="contact-messages" element={<AdminContactMessagesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="profile-icons" element={<AdminProfileIconsPage />} />
            <Route path="profile-intro-images" element={<AdminProfileIntroImagesPage />} />
            <Route path="browse-categories" element={<AdminBrowseCategoriesPage />} />
            <Route path="languages" element={<AdminLanguagesPage />} />
            <Route path="studios" element={<AdminStudiosPage />} />
            <Route path="studio-phases" element={<AdminStudioPhasesPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isNotFoundPage && !isAuthPage && !isStandalonePublicPage && !isProfileSelectionPage && <Footer />}
      {user && selectedViewerProfile && !isAdminRoute && !isAuthPage && !isStandalonePublicPage && !isNotFoundPage && !isProfileSelectionPage && <MobileBottomNavigation />}

      {trailerState.isOpen && (
        <TrailerModal
          key={`${trailerState.movie?.id || 'movie'}-${trailerState.videoKey || ''}`}
          movie={trailerState.movie}
          videoKey={trailerState.videoKey}
          autoPlay={trailerAutoplay}
          onClose={handleCloseTrailer}
        />
      )}

      <RandomPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPlayTrailer={handlePlayTrailer}
      />

      <Toast />
      <AuthPrompt />
    </div>
  );
}

export default function App() {
  return (
    <WatchlistProvider>
      <NotificationProvider>
        <TrendingRankProvider>
          <AppContent />
        </TrendingRankProvider>
      </NotificationProvider>
    </WatchlistProvider>
  );
}
