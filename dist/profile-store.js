export function createProfileStore(storage, key, locks) {
  let expected = storage.getItem(key);
  const initial = expected;
  let pending = Promise.resolve(true);

  function save(profile) {
    const snapshot = JSON.stringify(profile);
    const write = () => {
      if (storage.getItem(key) !== expected) return false;
      storage.setItem(key, snapshot);
      expected = snapshot;
      return true;
    };
    if (!locks?.request) {
      try { pending = Promise.resolve(write()); }
      catch { pending = Promise.resolve(false); }
      return pending;
    }
    pending = pending.then(() => locks.request(key, write)).catch(() => false);
    return pending;
  }

  return { initial, save, flush: () => pending };
}
