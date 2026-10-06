import { useEffect, useState } from 'react';
import { fetchPublicMovies, getCachedPublicMovies } from '../services/movieCatalog';
import { subscribeToCachedRequest } from '../services/requestCache';

export const usePublicCatalog = () => {
  const [movies, setMovies] = useState(() => getCachedPublicMovies() || []);
  const [loading, setLoading] = useState(() => getCachedPublicMovies() === undefined);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToCachedRequest('catalog:public', (nextMovies) => {
      if (active) setMovies(nextMovies);
    });

    fetchPublicMovies()
      .then((nextMovies) => {
        if (active) setMovies(nextMovies);
      })
      .catch((error) => {
        console.error('Failed to load the public movie catalog:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { movies, loading };
};
