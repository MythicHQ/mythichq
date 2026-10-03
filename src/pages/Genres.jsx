import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid, Sparkles, ChevronRight } from 'lucide-react';
import { fetchPublicMovies } from '../services/movieCatalog';

const ALL_GENRES_DATA = [
  { id: 28, name: 'Action', icon: '💥', count: '12,400+ Movies', bg: 'https://image.tmdb.org/t/p/w780/628Dep6AxEtDxjHGz9vKjL6L37a.jpg' },
  { id: 12, name: 'Adventure', icon: '🤠', count: '9,800+ Movies', bg: 'https://image.tmdb.org/t/p/w780/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg' },
  { id: 16, name: 'Animation', icon: '🎨', count: '5,200+ Movies', bg: 'https://image.tmdb.org/t/p/w780/14GEidL347zL296614798.jpg' },
  { id: 35, name: 'Comedy', icon: '😂', count: '18,500+ Movies', bg: 'https://image.tmdb.org/t/p/w780/39L1Uky92209M92aN8E04X74937.jpg' },
  { id: 80, name: 'Crime', icon: '🕵️‍♂️', count: '8,100+ Movies', bg: 'https://image.tmdb.org/t/p/w780/rSPw7tgCH9c6NqICZefy12pY1XG.jpg' },
  { id: 99, name: 'Documentary', icon: '📹', count: '14,000+ Titles', bg: 'https://image.tmdb.org/t/p/w780/87823y6741y768.jpg' },
  { id: 18, name: 'Drama', icon: '🎭', count: '24,000+ Movies', bg: 'https://image.tmdb.org/t/p/w780/hZkgoQY85WERR9yUefJAwIyAFLE.jpg' },
  { id: 14, name: 'Fantasy', icon: '🧙‍♂️', count: '6,400+ Movies', bg: 'https://image.tmdb.org/t/p/w780/7AB2c99jO7v6J1e3bL783k3.jpg' },
  { id: 27, name: 'Horror', icon: '👻', count: '7,900+ Movies', bg: 'https://image.tmdb.org/t/p/w780/5gPp62TbdW1jM248W1j2aF75653.jpg' },
  { id: 9648, name: 'Mystery', icon: '🔍', count: '4,800+ Movies', bg: 'https://image.tmdb.org/t/p/w780/9l1E73g6Z02aJjG0937a091L34.jpg' },
  { id: 10749, name: 'Romance', icon: '💖', count: '11,200+ Movies', bg: 'https://image.tmdb.org/t/p/w780/97Z9d1W97321a97.jpg' },
  { id: 878, name: 'Science Fiction', icon: '🚀', count: '8,600+ Movies', bg: 'https://image.tmdb.org/t/p/w780/8tABVawMDeuE1xJ6z321g9.jpg' },
  { id: 53, name: 'Thriller', icon: '🔪', count: '15,300+ Movies', bg: 'https://image.tmdb.org/t/p/w780/2u7zbn8YUdG6pdV9P22687.jpg' },
  { id: 10752, name: 'War', icon: '🪖', bg: 'https://image.tmdb.org/t/p/w780/3R1o0918731y6.jpg', count: '3,100+ Movies' },
  { id: 36, name: 'Biography', icon: '📚', count: '4,200+ Movies', bg: 'https://image.tmdb.org/t/p/w780/z978y21873.jpg' },
  { id: 10770, name: 'Sports', icon: '⚽', count: '2,900+ Movies', bg: 'https://image.tmdb.org/t/p/w780/9871239812.jpg' },
];

const Genres = () => {
  const [genreCounts, setGenreCounts] = useState({});

  useEffect(() => {
    let active = true;

    fetchPublicMovies().then((movies) => {
      if (!active) return;

      const counts = movies.reduce((result, movie) => {
        const names = [
          ...(movie.genres || []).map((genre) => typeof genre === 'string' ? genre : genre?.name),
          ...(movie.genre_ids || []).map((id) => ALL_GENRES_DATA.find((genre) => genre.id === id)?.name),
          ...(typeof movie.genre === 'string' ? movie.genre.split(',') : []),
        ].map((name) => String(name || '').trim()).filter(Boolean);

        names.forEach((name) => {
          const match = ALL_GENRES_DATA.find((genre) => genre.name.toLowerCase() === name.toLowerCase());
          if (match) result[match.id] = (result[match.id] || 0) + 1;
        });

        return result;
      }, {});

      setGenreCounts(counts);
    }).catch(() => {
      if (active) setGenreCounts({});
    });

    return () => { active = false; };
  }, []);

  return (
    <div className="page-container genres-page">
      <div className="page-header">
        <div className="header-badge-row">
          <Grid size={28} color="#3B82F6" />
          <h1>Genres</h1>
        </div>
        <p>Browse your movie catalog by the stories and styles you love.</p>
      </div>

      <div className="genres-full-grid">
        {ALL_GENRES_DATA.map((genre) => (
          <Link key={genre.id} to={`/genre/${genre.id}`} className="genre-card-large">
            <div className="genre-card-bg" style={{ backgroundImage: `url(${genre.bg})` }} />
            <div className="genre-card-overlay" />
            <div className="genre-card-content">
              <span className="genre-card-emoji">{genre.icon}</span>
              <h2>{genre.name}</h2>
              <span className="genre-card-count">{genreCounts[genre.id] || 0} movies in your catalog</span>
              <div className="genre-card-arrow">
                <span>Explore</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Genres;
