import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { useAuth } from './pages/Admin/AuthContext';
import { WatchlistProvider } from './pages/Admin/WatchlistContext';
import { NotificationProvider } from './pages/Admin/NotificationContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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
import AdminOttPlatformsPage from './pages/Admin/AdminOttPlatforms';
import AdminCastPage from './pages/Admin/AdminCast';
import AdminCastDetailsPage from './pages/Admin/AdminCastDetails';

import Home from './pages/Home';
import WelcomePage from './pages/in';
import Movies from './pages/Movies';
import TvShows from './pages/TvShows';
import Trending from './pages/Trending';
import TopRated from './pages/TopRated';
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
import ProfilePage from './pages/Profile';
import HelpPage from './pages/Help';
import ContactPage from './pages/Contact';
import AboutPage from './pages/About';
import PrivacyPolicyPage from './pages/PrivacyPolicy';
import TermsOfServicePage from './pages/TermsOfService';
import { fetchPublicMovies } from './services/movieCatalog';

import './styles/index.css';
import './styles/App.css';
import './styles/profiles.css';
import './styles/movieDetails.css';

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
  }, [routeKey]);

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
  '/complete-profile',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

function AppContent() {
  const location = useLocation();
  const { user, profile, selectedViewerProfile, loading } = useAuth();
  const [trailerState, setTrailerState] = useState({ isOpen: false, movie: null, videoKey: null });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const prefetchStarted = useRef(false);

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

  useEffect(() => {
    if (prefetchStarted.current) return undefined;
    prefetchStarted.current = true;

    const prefetchCatalog = () => {
      void fetchPublicMovies();
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prefetchCatalog, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(prefetchCatalog, 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password', '/complete-profile', '/profiles'].includes(location.pathname)
    || (!user && ['/', '/movie'].includes(location.pathname));

  const handlePlayTrailer = useCallback((movie, videoKey = null) => {
    setTrailerState({ isOpen: true, movie, videoKey });
  }, []);

  const handleCloseTrailer = useCallback(() => {
    setTrailerState({ isOpen: false, movie: null, videoKey: null });
  }, []);

  if (isOffline) {
    return <OfflinePage />;
  }

  if (user && loading) {
    return <div className="page-container auth-page-shell"><LoadingIndicator label="Loading your profile..." /></div>;
  }

  if (user && profile?.profile_completed === false && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isProfileFlowExempt = PROFILE_FLOW_EXEMPT_PATHS.includes(location.pathname);
  if (user && !selectedViewerProfile && !isAdminRoute && !isProfileFlowExempt) {
    return <Navigate to="/profiles" replace state={{ from: location }} />;
  }

  return (
    <div className="app-layout">
      {!isAuthPage && <Navbar onPlayTrailer={handlePlayTrailer} />}
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
          <Route path="/genres" element={<Genres />} />
          <Route path="/languages" element={<LanguagesPage />} />
          <Route path="/genre/:id" element={<GenreDetail onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/upcoming" element={<Upcoming onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/search" element={<SearchPage onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/movie/:movieIdentifier" element={<MovieDetails onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/tv-show/:identifier" element={<TvShowDetails onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/cast/:castMemberIdentifier" element={<CastMemberProfile />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/complete-profile" element={<ProtectedRoute><ProfileSetupRoute /></ProtectedRoute>} />
          <Route path="/profiles" element={<ProtectedRoute><ProfilesPage /></ProtectedRoute>} />

          <Route path="/watchlist" element={<ProtectedRoute><Watchlist onPlayTrailer={handlePlayTrailer} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/entertainment" element={<Movies onPlayTrailer={handlePlayTrailer} />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />

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
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </main>

      {!isAuthPage && <Footer />}

      {trailerState.isOpen && (
        <TrailerModal
          movie={trailerState.movie}
          videoKey={trailerState.videoKey}
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
        <AppContent />
      </NotificationProvider>
    </WatchlistProvider>
  );
}
