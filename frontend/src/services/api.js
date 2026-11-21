import {
  getCachedNotes,
  setCachedNotes,
  getCachedTasks,
  setCachedTasks,
  queueOfflineAction,
  syncOfflineQueue
} from './offlineStorage';

const BASE_URL = '';

function getToken() {
  return localStorage.getItem('notealert_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  // If body is FormData (e.g. file upload or excel import), remove Content-Type header so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    
    // Check for unauthorized
    if (res.status === 401 && !endpoint.includes('/api/auth/login')) {
      localStorage.removeItem('notealert_token');
      localStorage.removeItem('notealert_user');
      window.location.hash = '#/login';
    }

    // Check if binary download (e.g. Excel export or backup download)
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('spreadsheetml') || contentType.includes('octet-stream')) {
      const blob = await res.blob();
      return { ok: res.ok, data: blob, headers: res.headers };
    }

    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.warn(`[API] Network error on ${endpoint}:`, err.message);

    // If offline fallback is applicable for GET requests
    if (!navigator.onLine || err.name === 'TypeError') {
      if (endpoint.startsWith('/api/notes')) {
        return { ok: true, data: { success: true, count: getCachedNotes().length, data: getCachedNotes(), offline: true } };
      }
      if (endpoint.startsWith('/api/tasks')) {
        return { ok: true, data: { success: true, count: getCachedTasks().length, data: getCachedTasks(), offline: true } };
      }
    }
    throw err;
  }
}

export const api = {
  get: (url, options) => request(url, { method: 'GET', ...options }),
  post: (url, body, options) => request(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), ...options }),
  put: (url, body, options) => request(url, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: (url, body, options) => request(url, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (url, options) => request(url, { method: 'DELETE', ...options })
};

// Auto-sync listener when browser reconnects to internet
window.addEventListener('online', async () => {
  console.log('[App] Network restored. Triggering offline sync...');
  const res = await syncOfflineQueue(api);
  if (res.count > 0) {
    window.dispatchEvent(new CustomEvent('notealert:data-synced', { detail: res }));
  }
});
