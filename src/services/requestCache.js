const cacheEntries = new Map();
const pendingRequests = new Map();
const cacheListeners = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 80;
const PERSISTED_CACHE_KEY = 'mythichq:public-request-cache:v1';
const MAX_PERSISTED_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let persistedCacheLoaded = false;

const shouldPersist = (key) => key.startsWith('catalog:');

const notifyCacheListeners = (key, value) => {
  cacheListeners.get(key)?.forEach((listener) => listener(value));
};

const savePersistentCache = () => {
  if (typeof window === 'undefined') return;

  try {
    const entries = [...cacheEntries.entries()]
      .filter(([key]) => shouldPersist(key))
      .map(([key, entry]) => [key, { value: entry.value, updatedAt: entry.updatedAt }]);
    window.localStorage.setItem(PERSISTED_CACHE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Unable to persist the public catalog cache:', error);
  }
};

const restorePersistentCache = () => {
  if (persistedCacheLoaded || typeof window === 'undefined') return;
  persistedCacheLoaded = true;

  try {
    const storedValue = window.localStorage.getItem(PERSISTED_CACHE_KEY);
    if (!storedValue) return;

    const entries = JSON.parse(storedValue);
    if (!Array.isArray(entries)) return;

    const now = Date.now();
    entries.forEach(([key, entry]) => {
      if (
        typeof key === 'string'
        && shouldPersist(key)
        && entry
        && typeof entry.updatedAt === 'number'
        && now - entry.updatedAt <= MAX_PERSISTED_AGE_MS
      ) {
        cacheEntries.set(key, { ...entry, lastAccess: now });
      }
    });
  } catch (error) {
    console.warn('Unable to restore the public catalog cache:', error);
  }
};

const storeCacheEntry = (key, value, maxEntries) => {
  const now = Date.now();
  cacheEntries.set(key, { value, updatedAt: now, lastAccess: now });
  trimCache(maxEntries);
  if (shouldPersist(key)) savePersistentCache();
  notifyCacheListeners(key, value);
};

export const getCachedRequest = (key) => {
  restorePersistentCache();
  const cached = cacheEntries.get(key);
  if (!cached) return undefined;

  cached.lastAccess = Date.now();
  return cached.value;
};

export const subscribeToCachedRequest = (key, listener) => {
  restorePersistentCache();
  const listeners = cacheListeners.get(key) || new Set();
  listeners.add(listener);
  cacheListeners.set(key, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) cacheListeners.delete(key);
  };
};

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
  restorePersistentCache();
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
            storeCacheEntry(key, value, maxEntries);
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
      storeCacheEntry(key, value, maxEntries);
      return value;
    })
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, request);
  return request;
};

export const invalidateCache = (keyOrPrefix) => {
  restorePersistentCache();
  let changed = false;
  for (const key of cacheEntries.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cacheEntries.delete(key);
      changed = true;
    }
  }
  if (changed) savePersistentCache();
};

export const clearRequestCache = () => {
  cacheEntries.clear();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(PERSISTED_CACHE_KEY);
  }
};
