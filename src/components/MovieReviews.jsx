import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, MessageSquareText, Star, Trash2, X } from 'lucide-react';
import { useAuth } from '../pages/Admin/AuthContext';
import { createReview, deleteReview, loadMovieReviews, updateReview } from '../services/reviews';
import LoadingIndicator from './LoadingIndicator';
import '../styles/reviews.css';

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const normalizeRating = (value) => Math.max(0, Math.min(5, Number(value) || 0));
const formatRating = (value) => {
  const normalized = normalizeRating(value);
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
};

const RatingStars = ({ value = 0, onChange, size = 24, readOnly = false }) => {
  const stars = Array.from({ length: 5 }, (_, index) => index + 1);
  const normalizedValue = normalizeRating(value);

  return (
    <div className={`review-stars ${readOnly ? 'is-read-only' : ''}`} aria-label={`${formatRating(normalizedValue)}/5 stars`}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          className={`review-star-button ${star <= normalizedValue ? 'is-selected' : 'is-unselected'}`}
          style={{ '--star-size': `${size}px` }}
          onClick={() => !readOnly && onChange(star)}
          disabled={readOnly}
          aria-label={`${star} out of 5 stars`}
        >
          <Star size={size} fill={star <= normalizedValue ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
};

const MovieReviews = ({
  movieId,
  showComposer = true,
  showReviewList = true,
  hideCommunityCounts = false,
  onSummaryChange,
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [editingReview, setEditingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    setError('');
    try {
      setReviews(await loadMovieReviews(movieId));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [movieId]);

  const ownReview = reviews.find((review) => review.user_id === user?.id);

  useEffect(() => {
    if (!editingReview && ownReview) {
      setRating(Number(ownReview.rating));
      setComment(ownReview.comment || '');
    }
  }, [ownReview?.id, ownReview?.rating, ownReview?.comment, editingReview]);

  const summary = useMemo(() => {
    const distribution = [0, 0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      const score = Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0)));
      distribution[score] += 1;
    });
    const average = reviews.length
      ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
      : 0;
    return { average, distribution };
  }, [reviews]);

  useEffect(() => {
    onSummaryChange?.({ average: summary.average, reviewCount: reviews.length });
  }, [onSummaryChange, reviews.length, summary.average]);

  const resetForm = () => {
    setEditingReview(null);
    setRating(ownReview ? Number(ownReview.rating) : 0);
    setComment(ownReview?.comment || '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || rating < 0 || rating > 5) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingReview) {
        await updateReview(editingReview.id, { rating, comment });
        setMessage('Your review was updated.');
      } else if (ownReview) {
        await updateReview(ownReview.id, { rating, comment });
        setMessage('Your review was updated.');
      } else {
        await createReview({ userId: user.id, movieId, rating, comment });
        setMessage('Your review was published.');
      }
      await loadReviews();
      setEditingReview(null);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your review.');
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (review) => {
    setEditingReview(review);
    setRating(Number(review.rating));
    setComment(review.comment || '');
    setMessage('');
    setError('');
  };

  const handleDelete = async (review) => {
    if (!window.confirm('Delete your review? This action cannot be undone.')) return;
    setError('');
    try {
      await deleteReview(review.id);
      setReviews((current) => current.filter((item) => item.id !== review.id));
      resetForm();
      setMessage('Your review was deleted.');
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete your review.');
    }
  };

  return (
    <section className="movie-reviews-section" aria-labelledby="reviews-heading">
      <div className="reviews-section-heading">
        <div>
          <span className="eyebrow"><MessageSquareText size={14} /> Community</span>
          <h2 id="reviews-heading">Reviews &amp; Ratings</h2>
          <p>Share your take and see what other movie lovers think.</p>
        </div>
      </div>

      <div className={`reviews-summary ${hideCommunityCounts ? 'is-counts-hidden' : ''}`}>
        <div className="reviews-average">
          <strong>{summary.average.toFixed(1)}<small>/5</small></strong>
          <RatingStars value={summary.average} readOnly />
          {!hideCommunityCounts && <span>Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>}
        </div>
        {!hideCommunityCounts && <div className="review-distribution" aria-label="Rating distribution">
          {[5, 4, 3, 2, 1, 0].map((score) => {
            const count = summary.distribution[score];
            const percentage = reviews.length ? (count / reviews.length) * 100 : 0;
            return (
              <div className="review-distribution-row" key={score}>
                <span>{score}</span><Star size={13} fill="currentColor" />
                <div className="review-distribution-track"><span style={{ width: `${percentage}%` }} /></div>
                <small>{count}</small>
              </div>
            );
          })}
        </div>}
      </div>

      {showComposer && user ? (
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="review-form-heading">
            <h3>{editingReview || ownReview ? 'Update your review' : 'Rate this movie'}</h3>
            {editingReview && <button type="button" className="review-cancel-button" onClick={resetForm}><X size={15} /> Cancel</button>}
          </div>
          <div className="review-rating-input">
            <RatingStars value={rating} onChange={setRating} size={30} />
            <strong>{formatRating(rating)}/5</strong>
          </div>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What did you think?" rows={4} maxLength={2000} />
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}
          <button className="btn-primary review-submit-button" type="submit" disabled={saving || rating < 0}>
            {saving ? 'Saving...' : editingReview || ownReview ? 'Update Review' : 'Publish Review'}
          </button>
        </form>
      ) : showComposer ? (
        <div className="review-signin-prompt">
          <MessageSquareText size={20} />
          <span>Sign in to review this movie.</span>
          <Link to="/login" className="btn-outline">Sign in to review</Link>
        </div>
      ) : null}

      {showReviewList && (loading ? (
        <div className="reviews-loading"><LoadingIndicator label="Loading reviews..." size="26" /></div>
      ) : reviews.length === 0 ? (
        <div className="reviews-empty"><Star size={25} /><p>No reviews yet. Be the first to share your rating.</p></div>
      ) : (
        <div className="review-list">
          {reviews.map((review) => {
            const isOwner = review.user_id === user?.id;
            const reviewerName = isOwner ? 'You' : review.profile?.full_name || 'MythicHQ member';
            return (
              <article className={`review-card ${isOwner ? 'is-owner' : ''}`} key={review.id}>
                <div className="review-card-top">
                  <div className="reviewer-avatar">{reviewerName.slice(0, 1).toUpperCase()}</div>
                  <div className="reviewer-info"><strong>{reviewerName}</strong>{isOwner && <span>Your Review</span>}</div>
                  <div className="review-card-actions">
                    <RatingStars value={Number(review.rating)} readOnly size={18} />
                    <strong className="review-card-rating">{formatRating(review.rating)}/5</strong>
                    {isOwner && <><button type="button" onClick={() => beginEdit(review)} aria-label="Edit your review"><Edit3 size={16} /></button><button type="button" onClick={() => handleDelete(review)} aria-label="Delete your review"><Trash2 size={16} /></button></>}
                  </div>
                </div>
                <p className="review-comment">{review.comment || 'No comment provided.'}</p>
                <div className="review-date">{formatDate(review.created_at)}{review.updated_at && new Date(review.updated_at).getTime() - new Date(review.created_at).getTime() > 1000 && ` · Edited ${formatDate(review.updated_at)}`}</div>
              </article>
            );
          })}
        </div>
      ))}
    </section>
  );
};

export default MovieReviews;
