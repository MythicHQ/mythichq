import { supabase } from '../lib/supabase';

const showError = (error) => {
  if (!error) return error;
  const code = error.code || '';
  if (['42P01', 'PGRST205', 'PGRST202', 'PGRST204', '42883', '42703'].includes(code)) {
    return new Error('The Studio Watch Order database migration is out of date. Run the latest supabase/studio_watch_orders.sql in the Supabase SQL editor.');
  }
  return error;
};

const loadHierarchy = (order, sagas, phases, entries) => {
  const phasesBySaga = new Map();
  phases.forEach((phase) => {
    const list = phasesBySaga.get(phase.saga_id || '__root__') || [];
    list.push(phase);
    phasesBySaga.set(phase.saga_id || '__root__', list);
  });

  const entriesByPhase = new Map();
  entries.forEach((entry) => {
    const list = entriesByPhase.get(entry.phase_id) || [];
    list.push(entry);
    entriesByPhase.set(entry.phase_id, list);
  });

  const normalizePhases = (phaseList = []) => phaseList
    .filter((phase) => !phase.saga_id || phase.studio_watch_order_id === order.id)
    .map((phase) => ({
      ...phase,
      entries: (entriesByPhase.get(phase.id) || []).sort((first, second) => Number(first.position || 0) - Number(second.position || 0)),
    }))
    .sort((first, second) => Number(first.display_order || 0) - Number(second.display_order || 0));

  return {
    ...order,
    phases: normalizePhases(phasesBySaga.get('__root__') || []),
    sagas: (sagas || [])
      .filter((saga) => saga.studio_watch_order_id === order.id)
      .map((saga) => ({
        ...saga,
        phases: normalizePhases(phasesBySaga.get(saga.id) || []),
      }))
      .sort((first, second) => Number(first.display_order || 0) - Number(second.display_order || 0)),
  };
};

export const fetchStudioWatchOrders = async (studioId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: orders, error: orderError } = await supabase
    .from('studio_watch_orders')
    .select('*')
    .eq('studio_id', studioId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (orderError) throw showError(orderError);
  if (!orders?.length) return [];

  const orderIds = orders.map((order) => order.id);
  const [{ data: sagas = [], error: sagaError }, { data: phases = [], error: phaseError }, { data: entries = [], error: entryError }] = await Promise.all([
    supabase.from('studio_watch_order_sagas').select('*').in('studio_watch_order_id', orderIds).order('display_order', { ascending: true }),
    supabase.from('studio_watch_order_phases').select('*').in('studio_watch_order_id', orderIds).order('display_order', { ascending: true }),
    supabase.from('studio_watch_order_entries').select('*').in('studio_watch_order_id', orderIds).order('position', { ascending: true }),
  ]);

  if (sagaError) throw showError(sagaError);
  if (phaseError) throw showError(phaseError);
  if (entryError) throw showError(entryError);

  if (!orders.length) return [];
  return orders.map((order) => loadHierarchy(order, sagas, phases, entries));
};

export const fetchPublishedStudioWatchOrder = async (studioId) => {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: orders, error: orderError } = await supabase
    .from('studio_watch_orders')
    .select('*')
    .eq('studio_id', studioId)
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (orderError) throw showError(orderError);
  if (!orders?.length) return null;

  const order = orders[0];
  const [{ data: sagas = [], error: sagaError }, { data: phases = [], error: phaseError }, { data: entries = [], error: entryError }] = await Promise.all([
    supabase.from('studio_watch_order_sagas').select('*').eq('studio_watch_order_id', order.id).order('display_order', { ascending: true }),
    supabase.from('studio_watch_order_phases').select('*').eq('studio_watch_order_id', order.id).order('display_order', { ascending: true }),
    supabase.from('studio_watch_order_entries').select('*').eq('studio_watch_order_id', order.id).order('position', { ascending: true }),
  ]);

  if (sagaError) throw showError(sagaError);
  if (phaseError) throw showError(phaseError);
  if (entryError) throw showError(entryError);

  return loadHierarchy(order, sagas, phases, entries);
};

export const saveStudioWatchOrder = async ({ studioId, values, watchOrderId }) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const payload = {
    studio_id: studioId,
    title: String(values.title || '').trim(),
    subtitle: String(values.subtitle || '').trim(),
    description: String(values.description || '').trim(),
    background_url: values.background_url || null,
    background_path: values.background_path || null,
    display_order: Number(values.display_order || 0),
    is_published: Boolean(values.is_published),
    updated_at: new Date().toISOString(),
  };
  if (!payload.title) throw new Error('A watch order title is required.');

  const query = watchOrderId
    ? supabase.from('studio_watch_orders').update(payload).eq('id', watchOrderId)
    : supabase.from('studio_watch_orders').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw showError(error);
  return data;
};

export const saveWatchOrderSaga = async ({ watchOrderId, values, sagaId }) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const payload = {
    studio_watch_order_id: watchOrderId,
    name: String(values.name || '').trim(),
    description: String(values.description || '').trim(),
    cover_url: values.cover_url || null,
    cover_path: values.cover_path || null,
    display_order: Number(values.display_order || 0),
    is_published: Boolean(values.is_published),
  };
  if (!payload.name) throw new Error('A saga name is required.');

  const query = sagaId
    ? supabase.from('studio_watch_order_sagas').update(payload).eq('id', sagaId)
    : supabase.from('studio_watch_order_sagas').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw showError(error);
  return data;
};

export const saveWatchOrderPhase = async ({ sagaId, values, phaseId }) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const payload = {
    saga_id: sagaId,
    studio_watch_order_id: values.studio_watch_order_id || null,
    name: String(values.name || '').trim(),
    phase_number: Number(values.phase_number || 1),
    description: String(values.description || '').trim(),
    background_url: values.background_url || null,
    background_path: values.background_path || null,
    display_order: Number(values.display_order || 0),
    is_published: Boolean(values.is_published),
  };
  if (!payload.name) throw new Error('A phase name is required.');

  const query = phaseId
    ? supabase.from('studio_watch_order_phases').update(payload).eq('id', phaseId)
    : supabase.from('studio_watch_order_phases').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw showError(error);
  return data;
};

export const saveWatchOrderEntry = async ({ phaseId, values, entryId }) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const payload = {
    phase_id: phaseId,
    movie_id: values.movie_id || null,
    tv_show_id: values.tv_show_id || null,
    title_override: values.title_override || null,
    custom_note: values.custom_note || null,
    content_type: values.content_type || (values.movie_id ? 'movie' : values.tv_show_id ? 'tv_show' : 'movie'),
    release_label: values.release_label || null,
    watch_number: values.watch_number != null ? Number(values.watch_number) : null,
    position: Number(values.position || 0),
    is_visible: values.is_visible !== false,
  };
  if (!payload.movie_id && !payload.tv_show_id) throw new Error('Select a movie or TV show before saving this watch-order entry.');

  const query = entryId
    ? supabase.from('studio_watch_order_entries').update(payload).eq('id', entryId)
    : supabase.from('studio_watch_order_entries').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw showError(error);
  return data;
};

export const deleteStudioWatchOrder = async (watchOrderId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('studio_watch_orders').delete().eq('id', watchOrderId);
  if (error) throw showError(error);
};

export const deleteWatchOrderSaga = async (sagaId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('studio_watch_order_sagas').delete().eq('id', sagaId);
  if (error) throw showError(error);
};

export const deleteWatchOrderPhase = async (phaseId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('studio_watch_order_phases').delete().eq('id', phaseId);
  if (error) throw showError(error);
};

export const deleteWatchOrderEntry = async (entryId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('studio_watch_order_entries').delete().eq('id', entryId);
  if (error) throw showError(error);
};
