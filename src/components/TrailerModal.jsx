import React, { useEffect, useState } from 'react';
import { X, Play, AlertCircle, ExternalLink } from 'lucide-react';
import { fetchMovieDetails } from '../services/tmdb';
import LoadingIndicator from './LoadingIndicator';

const TrailerModal = ({ movie, videoKey: propVideoKey = null, onClose }) => {
  const [videoKey, setVideoKey] = useState(propVideoKey);
  const [loading, setLoading] = useState(!propVideoKey);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!movie || propVideoKey) return;

    if (movie.trailer_key || movie.id >= 910000) {
      if (movie.trailer_key) setVideoKey(movie.trailer_key);
      else setError('This offline catalog title has no embedded trailer yet.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchMovieDetails(movie.id)
      .then((data) => {
        if (!isMounted) return;
        const videos = data.videos?.results || [];
        // Look for official Trailer first, then Teaser, then Clip
        const officialTrailer =
          videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
          videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
          videos.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ||
          videos.find((v) => v.site === 'YouTube');

        if (officialTrailer) {
          setVideoKey(officialTrailer.key);
        } else {
          setError('No trailer available for this movie.');
        }
      })
      .catch((err) => {
        if (isMounted) setError('Could not load trailer details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [movie, propVideoKey]);

  if (!movie) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={24} />
        </button>

        <div className="modal-header-info">
          <h3>{movie.title}</h3>
          <span className="trailer-badge">Official Trailer</span>
        </div>

        <div className="video-container">
          {loading && (
            <div className="video-loading">
              <LoadingIndicator label="Fetching trailer from YouTube..." />
            </div>
          )}

          {error && !loading && (
            <div className="video-empty-state">
              <AlertCircle size={48} color="#FF2E4D" />
              <h4>Trailer Unavailable</h4>
              <p>{error}</p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' trailer')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-yt-search"
              >
                <span>Search "{movie.title}" on YouTube</span>
                <ExternalLink size={16} />
              </a>
            </div>
          )}

          {videoKey && !loading && (
            <iframe
              src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
              title={`${movie.title} Official Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="trailer-iframe"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TrailerModal;
