const cacheEntries = new Map();
const pendingRequests = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 80;

const trimCache = (maxEntries) => {
  while (cacheEntries.size > maxEntries) {
    const oldestKey = [...cacheEntries.entries()]
      .sort(([, first], [, second]) => first.lastAccess - second.lastAccess)[0]?.[0];

    if (!oldestKey) return;
    cacheEntries.delete(oldestKey);
  }
};

export const cachedRequest = async (
  key,
  loader,
  { ttl = DEFAULT_TTL_MS, maxEntries = DEFAULT_MAX_ENTRIES, staleWhileRevalidate = true } = {},
) => {
  const now = Date.now();
  const cached = cacheEntries.get(key);

  if (cached) {
    cached.lastAccess = now;

    if (now - cached.updatedAt < ttl) {
      return cached.value;
    }

    if (staleWhileRevalidate) {
      if (!pendingRequests.has(key)) {
        const refresh = Promise.resolve()
          .then(loader)
          .then((value) => {
            cacheEntries.set(key, { value, updatedAt: Date.now(), lastAccess: Date.now() });
            trimCache(maxEntries);
            return value;
          })
          .catch((error) => {
            console.error(`Background refresh failed for ${key}:`, error);
            return cached.value;
          })
          .finally(() => pendingRequests.delete(key));
        pendingRequests.set(key, refresh);
      }

      return cached.value;
    }
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const request = Promise.resolve()
    .then(loader)
    .then((value) => {
      cacheEntries.set(key, { value, updatedAt: Date.now(), lastAccess: Date.now() });
      trimCache(maxEntries);
      return value;
    })
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, request);
  return request;
};

export const invalidateCache = (keyOrPrefix) => {
  for (const key of cacheEntries.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cacheEntries.delete(key);
    }
  }
};

export const clearRequestCache = () => {
  cacheEntries.clear();
};
