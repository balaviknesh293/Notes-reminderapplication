// Offline Storage & Sync Engine using localStorage / client cache

const KEYS = {
  NOTES: 'notealert_cache_notes',
  TASKS: 'notealert_cache_tasks',
  CATEGORIES: 'notealert_cache_categories',
  SYNC_QUEUE: 'notealert_sync_queue'
};

export function getCachedNotes() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.NOTES) || '[]');
  } catch (e) {
    return [];
  }
}

export function setCachedNotes(notes) {
  try {
    localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
  } catch (e) {}
}

export function getCachedTasks() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
  } catch (e) {
    return [];
  }
}

export function setCachedTasks(tasks) {
  try {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {}
}

export function getCachedCategories() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || '[]');
  } catch (e) {
    return [];
  }
}

export function setCachedCategories(categories) {
  try {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {}
}

export function getSyncQueue() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.SYNC_QUEUE) || '[]');
  } catch (e) {
    return [];
  }
}

export function queueOfflineAction(action) {
  // action: { id: Date.now(), type: 'create'|'update'|'delete', entity: 'note'|'task', data }
  try {
    const queue = getSyncQueue();
    queue.push({ ...action, timestamp: new Date().toISOString() });
    localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (e) {}
}

export function clearSyncQueue() {
  try {
    localStorage.removeItem(KEYS.SYNC_QUEUE);
  } catch (e) {}
}

// Synchronize queued offline mutations with backend
export async function syncOfflineQueue(api) {
  const queue = getSyncQueue();
  if (queue.length === 0) return { success: true, count: 0 };

  try {
    const response = await api.post('/api/sync/batch', { offlineActions: queue });
    if (response.data && response.data.success) {
      clearSyncQueue();
      if (response.data.data) {
        if (response.data.data.notes) setCachedNotes(response.data.data.notes);
        if (response.data.data.tasks) setCachedTasks(response.data.data.tasks);
        if (response.data.data.categories) setCachedCategories(response.data.data.categories);
      }
      return { success: true, count: queue.length, summary: response.data.syncSummary };
    }
  } catch (err) {
    console.warn('[Sync] Offline sync delayed:', err.message);
  }
  return { success: false, count: queue.length };
}
