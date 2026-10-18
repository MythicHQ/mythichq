import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, Trash2, MessageSquareText, LoaderCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SearchClearButton from '../../components/SearchClearButton';
import '../../styles/admin.css';

const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [movies, setMovies] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadReviews = async () => {
      setLoading(true);
      setError('');
      try {
        if (!supabase) throw new Error('Supabase is not configured.');
        const [reviewResult, movieResult] = await Promise.all([
          supabase.from('reviews').select('*').order('created_at', { ascending: false }),
          supabase.from('movies').select('id, title, poster_url'),
        ]);
        if (reviewResult.error) throw reviewResult.error;
        if (movieResult.error) throw movieResult.error;
        if (active) {
          setReviews(reviewResult.data || []);
          setMovies(movieResult.data || []);
        }
      } catch (loadError) {
        console.error('Failed to load reviews:', loadError);
        if (active) setError(loadError.message || 'Unable to load reviews.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadReviews();
    return () => { active = false; };
  }, []);

  const movieById = useMemo(() => new Map(movies.map((movie) => [String(movie.id), movie])), [movies]);
  const filteredReviews = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reviews.filter((review) => {
      const movie = movieById.get(String(review.movie_id));
      return !term || [movie?.title, review.movie_id, review.rating, review.comment].join(' ').toLowerCase().includes(term);
    });
  }, [reviews, movieById, query]);
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const { error: deleteError } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (deleteError) throw deleteError;
      setReviews((current) => current.filter((review) => review.id !== reviewId));
    } catch (deleteError) {
      console.error('Failed to delete review:', deleteError);
      window.alert(deleteError.message || 'Unable to delete review.');
    }
  };

  return (
    <div className="admin-page-shell reviews-moderation-page">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">COMMUNITY / MODERATION</p>
          <h1>Reviews</h1>
          <p className="admin-header-copy">Read and moderate feedback from your community.</p>
        </div>
      </div>

      <section className="reviews-overview" aria-label="Review summary">
        <div className="reviews-overview-icon"><MessageSquareText size={20} /></div>
        <div><span>Total reviews</span><strong>{reviews.length}</strong></div>
        <div className="reviews-overview-divider" />
        <div className="reviews-overview-icon rating"><Star size={20} fill="currentColor" /></div>
        <div><span>Average rating</span><strong>{averageRating}<small> / 5</small></strong></div>
      </section>

      <section className="reviews-panel">
        <div className="reviews-toolbar">
          <div><h2>All reviews</h2><span>{filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'}</span></div>
          <label className="reviews-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movie or comment" aria-label="Search reviews" /><SearchClearButton value={query} onClear={() => setQuery('')} label="review search" /></label>
        </div>
        {error && <div className="admin-error-banner" role="alert">{error}</div>}
        {loading ? <div className="reviews-state"><LoaderCircle className="viewer-spinner" size={22} /> Loading reviews…</div>
          : filteredReviews.length ? (
            <div className="reviews-list">
              {filteredReviews.map((review) => {
                const movie = movieById.get(String(review.movie_id));
                return (
                  <article className="review-card" key={review.id}>
                    <div className="review-movie-poster">{movie?.poster_url ? <img src={movie.poster_url} alt="" /> : <span><MessageSquareText size={17} /></span>}</div>
                    <div className="review-card-content">
                      <div className="review-card-heading">
                        <div><h3>{movie?.title || `Movie #${review.movie_id}`}</h3><span>{new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
                        <div className="review-rating"><Star size={15} fill="currentColor" /><strong>{Number(review.rating || 0).toFixed(1)}</strong><span>/ 5</span></div>
                      </div>
                      <p>{review.comment || 'No written comment.'}</p>
                    </div>
                    <button type="button" className="review-delete-button" onClick={() => void handleDelete(review.id)} aria-label={`Delete review for ${movie?.title || `movie ${review.movie_id}`}`} title="Delete review"><Trash2 size={16} /><span>Delete</span></button>
                  </article>
                );
              })}
            </div>
          ) : <div className="reviews-state"><MessageSquareText size={24} /><strong>{query ? 'No reviews match your search' : 'No reviews yet'}</strong><span>{query ? 'Try a different movie title or comment.' : 'Reviews from your community will appear here.'}</span></div>}
      </section>
    </div>
  );
};

export default AdminReviewsPage;
