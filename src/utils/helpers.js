// Helper Utilities for MythicHQ

export const GENRES_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

// Return Genre Name from ID or Array of IDs
export const getGenreNames = (genreIdsOrObj) => {
  if (!genreIdsOrObj) return [];
  if (Array.isArray(genreIdsOrObj)) {
    return genreIdsOrObj.map((g) => (typeof g === 'object' ? g.name : GENRES_MAP[g] || 'Movie'));
  }
  return [];
};

// Rating Tier Classification Engine
export const getRatingBadge = (voteAverage) => {
  const rating = typeof voteAverage === 'number' ? parseFloat(voteAverage.toFixed(1)) : 0;

  if (rating >= 9.0) {
    return {
      tier: 'MUST WATCH',
      label: '🔥 MUST WATCH',
      icon: '🔥',
      color: '#FF2E4D',
      bg: 'rgba(255, 46, 77, 0.18)',
      border: 'rgba(255, 46, 77, 0.5)',
      glow: '0 0 12px rgba(255, 46, 77, 0.4)',
    };
  } else if (rating >= 8.0) {
    return {
      tier: 'EXCELLENT',
      label: '⭐ EXCELLENT',
      icon: '⭐',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.18)',
      border: 'rgba(16, 185, 129, 0.5)',
      glow: '0 0 12px rgba(16, 185, 129, 0.3)',
    };
  } else if (rating >= 7.0) {
    return {
      tier: 'WORTH WATCHING',
      label: '👍 WORTH WATCHING',
      icon: '👍',
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.18)',
      border: 'rgba(59, 130, 246, 0.5)',
      glow: '0 0 10px rgba(59, 130, 246, 0.3)',
    };
  } else if (rating >= 6.0) {
    return {
      tier: 'AVERAGE',
      label: '😐 AVERAGE',
      icon: '😐',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.18)',
      border: 'rgba(245, 158, 11, 0.5)',
      glow: 'none',
    };
  } else {
    return {
      tier: 'SKIP',
      label: '❌ SKIP',
      icon: '❌',
      color: '#9CA3AF',
      bg: 'rgba(156, 163, 175, 0.15)',
      border: 'rgba(156, 163, 175, 0.3)',
      glow: 'none',
    };
  }
};

// Format Runtime: 134 -> "2h 14m"
export const formatRuntime = (minutes) => {
  if (!minutes || minutes <= 0) return 'N/A';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
};

// Format Release Year: "2024-05-15" -> "2024"
export const getReleaseYear = (dateStr) => {
  if (!dateStr) return 'N/A';
  return dateStr.split('-')[0] || 'N/A';
};

// Format Date: "2024-05-15" -> "May 15, 2024"
export const formatDate = (dateStr) => {
  if (!dateStr || dateStr === 'TBD') return 'TBD';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('en-US', options);
};

// Calculate Days Until Release
export const getDaysUntil = (dateStr) => {
  if (!dateStr || dateStr === 'TBD') return null;
  const release = new Date(dateStr);
  const today = new Date();
  const diffTime = release - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};
