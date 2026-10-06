import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../../lib/supabase';

const WatchlistContext = createContext();

export const WatchlistProvider = ({ children }) => {
  const { user, requireAuth } = useAuth();
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('mythichq_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load watchlist from localStorage', e);
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadWatchlist = async () => {
      if (!user || !supabase) {
        try {
          const saved = localStorage.getItem('mythichq_watchlist');
          if (!cancelled) setWatchlist(saved ? JSON.parse(saved) : []);
        } catch (error) {
          console.error('Failed to restore guest watchlist:', error);
          if (!cancelled) setWatchlist([]);
        }
        return;
      }

      const { data, error } = await supabase
        .from('watchlist_items')
        .select('movie, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load watchlist from Supabase:', error);
        return;
      }

      if (!cancelled) setWatchlist((data || []).map((item) => item.movie));
    };

    loadWatchlist();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('mythichq_watchlist', JSON.stringify(watchlist));
      } catch (e) {
        console.error('Failed to save watchlist to localStorage', e);
      }
    }
  }, [watchlist, user]);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type, id: Date.now() });
  };

  const isInWatchlist = (movieId) => {
    return watchlist.some((m) => m.id === movieId);
  };

  const addToWatchlist = (movie) => {
    if (!isInWatchlist(movie.id)) {
      setWatchlist((prev) => [movie, ...prev]);
      if (user && supabase) {
        supabase.from('watchlist_items').insert({ user_id: user.id, movie_id: Number(movie.id), movie }).then(({ error }) => {
          if (error) console.error('Failed to save watchlist item:', error);
        });
      }
      showToast(`"${movie.title}" added to your Watchlist! 🔥`, 'add');
    }
  };

  const removeFromWatchlist = (movieId) => {
    const movie = watchlist.find((m) => m.id === movieId);
    setWatchlist((prev) => prev.filter((m) => m.id !== movieId));
    if (user && supabase) {
      supabase.from('watchlist_items').delete().eq('user_id', user.id).eq('movie_id', Number(movieId)).then(({ error }) => {
        if (error) console.error('Failed to remove watchlist item:', error);
      });
    }
    if (movie) {
      showToast(`"${movie.title}" removed from Watchlist`, 'remove');
    }
  };

  const toggleWatchlist = (movie) => {
    if (!user) {
      requireAuth();
      return;
    }
    if (isInWatchlist(movie.id)) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist(movie);
    }
  };

  const clearWatchlist = () => {
    setWatchlist([]);
    if (user && supabase) {
      supabase.from('watchlist_items').delete().eq('user_id', user.id).then(({ error }) => {
        if (error) console.error('Failed to clear watchlist:', error);
      });
    }
    showToast('Watchlist cleared', 'info');
  };

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        isInWatchlist,
        clearWatchlist,
        toastMessage,
        setToastMessage,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};
