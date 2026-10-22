import { NavLink, useLocation } from 'react-router-dom';
import { Flame, Home } from 'lucide-react';
import { useAuth } from '../pages/Admin/AuthContext';
import { getProfileAvatarUrl } from '../services/profileIcons';
import ViewerProfileAvatar from './ViewerProfileAvatar';

const discoverPaths = [
  '/discovery', '/movies', '/tv-shows', '/trending', '/top-rated',
  '/new-releases', '/genres', '/languages', '/genre/', '/upcoming',
  '/movie/', '/tv-show/', '/cast/', '/studios',
];

function isDiscoverRoute(pathname) {
  return discoverPaths.some((path) => (
    path.endsWith('/') ? pathname.startsWith(path) : pathname === path || pathname.startsWith(`${path}/`)
  ));
}

export default function MobileBottomNavigation() {
  const { user, profile, selectedViewerProfile } = useAuth();
  const { pathname } = useLocation();

  if (pathname.startsWith('/admin')) return null;

  const items = [
    { label: 'Home', to: '/', icon: Home, active: pathname === '/' || pathname === '/movie' },
    { label: 'Trending', to: '/trending', icon: Flame, active: isDiscoverRoute(pathname) },
    { label: 'My Profile', to: user ? '/profile' : '/login', active: pathname === '/profile' || pathname === '/settings' || pathname === '/profiles' },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary navigation">
      {items.map(({ label, to, icon: Icon, active }) => (
        <NavLink
          key={label}
          to={to}
          end={label === 'Home'}
          aria-current={active ? 'page' : undefined}
          className={`mobile-bottom-nav__item${active ? ' is-active' : ''}`}
        >
          {Icon ? <Icon size={20} strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" /> : (
            <ViewerProfileAvatar
              profile={selectedViewerProfile || { avatar_url: getProfileAvatarUrl(profile, user) }}
              className="mobile-bottom-nav__avatar"
            />
          )}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
