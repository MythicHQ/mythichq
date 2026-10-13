import { supabase } from '../lib/supabase';
import { cachedRequest, invalidateCache } from './requestCache';

const PUBLIC_PHASE_CACHE_TTL = 5 * 60 * 1000;
const showError = (error) => {
  if (['42P01', 'PGRST205', 'PGRST202', 'PGRST204', '42703'].includes(error?.code)) {
    return new Error('The Studio Phases database migration is out of date. Run supabase/studio_phases.sql in the Supabase SQL editor.');
  }
  return error;
};

const fetchStudioPhasesFromSupabase = async (studioId, { includeDrafts = false } = {}) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  let phaseQuery = supabase.from('studio_phases').select('*').order('display_order', { ascending: true }).order('phase_number', { ascending: true });
  if (studioId) phaseQuery = phaseQuery.eq('studio_id', studioId);
  if (!includeDrafts) phaseQuery = phaseQuery.eq('status', 'published');

  const { data: phases, error: phaseError } = await phaseQuery;
  if (phaseError) throw showError(phaseError);
  if (!phases?.length) return [];

  const { data: assignments, error: assignmentError } = await supabase
    .from('studio_phase_movies')
    .select('*')
    .in('phase_id', phases.map((phase) => phase.id))
    .order('watch_order', { ascending: true });
  if (assignmentError) throw showError(assignmentError);

  const assignmentsByPhase = new Map();
  (assignments || []).forEach((assignment) => {
    const list = assignmentsByPhase.get(assignment.phase_id) || [];
    list.push(assignment);
    assignmentsByPhase.set(assignment.phase_id, list);
  });

  return phases.map((phase) => ({ ...phase, movies: assignmentsByPhase.get(phase.id) || [] }));
};

export const fetchStudioPhases = async (studioId, { includeDrafts = false } = {}) => {
  if (includeDrafts || !studioId) {
    return fetchStudioPhasesFromSupabase(studioId, { includeDrafts });
  }
  return cachedRequest(
    `catalog:studio-phases:${studioId}`,
    () => fetchStudioPhasesFromSupabase(studioId),
    { ttl: PUBLIC_PHASE_CACHE_TTL },
  );
};

const invalidatePublishedStudioPhases = () => invalidateCache('catalog:studio-phases:');

export const saveStudioPhase = async (values, phaseId = null, { imageFile = null, previous = null } = {}) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const title = String(values.title || '').trim();
  if (!values.studio_id) throw new Error('Choose a studio for this phase.');
  if (!title) throw new Error('A phase title is required.');

  const imageUrl = String(values.image_url || '').trim();
  if (imageUrl && !imageFile) {
    let parsed;
    try {
      parsed = new URL(imageUrl);
    } catch {
      throw new Error('Phase image URL must be a valid HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Phase image URL must be a valid HTTP or HTTPS URL.');
  }
  if (imageFile && (!['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type) || imageFile.size > 8 * 1024 * 1024)) {
    throw new Error('Choose a PNG, JPEG, or WebP image that is 8 MB or smaller.');
  }

  let uploadedPath = null;
  try {
    let savedImageUrl = imageUrl || null;
    let savedImagePath = imageUrl && imageUrl === previous?.image_url ? previous?.image_path || null : null;
    if (imageFile) {
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[imageFile.type];
      uploadedPath = `phases/${crypto.randomUUID()}.${extension}`;
      const bucket = supabase.storage.from('studio-images');
      const { error: uploadError } = await bucket.upload(uploadedPath, imageFile, {
        cacheControl: '3600',
        contentType: imageFile.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      savedImageUrl = bucket.getPublicUrl(uploadedPath).data.publicUrl;
      savedImagePath = uploadedPath;
    }

    const payload = {
      studio_id: values.studio_id,
      phase_number: Math.max(1, Number(values.phase_number) || 1),
      title,
      description: String(values.description || '').trim(),
      image_url: savedImageUrl,
      image_path: savedImagePath,
      release_period: String(values.release_period || '').trim() || null,
      display_order: Math.max(0, Number(values.display_order) || 0),
      status: values.status === 'published' ? 'published' : 'draft',
      updated_at: new Date().toISOString(),
    };
    const query = phaseId
      ? supabase.from('studio_phases').update(payload).eq('id', phaseId)
      : supabase.from('studio_phases').insert(payload);
    const { data, error } = await query.select('*').single();
    if (error) throw showError(error);

    if (previous?.image_path && previous.image_path !== data.image_path) {
      const { error: removeError } = await supabase.storage.from('studio-images').remove([previous.image_path]);
      if (removeError) console.warn('Phase saved, but the replaced phase image could not be removed:', removeError);
    }
    invalidatePublishedStudioPhases();
    return data;
  } catch (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage.from('studio-images').remove([uploadedPath]);
      if (cleanupError) console.warn('Unable to remove an uploaded phase image after save failed:', cleanupError);
    }
    throw showError(error);
  }
};

export const deleteStudioPhase = async (phaseId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('studio_phases').delete().eq('id', phaseId);
  if (error) throw showError(error);
  invalidatePublishedStudioPhases();
};

export const savePhaseMovie = async (phaseId, movieId, values = {}, assignmentId = null) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!phaseId || !movieId) throw new Error('A phase and movie are required.');
  const payload = {
    phase_id: phaseId,
    movie_id: Number(movieId),
    watch_order: Math.max(1, Number(values.watch_order) || 1),
    custom_label: String(values.custom_label || '').trim() || null,
    watch_note: String(values.watch_note || '').trim() || null,
    is_override: Boolean(values.is_override),
    updated_at: new Date().toISOString(),
  };
  const query = assignmentId
    ? supabase.from('studio_phase_movies').update(payload).eq('id', assignmentId)
    : supabase.from('studio_phase_movies').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw showError(error);
  invalidatePublishedStudioPhases();
  return data;
};

export const addPhaseMovies = async (phaseId, movieIds, studioMovieIds) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!phaseId || !movieIds.length) return [];
  const { data: existing, error: existingError } = await supabase.from('studio_phase_movies')
    .select('watch_order').eq('phase_id', phaseId).order('watch_order', { ascending: false }).limit(1);
  if (existingError) throw showError(existingError);
  const firstOrder = Number(existing?.[0]?.watch_order || 0) + 1;
  const rows = movieIds.map((movieId, index) => ({
    phase_id: phaseId,
    movie_id: Number(movieId),
    watch_order: firstOrder + index,
    is_override: !studioMovieIds.has(String(movieId)),
  }));
  const { data, error } = await supabase.from('studio_phase_movies').insert(rows).select('*');
  if (error) throw showError(error);
  invalidatePublishedStudioPhases();
  return data || [];
};

export const deletePhaseMovie = async (assignmentId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('studio_phase_movies').delete().eq('id', assignmentId);
  if (error) throw showError(error);
  invalidatePublishedStudioPhases();
};

export const reorderPhaseMovies = async (assignments) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('set_studio_phase_movie_order', {
    p_assignment_ids: assignments.map((assignment) => assignment.id),
  });
  if (error) throw showError(error);
  invalidatePublishedStudioPhases();
};

export const reorderStudioPhases = async (phases) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('set_studio_phase_order', {
    p_phase_ids: phases.map((phase) => phase.id),
  });
  if (error) throw showError(error);
  invalidatePublishedStudioPhases();
};

export const fetchStudioPhaseMovieAssignments = async (studioId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('content_studio_assignments')
    .select('movie_id')
    .eq('studio_id', studioId)
    .not('movie_id', 'is', null);
  if (error) throw showError(error);
  return new Set((data || []).map((row) => String(row.movie_id)));
};
