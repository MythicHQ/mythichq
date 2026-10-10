import { useEffect, useState } from 'react';
import { fetchPublicMovies, getCachedPublicMovies, PUBLIC_CATALOG_CACHE_KEY } from '../services/movieCatalog';
import { subscribeToCachedRequest } from '../services/requestCache';

export const usePublicCatalog = () => {
  const [movies, setMovies] = useState(() => getCachedPublicMovies() || []);
  const [loading, setLoading] = useState(() => getCachedPublicMovies() === undefined);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToCachedRequest(PUBLIC_CATALOG_CACHE_KEY, (nextMovies) => {
      if (!active) return;
      if (nextMovies) {
        setMovies(nextMovies);
        return;
      }
      fetchPublicMovies()
        .then((refreshedMovies) => { if (active) setMovies(refreshedMovies); })
        .catch((error) => console.error('Failed to refresh the public movie catalog:', error));
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
