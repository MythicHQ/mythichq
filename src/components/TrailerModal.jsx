import React, { useEffect, useState } from 'react';
import { X, AlertCircle, ExternalLink } from 'lucide-react';
import { fetchMovieDetails } from '../services/tmdb';
import LoadingIndicator from './LoadingIndicator';

const getDirectVideoUrl = (movie) => {
  const value = String(movie?.trailer_url || movie?.trailerUrl || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return /\.(?:mp4|webm|ogg)$/i.test(url.pathname) ? url.href : '';
  } catch {
    return '';
  }
};

const TrailerModal = ({ movie, videoKey: propVideoKey = null, autoPlay = false, onClose }) => {
  const [videoKey, setVideoKey] = useState(propVideoKey || movie?.trailer_key || null);
  const [directVideoUrl] = useState(() => getDirectVideoUrl(movie));
  const [loading, setLoading] = useState(!propVideoKey && !getDirectVideoUrl(movie) && !movie?.trailer_key && Number(movie?.id) < 910000);
  const [error, setError] = useState(() => Number(movie?.id) >= 910000 && !movie?.trailer_key
    ? 'This offline catalog title has no embedded trailer yet.'
    : null);

  useEffect(() => {
    const directUrl = getDirectVideoUrl(movie);
    if (!movie || propVideoKey || directUrl) {
      return undefined;
    }

    if (movie.trailer_key || movie.id >= 910000) {
      return;
    }

    let isMounted = true;
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
      .catch(() => {
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
          <span className="trailer-badge">{directVideoUrl ? 'Video Preview' : 'Official Trailer'}</span>
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

          {directVideoUrl && !loading && (
            <video
              src={directVideoUrl}
              title={`${movie.title} preview`}
              controls
              playsInline
              preload="metadata"
              autoPlay={autoPlay}
              onError={() => setError('This video could not be played. Check that the URL is publicly accessible and encoded as MP4, WebM, or Ogg.')}
            />
          )}

          {videoKey && !directVideoUrl && !loading && (
            <iframe
              src={`https://www.youtube.com/embed/${videoKey}?autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1`}
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
