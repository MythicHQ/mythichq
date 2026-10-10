import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Plus } from 'lucide-react';
import { fetchAdminTvShows } from '../../services/tvShows';
import { supabase } from '../../lib/supabase';
import { invalidateCache } from '../../services/requestCache';
import { getBackdropDisplayUrl } from '../../services/tmdb';
import CropImage from '../../components/CropImage';
import ImageCropButton from '../../components/ImageCropButton';

const AdminTvHeroSectionPage = () => {
  const [shows, setShows] = useState([]);
  const [selectedShows, setSelectedShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadShows = async () => {
    setLoading(true);
    setError('');
    try {
      const [allShows, { data, error: selectionError }] = await Promise.all([
        fetchAdminTvShows(),
        supabase.from('hero_tv_shows').select('*').order('position', { ascending: true }),
      ]);
      if (selectionError) throw selectionError;
      setShows(allShows);
      setSelectedShows((data || [])
        .map((entry) => {
          const show = allShows.find((item) => Number(item.id) === Number(entry.tv_show_id));
          return show ? { ...show, hero_position: entry.position } : null;
        })
        .filter(Boolean));
    } catch (loadError) {
      console.error('Failed to load TV show hero selection:', loadError);
      setError(loadError.message || 'Unable to load the TV show hero selection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShows();
  }, []);

  const updateSelection = async (action) => {
    setError('');
    try {
      await action();
      invalidateCache('catalog:');
      await loadShows();
    } catch (saveError) {
      console.error('Failed to update TV show hero selection:', saveError);
      setError(saveError.message || 'Unable to update the TV show hero selection.');
    }
  };

  const addShow = (show) => updateSelection(async () => {
    const { error: saveError } = await supabase.from('hero_tv_shows').upsert({
      tv_show_id: show.id,
      position: selectedShows.length + 1,
    }, { onConflict: 'tv_show_id' });
    if (saveError) throw saveError;
  });

  const removeShow = (showId) => updateSelection(async () => {
    const { error: deleteError } = await supabase.from('hero_tv_shows').delete().eq('tv_show_id', showId);
    if (deleteError) throw deleteError;
  });

  const moveShow = (show, direction) => updateSelection(async () => {
    const ordered = [...selectedShows].sort((a, b) => Number(a.hero_position) - Number(b.hero_position));
    const index = ordered.findIndex((item) => Number(item.id) === Number(show.id));
    const other = ordered[index + direction];
    if (!other) return;
    const results = await Promise.all([
      supabase.from('hero_tv_shows').update({ position: other.hero_position }).eq('tv_show_id', show.id),
      supabase.from('hero_tv_shows').update({ position: show.hero_position }).eq('tv_show_id', other.id),
    ]);
    const failedUpdate = results.find((result) => result.error)?.error;
    if (failedUpdate) throw failedUpdate;
  });

  const selectedIds = new Set(selectedShows.map((show) => Number(show.id)));
  const availableShows = shows.filter((show) => show.is_published === true && !selectedIds.has(Number(show.id)) && getBackdropDisplayUrl(show.backdrop_path || show.backdrop_url));

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Hero section</p>
          <h1>TV Show Page Hero</h1>
          <p className="admin-header-copy">Choose published TV shows to feature on the TV Shows page.</p>
        </div>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <section className="admin-panel">
        <div className="admin-panel-header"><div><p className="admin-panel-eyebrow">Selected content</p><h3>TV show hero picks</h3></div></div>
        {loading ? <div className="admin-empty-state">Loading TV shows...</div> : selectedShows.length ? (
          <div className="admin-section-list">
            {[...selectedShows].sort((a, b) => Number(a.hero_position) - Number(b.hero_position)).map((show, index) => (
              <div className="admin-section-row" key={show.id}>
                <div className="admin-section-media"><CropImage src={getBackdropDisplayUrl(show.backdrop_path || show.backdrop_url)} alt={`${show.title} backdrop`} /></div>
                <div className="admin-section-copy"><strong>{index + 1}. {show.title}</strong><span>{show.premiere_date || show.release_date || 'Premiere date TBD'}</span></div>
                <div className="admin-section-actions">
                  <button type="button" className="admin-icon-btn" onClick={() => moveShow(show, -1)} disabled={index === 0} aria-label={`Move ${show.title} up`}><ArrowUp size={15} /></button>
                  <button type="button" className="admin-icon-btn" onClick={() => moveShow(show, 1)} disabled={index === selectedShows.length - 1} aria-label={`Move ${show.title} down`}><ArrowDown size={15} /></button>
                  <button type="button" className="admin-icon-btn danger" onClick={() => removeShow(show.id)} aria-label={`Remove ${show.title} from hero`}><Minus size={15} /></button>
                  <ImageCropButton source={getBackdropDisplayUrl(show.backdrop_path || show.backdrop_url)} label={`${show.title} TV hero backdrop`} aspectRatio="16:9" className="admin-button admin-button-secondary admin-hero-crop-button" />
                </div>
              </div>
            ))}
          </div>
        ) : <div className="admin-empty-state">No TV shows are selected for the TV Show page hero.</div>}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-header"><div><p className="admin-panel-eyebrow">Published shows with backdrops</p><h3>Add a TV show</h3></div><span className="admin-filter-count">{availableShows.length} available</span></div>
        {availableShows.length ? (
          <div className="admin-hero-movie-grid">
            {availableShows.map((show) => (
              <div className="admin-hero-movie-card" key={show.id}>
                <CropImage src={getBackdropDisplayUrl(show.backdrop_path || show.backdrop_url)} alt={`${show.title} backdrop`} />
                <div className="admin-hero-movie-card-copy"><strong>{show.title}</strong><span>{show.premiere_date || 'Premiere date TBD'}</span></div>
                <button type="button" className="admin-button admin-button-primary admin-hero-add-button" onClick={() => addShow(show)}><Plus size={16} />Add</button>
                <ImageCropButton source={getBackdropDisplayUrl(show.backdrop_path || show.backdrop_url)} label={`${show.title} TV hero backdrop`} aspectRatio="16:9" className="admin-button admin-button-secondary admin-hero-crop-button" />
              </div>
            ))}
          </div>
        ) : <div className="admin-empty-state">Publish a TV show with a backdrop to add it here.</div>}
      </section>
    </div>
  );
};

export default AdminTvHeroSectionPage;
