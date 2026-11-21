import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  demoState,
  summarize,
  parseBackup,
  validAmount,
  validDate,
  csvExport,
} from "./finance.js";

const transaction = {
  id: "one",
  name: "Lunch",
  type: "expense",
  category: "food",
  amount: 25000,
  date: "2026-11-21",
  note: "",
};
test("monthly totals isolate other months and separate income from expenses", () => {
  const result = summarize(
    [
      transaction,
      {
        ...transaction,
        id: "two",
        type: "income",
        category: "salary",
        amount: 1000000,
      },
      { ...transaction, id: "three", amount: 90000, date: "2026-10-21" },
    ],
    "2026-11",
  );
  assert.equal(result.income, 1000000);
  assert.equal(result.expense, 25000);
  assert.equal(result.balance, 975000);
  assert.equal(result.byCategory.food, 25000);
  assert.equal(result.items.length, 2);
});
test("overspending remains a negative balance, empty months remain zero", () => {
  assert.equal(summarize([transaction], "2026-11").balance, -25000);
  assert.equal(summarize([transaction], "2026-12").balance, 0);
});
test("money accepts only bounded positive whole rupiah", () => {
  for (const n of [0, -1, 0.5, NaN, Infinity, 1000000000001, "1000"])
    assert.equal(validAmount(n), false);
  assert.equal(validAmount(1000000000000), true);
});
test("calendar validation rejects impossible and unsupported dates", () => {
  for (const date of [
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "bad",
    "1899-01-01",
    "2200-01-01",
  ])
    assert.equal(validDate(date), false);
  assert.equal(validDate("2024-02-29"), true);
});
test("backups round trip without losing transactions or demo state", () => {
  const state = { ...emptyState(), transactions: [transaction] };
  assert.deepEqual(parseBackup(JSON.stringify(state)), state);
  assert.deepEqual(parseBackup(JSON.stringify(demoState())), demoState());
});
test("invalid backups cannot introduce bad amounts, duplicate ids, category mismatches or budgets", () => {
  const base = { ...emptyState(), transactions: [transaction] };
  const invalid = [
    null,
    {},
    { ...base, transactions: [{ ...transaction, amount: -1 }] },
    { ...base, transactions: [transaction, transaction] },
    { ...base, transactions: [{ ...transaction, category: "salary" }] },
    { ...base, budgets: {} },
  ];
  for (const value of invalid)
    assert.throws(() => parseBackup(JSON.stringify(value)));
});
test("CSV escapes formulas, commas, quotes and preserves whole rupiah", () => {
  const csv = csvExport([
    { ...transaction, name: "=SUM(1,2)", note: 'He said "hello"' },
  ]);
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes('He said ""hello""'));
  assert.ok(csv.includes('"25000"'));
});
