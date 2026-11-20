// This database belongs to the extension origin. The X content script never receives the key.
export async function configuration(action, value) {
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open('xclick-ai', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('settings');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const writable = action === 'write' || action === 'delete';
      const tx = db.transaction('settings', writable ? 'readwrite' : 'readonly');
      const store = tx.objectStore('settings');
      const active = store.get('active');
      let profiles;
      if (action === 'profiles') profiles = store.getAll();
      if (action === 'delete') store.clear();
      if (action === 'write') {
        active.onsuccess = () => {
          // Archive the outgoing profile, including one saved by older versions.
          const previous = active.result;
          if (previous && previous.provider !== value.provider) {
            store.put(previous, `provider:${previous.provider}`);
          }
          store.delete(`provider:${value.provider}`);
          store.put(value, 'active');
        };
      }
      tx.oncomplete = () => {
        if (profiles) resolve({ active: active.result, profiles: profiles.result });
        else resolve(action === 'read' ? active.result : undefined);
      };
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
