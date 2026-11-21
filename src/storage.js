export class LedgerConflictError extends Error {
  constructor(raw) {
    super("Ledger changed in another tab");
    this.raw = raw;
  }
}

// Call inside the origin-wide Web Lock so comparison and writing are serialized.
export function writeLedger(storage, key, expected, next) {
  const raw = storage.getItem(key);
  if (raw !== expected) throw new LedgerConflictError(raw);
  const serialized = JSON.stringify(next);
  storage.setItem(key, serialized);
  return serialized;
}
