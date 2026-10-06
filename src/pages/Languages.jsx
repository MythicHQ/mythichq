import React, { useMemo, useState } from 'react';
import { ArrowRight, Globe, Languages as LanguagesIcon, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const getLanguages = (movie) => {
  const values = Array.isArray(movie?.languages)
    ? movie.languages
    : typeof movie?.language === 'string'
      ? movie.language.split(',')
      : [];

  return values.map((language) => String(language).trim()).filter(Boolean);
};

const LanguagesPage = () => {
  const { movies } = usePublicCatalog();
  const [query, setQuery] = useState('');

  const languages = useMemo(() => {
    const counts = new Map();
    movies.forEach((movie) => {
      getLanguages(movie).forEach((language) => {
        const key = language.toLowerCase();
        const current = counts.get(key) || { name: language, count: 0, poster: movie.poster_path };
        counts.set(key, { ...current, count: current.count + 1, poster: current.poster || movie.poster_path });
      });
    });

    return [...counts.values()]
      .filter((language) => language.name.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));
  }, [movies, query]);

  return (
    <div className="page-container languages-page">
      <div className="page-header languages-header">
        <div className="header-badge-row">
          <LanguagesIcon size={28} color="#06B6D4" />
          <h1>Browse by Language</h1>
        </div>
        <p>Find stories in the languages that feel closest to home.</p>
        <label className="languages-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search languages" aria-label="Search languages" />
        </label>
      </div>

      {languages.length > 0 ? (
        <div className="language-card-grid">
          {languages.map((language, index) => (
            <Link
              key={language.name}
              to={`/movies?language=${encodeURIComponent(language.name)}`}
              className="language-card"
              style={language.poster ? { '--language-poster': `url(${language.poster})` } : undefined}
            >
              <div className="language-card-art" />
              <div className="language-card-overlay" />
              <div className="language-card-content">
                <Globe size={20} />
                <div className="language-card-copy">
                  <strong>{language.name}</strong>
                  <span>{language.name} Movies &amp; Shows</span>
                </div>
                <span className="language-card-arrow"><ArrowRight size={22} /></span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state"><Globe size={40} /><h3>No languages found</h3><p>Try another search or add language information to your movies.</p></div>
      )}
    </div>
  );
};

export default LanguagesPage;