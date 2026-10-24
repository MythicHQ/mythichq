const YOUTUBE_HOSTS = new Set([
  'youtu.be',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const GITHUB_PAGE_HOSTS = new Set(['github.com', 'www.github.com']);

const getYouTubeId = (url) => {
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return '';

  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = host === 'youtu.be'
    ? pathParts[0]
    : url.pathname === '/watch'
      ? url.searchParams.get('v')
      : ['embed', 'shorts', 'live'].includes(pathParts[0])
        ? pathParts[1]
        : '';

  return /^[\w-]{6,}$/.test(id || '') ? id : '';
};

export const getCardPreviewSource = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  if (GITHUB_PAGE_HOSTS.has(url.hostname.toLowerCase())) return null;

  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    const params = new URLSearchParams({
      autoplay: '1',
      controls: '0',
      disablekb: '1',
      loop: '1',
      modestbranding: '1',
      mute: '1',
      playsinline: '1',
      playlist: youtubeId,
      rel: '0',
    });
    return {
      type: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`,
    };
  }

  if (/\.(?:mp4|webm)$/i.test(url.pathname)) {
    return { type: 'video', src: url.href };
  }

  return null;
};
