import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Globe, Languages as LanguagesIcon, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePublicCatalog } from '../hooks/usePublicCatalog';
import SearchClearButton from '../components/SearchClearButton';
import CropImage from '../components/CropImage';
import { getLanguagesFromMovies } from '../services/languageCatalog';
import { fetchLanguageCardImages, subscribeToLanguageCardImages } from '../services/languageCardImages';

const LanguagesPage = () => {
  const { movies } = usePublicCatalog();
  const [query, setQuery] = useState('');
  const [images, setImages] = useState({});

  useEffect(() => {
    let active = true;
    const refresh = () => fetchLanguageCardImages()
      .then((next) => { if (active) setImages(next); })
      .catch((error) => console.error('Failed to load language card images:', error));
    void refresh();
    const unsubscribe = subscribeToLanguageCardImages(() => { void refresh(); });
    return () => { active = false; unsubscribe(); };
  }, []);

  const languages = useMemo(() => getLanguagesFromMovies(movies, query), [movies, query]);

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
          <SearchClearButton value={query} onClear={() => setQuery('')} label="language search" />
        </label>
      </div>

      {languages.length > 0 ? (
        <div className="language-card-grid">
          {languages.map((language, index) => (
            <Link
              key={language.name}
              to={`/movies?language=${encodeURIComponent(language.name)}`}
              className="language-card"
            >
              {(images[language.slug]?.image_url || language.poster) && <CropImage className="language-card-art" src={images[language.slug]?.image_url || language.poster} alt="" />}
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
