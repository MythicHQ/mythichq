import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      try {
        if (!supabase) {
          setReviews([]);
          return;
        }

        const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setReviews(data || []);
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, []);

  const handleDelete = async (reviewId) => {
    const confirmed = window.confirm('Delete this review?');
    if (!confirmed || !supabase) return;

    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) {
      window.alert(error.message || 'Unable to delete review.');
      return;
    }

    setReviews((current) => current.filter((review) => review.id !== reviewId));
  };

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="eyebrow">Moderation</p>
          <h1>Reviews</h1>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading reviews...</h3></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Movie</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length > 0 ? reviews.map((review) => (
                <tr key={review.id}>
                  <td>{review.movie_id || '—'}</td>
                  <td>{review.rating || 0}</td>
                  <td>{review.comment || '—'}</td>
                  <td>{new Date(review.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="admin-icon-btn danger" onClick={() => handleDelete(review.id)}>Delete</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="empty-subtle">No reviews found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReviewsPage;
