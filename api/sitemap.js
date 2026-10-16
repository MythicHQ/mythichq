import { createClient } from '@supabase/supabase-js';
import { isRemovedPublicTitle } from '../src/utils/publicCatalog.js';

const SITE_ORIGIN = 'https://mythichq.vercel.app';
const PAGE_SIZE = 1000;
const MAX_URLS = 50000;
const STATIC_PATHS = [
  '/',
  '/movies',
  '/tv-shows',
  '/discovery',
  '/trending',
  '/top-rated',
  '/new-releases',
  '/upcoming',
  '/genres',
  '/languages',
  '/studios',
  '/studios/phases',
  '/about',
  '/help',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
];
const GENRE_IDS = [
  28, 12, 16, 35, 80, 99, 18, 14,
  27, 9648, 10749, 878, 53, 10752, 36, 10770,
];

const getSupabaseClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing Supabase runtime configuration for sitemap generation.');
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

const fetchRows = async (client, table, columns, filters = []) => {
  const rows = [];
  let offset = 0;

  while (true) {
    let query = client.from(table).select(columns);
    for (const filter of filters) {
      query = query.eq(filter.column, filter.value);
    }
    const { data, error } = await query
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!Array.isArray(data)) {
      throw new Error(`Supabase returned no row collection for ${table}.`);
    }
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
    offset += PAGE_SIZE;
  }
};

const fetchCastMemberIds = async (client, table, parentColumn, parentIds) => {
  const castMemberIds = new Set();
  const uniqueParentIds = [...new Set(parentIds.map(String))];

  for (let index = 0; index < uniqueParentIds.length; index += PAGE_SIZE) {
    const ids = uniqueParentIds.slice(index, index + PAGE_SIZE);
    let offset = 0;
    while (true) {
      const { data, error } = await client.from(table)
        .select('id, cast_member_id')
        .not('cast_member_id', 'is', null)
        .in(parentColumn, ids)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!Array.isArray(data)) {
        throw new Error(`Supabase returned no row collection for ${table}.`);
      }
      data.forEach((row) => {
        if (row.cast_member_id) castMemberIds.add(row.cast_member_id);
      });
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return [...castMemberIds];
};

const fetchByIds = async (client, table, columns, ids) => {
  const rows = [];
  for (let index = 0; index < ids.length; index += PAGE_SIZE) {
    const batch = ids.slice(index, index + PAGE_SIZE);
    let offset = 0;
    while (true) {
      const { data, error } = await client.from(table)
        .select(columns)
        .in('id', batch)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!Array.isArray(data)) {
        throw new Error(`Supabase returned no row collection for ${table}.`);
      }
      rows.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }
  return rows;
};

const getLastModified = (value) => {
  if (!value) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString().slice(0, 10);
};

const escapeXml = (value) => Array.from(String(value))
  .filter((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint === 0x9
      || codePoint === 0xA
      || codePoint === 0xD
      || (codePoint >= 0x20 && codePoint <= 0xD7FF)
      || (codePoint >= 0xE000 && codePoint <= 0xFFFD)
      || (codePoint >= 0x10000 && codePoint <= 0x10FFFF);
  })
  .join('')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export const buildSitemapXml = (entries) => {
  const urlEntries = entries.map(({ url, lastmod }) => [
    '  <url>',
    `    <loc>${escapeXml(url)}</loc>`,
    ...(lastmod ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`] : []),
    '  </url>',
  ].join('\n'));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlEntries,
    '</urlset>',
  ].join('\n');
};

const buildSitemapEntries = async (client) => {
  const [movies, tvShows, studios] = await Promise.all([
    fetchRows(client, 'movies', 'id, title, updated_at', [{ column: 'is_published', value: true }]),
    fetchRows(client, 'tv_shows', 'id, title, updated_at', [{ column: 'is_published', value: true }]),
    fetchRows(client, 'studios', 'id, slug, updated_at', [{ column: 'is_active', value: true }]),
  ]);
  const visibleMovies = movies.filter((movie) => !isRemovedPublicTitle(movie.title));
  const visibleTvShows = tvShows.filter((show) => !isRemovedPublicTitle(show.title));
  const castIds = await fetchCastMemberIds(client, 'movie_cast', 'movie_id', visibleMovies.map(({ id }) => id));
  for (const castId of await fetchCastMemberIds(client, 'tv_show_cast', 'tv_show_id', visibleTvShows.map(({ id }) => id))) {
    castIds.push(castId);
  }
  const uniqueCastIds = [...new Set(castIds)];
  const castMembers = uniqueCastIds.length
    ? await fetchByIds(client, 'cast_members', 'id, updated_at', uniqueCastIds)
    : [];

  const entries = [
    ...STATIC_PATHS.map((path) => ({ url: `${SITE_ORIGIN}${path}` })),
    ...GENRE_IDS.map((id) => ({ url: `${SITE_ORIGIN}/genre/${id}` })),
    ...visibleMovies.map((movie) => ({
      url: `${SITE_ORIGIN}/movie/${encodeURIComponent(movie.id)}`,
      lastmod: getLastModified(movie.updated_at),
    })),
    ...visibleTvShows.map((show) => ({
      url: `${SITE_ORIGIN}/tv-show/${encodeURIComponent(show.id)}`,
      lastmod: getLastModified(show.updated_at),
    })),
    ...castMembers.map((member) => ({
      url: `${SITE_ORIGIN}/cast/${encodeURIComponent(member.id)}`,
      lastmod: getLastModified(member.updated_at),
    })),
    ...studios.map((studio) => ({
      url: `${SITE_ORIGIN}/studios/${encodeURIComponent(studio.slug)}`,
      lastmod: getLastModified(studio.updated_at),
    })),
  ];
  const uniqueEntries = [...new Map(entries.map((entry) => [entry.url, entry])).values()];
  if (uniqueEntries.length > MAX_URLS) {
    throw new Error(`Sitemap has ${uniqueEntries.length} URLs, exceeding the protocol limit of ${MAX_URLS}.`);
  }
  return uniqueEntries;
};

export default async function sitemap(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).send('Method not allowed');
  }

  try {
    const sitemapEntries = await buildSitemapEntries(getSupabaseClient());
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.status(200).send(buildSitemapXml(sitemapEntries));
  } catch (error) {
    console.error('Failed to generate sitemap:', error);
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    return response.status(500).send('Sitemap generation failed.');
  }
}
