const cacheEntries = new Map();
const pendingRequests = new Map();
const cacheListeners = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 80;
const PERSISTED_CACHE_KEY = 'mythichq:public-request-cache:v1';
const CACHE_INVALIDATION_KEY = 'mythichq:catalog-invalidated:v1';
const MAX_PERSISTED_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const cacheVersions = new Map();

let persistedCacheLoaded = false;
let handlingRemoteInvalidation = false;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== CACHE_INVALIDATION_KEY || !event.newValue) return;
    try {
      const { keyOrPrefix } = JSON.parse(event.newValue);
      if (typeof keyOrPrefix !== 'string') return;
      handlingRemoteInvalidation = true;
      invalidateCache(keyOrPrefix);
    } catch (error) {
      console.warn('Unable to process a remote catalog update:', error);
    } finally {
      handlingRemoteInvalidation = false;
    }
  });
}

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
          const version = cacheVersions.get(key) || 0;
          const refresh = Promise.resolve()
            .then(loader)
            .then((value) => {
              if ((cacheVersions.get(key) || 0) === version) storeCacheEntry(key, value, maxEntries);
              return value;
          })
          .catch((error) => {
            console.error(`Background refresh failed for ${key}:`, error);
            return cached.value;
          })
          .finally(() => {
            if (pendingRequests.get(key) === refresh) pendingRequests.delete(key);
          });
        pendingRequests.set(key, refresh);
      }

      return cached.value;
    }
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const version = cacheVersions.get(key) || 0;
  const request = Promise.resolve()
    .then(loader)
    .then((value) => {
      if ((cacheVersions.get(key) || 0) === version) storeCacheEntry(key, value, maxEntries);
      return value;
    })
    .finally(() => {
      if (pendingRequests.get(key) === request) pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);
  return request;
};

export const invalidateCache = (keyOrPrefix) => {
  restorePersistentCache();
  const matchingKeys = new Set([...cacheEntries.keys(), ...cacheListeners.keys(), ...pendingRequests.keys()]);
  let changed = false;
  for (const key of matchingKeys) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cacheVersions.set(key, (cacheVersions.get(key) || 0) + 1);
      cacheEntries.delete(key);
      pendingRequests.delete(key);
      notifyCacheListeners(key, undefined);
      changed = true;
    }
  }
  if (changed || keyOrPrefix.startsWith('catalog:')) savePersistentCache();
  if (!handlingRemoteInvalidation && typeof window !== 'undefined' && keyOrPrefix.startsWith('catalog:')) {
    try {
      window.localStorage.setItem(CACHE_INVALIDATION_KEY, JSON.stringify({ keyOrPrefix, updatedAt: Date.now() }));
    } catch (error) {
      console.warn('Unable to broadcast a catalog update to other tabs:', error);
    }
  }
};

export const clearRequestCache = () => {
  cacheEntries.clear();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(PERSISTED_CACHE_KEY);
  }
};
