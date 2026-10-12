import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clapperboard, Film, Sparkles } from 'lucide-react';
import { BROWSE_CATEGORIES } from '../data/browseCategories';
import { fetchBrowseCategoryImages, subscribeToBrowseCategoryImages } from '../services/browseCategoryImages';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const ALL_GENRES_DATA = [
  { id: 28, name: 'Action', icon: '💥', color: '#aa3a49' },
  { id: 12, name: 'Adventure', icon: '🤠', color: '#98633c' },
  { id: 16, name: 'Animation', icon: '🎨', color: '#9156a5' },
  { id: 35, name: 'Comedy', icon: '😂', color: '#a98536' },
  { id: 80, name: 'Crime', icon: '🕵️‍♂️', color: '#53657e' },
  { id: 99, name: 'Documentary', icon: '📹', color: '#447c78' },
  { id: 18, name: 'Drama', icon: '🎭', color: '#85505d' },
  { id: 14, name: 'Fantasy', icon: '🧙‍♂️', color: '#6559a5' },
  { id: 27, name: 'Horror', icon: '👻', color: '#53634e' },
  { id: 9648, name: 'Mystery', icon: '🔍', color: '#4f6387' },
  { id: 10749, name: 'Romance', icon: '💖', color: '#a24d72' },
  { id: 878, name: 'Science Fiction', icon: '🚀', color: '#397b91' },
  { id: 53, name: 'Thriller', icon: '🔪', color: '#805342' },
  { id: 10752, name: 'War', icon: '🪖', color: '#65704b' },
  { id: 36, name: 'Biography', icon: '📚', color: '#76644d' },
  { id: 10770, name: 'Sports', icon: '⚽', color: '#467c57' },
];

const Genres = () => {
  const { movies, loading } = usePublicCatalog();
  const [browseCategoryImages, setBrowseCategoryImages] = useState({});

  useEffect(() => {
    let isMounted = true;
    const refreshCategoryImages = () => {
      fetchBrowseCategoryImages()
        .then((images) => {
          if (isMounted) setBrowseCategoryImages(images);
        })
        .catch((error) => console.warn('Genre category images could not be refreshed:', error));
    };

    const unsubscribe = subscribeToBrowseCategoryImages(refreshCategoryImages);
    refreshCategoryImages();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const genreCatalog = useMemo(() => {
    const result = Object.fromEntries(ALL_GENRES_DATA.map((genre) => [genre.id, { count: 0, image: '' }]));

    movies.forEach((movie) => {
      const genreIds = new Set((movie.genre_ids || []).map(Number));
      const genreNames = [
        ...(movie.genres || []).map((genre) => typeof genre === 'string' ? genre : genre?.name),
        ...(typeof movie.genre === 'string' ? movie.genre.split(',') : []),
      ];

      genreNames.forEach((name) => {
        const match = ALL_GENRES_DATA.find((genre) => genre.name.toLowerCase() === String(name || '').trim().toLowerCase());
        if (match) genreIds.add(match.id);
      });

      genreIds.forEach((id) => {
        if (!result[id]) return;
        result[id].count += 1;

        const image = movie.backdrop_path || movie.backdrop_url || movie.poster_path || movie.poster_url;
        if (!result[id].image && image && !image.includes('/movie-assets/backdrops/default-backdrop')) {
          result[id].image = image;
        }
      });
    });

    BROWSE_CATEGORIES.forEach((category) => {
      const adminImage = browseCategoryImages[category.id]?.image_url;
      if (!result[category.id]) return;
      if (adminImage) result[category.id].image = adminImage;
      if (!result[category.id].image) result[category.id].image = category.bg;
    });

    return result;
  }, [browseCategoryImages, movies]);

  return (
    <div className="page-container genres-page">
      <header className="genres-hero">
        <div className="genres-hero-copy">
          <span className="genres-eyebrow"><Sparkles size={14} /> FIND YOUR NEXT FAVORITE</span>
          <h1>Every mood has<br />a movie.</h1>
          <p>From edge-of-your-seat thrills to stories that stay with you. Pick a genre and find your next watch.</p>
        </div>
        <div className="genres-hero-aside">
          <span className="genres-hero-icon"><Clapperboard size={25} /></span>
          <strong>16</strong>
          <span>ways to find<br />your next story</span>
        </div>
        <span className="genres-hero-orbit" aria-hidden="true" />
      </header>

      <section className="genres-library" aria-labelledby="genres-library-title">
        <div className="genres-library-heading">
          <div>
            <span className="genres-section-kicker">EXPLORE BY MOOD</span>
            <h2 id="genres-library-title">Browse all genres</h2>
          </div>
          <span className="genres-library-count"><Film size={15} /> {ALL_GENRES_DATA.length} genres</span>
        </div>

        <div className="genres-full-grid">
          {ALL_GENRES_DATA.map((genre, index) => {
            const catalogEntry = genreCatalog[genre.id];
            return (
              <Link
                key={genre.id}
                to={`/genre/${genre.id}`}
                className="genre-card-large"
                style={{ '--genre-color': genre.color, '--genre-index': index, backgroundImage: catalogEntry.image ? `url("${catalogEntry.image}")` : `url("${BROWSE_CATEGORIES.find((item) => item.id === genre.id)?.bg || ''}")` }}
              >
                <span className="genre-card-art" aria-hidden="true" />
                <span className="genre-card-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="genre-card-content">
                  <span className="genre-card-emoji" aria-hidden="true">{genre.icon}</span>
                  <span className="genre-card-copy">
                    <strong>{genre.name}</strong>
                    <small>{loading ? 'Loading titles' : `${catalogEntry.count} ${catalogEntry.count === 1 ? 'title' : 'titles'}`}</small>
                  </span>
                  <span className="genre-card-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Genres;
