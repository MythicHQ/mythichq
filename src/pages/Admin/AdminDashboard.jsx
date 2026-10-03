import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Clock3,
  ExternalLink,
  Film,
  MessageSquareText,
  Plus,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAdminStats } from '../../services/movieCatalog';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState({
    totalMovies: 0,
    publishedMovies: 0,
    draftMovies: 0,
    trendingNow: 0,
    newReleases: 0,
    topRatedMasterpieces: 0,
    hiddenGems: 0,
    featuredMovies: 0,
    popularMovies: 0,
    totalUsers: 0,
    totalReviews: 0,
    averageRating: '0.0',
    recentMovies: [],
    recentReviews: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const nextStats = await fetchAdminStats();
        setStats(nextStats);
      } finally {
        setLoading(false);
      }
    };

    void loadStats();
  }, []);

  const statCards = [
    { label: 'Total Movies', value: stats.totalMovies, icon: <Film size={18} /> },
    { label: 'Published', value: stats.publishedMovies, icon: <TrendingUp size={18} /> },
    { label: 'Drafts', value: stats.draftMovies, icon: <Clock3 size={18} /> },
    { label: 'Trending Now', value: stats.trendingNow, icon: <TrendingUp size={18} /> },
    { label: 'New Releases', value: stats.newReleases, icon: <Film size={18} /> },
    { label: 'Top Rated', value: stats.topRatedMasterpieces, icon: <Star size={18} /> },
    { label: 'Hidden Gems', value: stats.hiddenGems, icon: <Star size={18} /> },
    { label: 'Registered Users', value: stats.totalUsers, icon: <Users size={18} /> },
    { label: 'Total Reviews', value: stats.totalReviews, icon: <MessageSquareText size={18} /> },
    { label: 'Avg. Rating', value: stats.averageRating, icon: <Star size={18} /> },
  ];

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Monday, September 12, 2026</p>
          <h1>Welcome back, Admin <span className="admin-wave">👋</span></h1>
          <p className="admin-header-copy">Here is what is happening across your movie library and user communications today.</p>
        </div>

        <div className="admin-header-actions">
          <Link to="/admin/movies/add" className="admin-button admin-button-primary">
            <Plus size={17} /> Add movie
          </Link>
          <Link to="/" target="_blank" className="admin-button admin-button-secondary">
            <ExternalLink size={16} /> View site
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading dashboard...</h3></div>
      ) : (
        <>
          <div className="admin-metric-grid">
            {statCards.map((card) => (
              <div className="admin-metric-card" key={card.label}>
                <div className="admin-metric-icon">{card.icon}</div>
                <div>
                  <strong>{card.value}</strong>
                  <span>{card.label}</span>
                  <small><TrendingUp size={12} /> Live from Supabase</small>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-grid-two">
            <div className="admin-panel admin-panel-wide">
              <div className="admin-panel-header">
                <div>
                  <span className="admin-panel-eyebrow">Library</span>
                  <h3>Recently added movies</h3>
                </div>
                <Link to="/admin/movies">
                  View all <ArrowRight size={16} />
                </Link>
              </div>

              {stats.recentMovies.length > 0 ? (
                <div className="admin-list-stack">
                  {stats.recentMovies.slice(0, 5).map((movie) => (
                    <div key={movie.id} className="admin-list-row">
                      <div className="admin-list-poster" />
                      <div className="admin-list-meta">
                        <strong>{movie.title}</strong>
                        <span>{movie.genre || movie.genres?.[0]?.name || 'Genre'}</span>
                      </div>
                      <span>{movie.release_date?.slice(0, 4) || 'TBA'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-subtle">No movies have been added yet.</p>
              )}
            </div>

            <div className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <span className="admin-panel-eyebrow">Community</span>
                  <h3>Recent reviews</h3>
                </div>
                <Link to="/admin/reviews">
                  View all <ArrowRight size={16} />
                </Link>
              </div>

              {stats.recentReviews.length > 0 ? (
                <div className="admin-list-stack">
                  {stats.recentReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="admin-list-row">
                      <div className="admin-list-meta">
                        <strong>{review.comment?.slice(0, 60) || 'Review'}</strong>
                        <span><Clock3 size={12} /> {new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      <span>{review.rating}/5</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-subtle">No reviews available yet.</p>
              )}
            </div>
          </div>

          <div className="admin-quick-actions">
            <div>
              <span className="admin-panel-eyebrow">Shortcuts</span>
              <h3>Quick actions</h3>
            </div>

            <div className="admin-quick-grid">
              <Link to="/admin/movies/add">
                <Plus size={18} />
                <span>Add a movie</span>
              </Link>
              <Link to="/admin/movies">
                <Film size={18} />
                <span>Manage library</span>
              </Link>
              <Link to="/admin/reviews">
                <MessageSquareText size={18} />
                <span>Review moderation</span>
              </Link>
              <Link to="/admin/users">
                <Users size={18} />
                <span>View users</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;
