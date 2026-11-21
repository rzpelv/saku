import test from "node:test";
import assert from "node:assert/strict";
import { LedgerConflictError, writeLedger } from "./storage.js";

test("a stale tab cannot overwrite a transaction saved by another tab", () => {
  let raw = null;
  const storage = {
    getItem: () => raw,
    setItem: (_, next) => { raw = next; },
  };
  const first = { transactions: [{ id: "first" }] };
  const snapshot = writeLedger(storage, "ledger", null, first);
  assert.throws(
    () => writeLedger(storage, "ledger", null, { transactions: [{ id: "second" }] }),
    (error) => error instanceof LedgerConflictError && error.raw === snapshot,
  );
  assert.deepEqual(JSON.parse(raw), first);
  const merged = { transactions: [...first.transactions, { id: "second" }] };
  writeLedger(storage, "ledger", snapshot, merged);
  assert.deepEqual(JSON.parse(raw), merged);
});

test("removing a ledger in another tab is also detected as a conflict", () => {
  let wrote = false;
  assert.throws(() => writeLedger({
    getItem: () => null,
    setItem: () => { wrote = true; },
  }, "ledger", "previous snapshot", {}), LedgerConflictError);
  assert.equal(wrote, false);
});
