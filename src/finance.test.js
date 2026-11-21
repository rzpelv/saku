import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  demoState,
  summarize,
  parseBackup,
  validAmount,
  parseRupiah,
  latestTransactions,
  startPersonal,
  budgetsForMonth,
  dateForMonth,
  validDate,
  validMonth,
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
test("month selection shares the backup date bounds", () => {
  for (const month of ["1900-01", "2026-11", "2199-12"])
    assert.equal(validMonth(month), true, month);
  for (const month of ["1899-12", "2200-11", "2026-00", "2026-13", "2026-1", "", null])
    assert.equal(validMonth(month), false, String(month));
});
test("ledgers remain readable after growing beyond 20,000 transactions", () => {
  const state = emptyState();
  state.transactions = Array.from({ length: 20001 }, (_, i) => ({
    ...transaction,
    id: `record-${i}`,
  }));
  const restored = parseBackup(JSON.stringify(state));
  assert.equal(restored.transactions.length, 20001);
  assert.deepEqual(restored.transactions.at(-1), state.transactions.at(-1));
});
test("Indonesian thousands separators never become decimal rupiah", () => {
  for (const [input, expected] of [
    ["5.000", 5000],
    ["12.500.000", 12500000],
    ["5000", 5000],
    [" Rp 5.000 ", 5000],
    ["1.500.000,00", 1500000],
    ["1.000.000.000.000", 1000000000000],
  ])
    assert.equal(parseRupiah(input), expected);
  for (const input of [
    "12.5",
    "12.50",
    "1,5",
    "5,000",
    "-5.000",
    "1e6",
    "",
    "0",
    "1.000.000.000.001",
    "5.000.00",
    "5 000",
  ])
    assert.ok(Number.isNaN(parseRupiah(input)), input);
});
test("same-day transactions show newest insertion first regardless of random id", () => {
  const older = { ...transaction, id: "zzz" },
    newer = { ...transaction, id: "aaa" };
  const previous = { ...transaction, id: "previous", date: "2026-10-01" };
  assert.deepEqual(
    latestTransactions([older, newer, previous]).map((t) => t.id),
    ["aaa", "zzz", "previous"],
  );
});
test("starting personal removes only built-in demo entries and keeps real entries and budgets", () => {
  const mixed = {
    ...demoState(),
    transactions: [...demoState().transactions, transaction],
  };
  const personal = startPersonal(mixed);
  assert.equal(personal.demo, false);
  assert.deepEqual(personal.transactions, [transaction]);
  assert.deepEqual(personal.budgets, mixed.budgets);
  assert.equal(mixed.demo, true);
});
test("month-specific budgets never rewrite other months and survive backups", () => {
  const state = {
    ...emptyState(),
    monthlyBudgets: {
      "2026-11": { bills: 900000 },
      "2026-12": { bills: 1200000 },
    },
  };
  assert.equal(budgetsForMonth(state, "2026-11").bills, 900000);
  assert.equal(budgetsForMonth(state, "2026-12").bills, 1200000);
  assert.equal(budgetsForMonth(state, "2026-10").bills, state.budgets.bills);
  assert.deepEqual(parseBackup(JSON.stringify(state)), state);
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        ...state,
        monthlyBudgets: { "2026-13": { bills: 10 } },
      }),
    ),
  );
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        ...state,
        monthlyBudgets: { "2026-11": { bills: -1 } },
      }),
    ),
  );
});
test("legacy budgets gain Pendidikan without losing existing amounts", () => {
  const legacy = emptyState();
  delete legacy.budgets.education;
  assert.equal(parseBackup(JSON.stringify(legacy)).budgets.education, 500000);
  assert.equal(dateForMonth("2026-10"), "2026-10-01");
});
test("new backups preserve entry defaults and creation timestamps; old backups still work", () => {
  const state = {
    ...emptyState(),
    entryDefaults: { type: "income", category: "income" },
    transactions: [{ ...transaction, createdAt: "2026-11-21T11:38:00.000Z" }],
  };
  assert.deepEqual(parseBackup(JSON.stringify(state)), state);
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        ...state,
        entryDefaults: { type: "income", category: "food" },
      }),
    ),
  );
});
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
