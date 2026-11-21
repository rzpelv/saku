export const categories = [
  {
    id: "food",
    name: "Makan & minum",
    icon: "utensils",
    color: "peach",
    budget: 1500000,
  },
  {
    id: "shopping",
    name: "Belanja",
    icon: "bag",
    color: "lavender",
    budget: 1000000,
  },
  {
    id: "transport",
    name: "Transportasi",
    icon: "car",
    color: "blue",
    budget: 600000,
  },
  {
    id: "bills",
    name: "Tagihan",
    icon: "receipt",
    color: "sand",
    budget: 1500000,
  },
  { id: "fun", name: "Hiburan", icon: "coffee", color: "pink", budget: 500000 },
  {
    id: "health",
    name: "Kesehatan",
    icon: "heart",
    color: "mint",
    budget: 400000,
  },
  { id: "other", name: "Lainnya", icon: "dots", color: "gray", budget: 500000 },
  { id: "salary", name: "Gaji", icon: "wallet", color: "mint", income: true },
  {
    id: "freelance",
    name: "Freelance",
    icon: "briefcase",
    color: "blue",
    income: true,
  },
  {
    id: "income",
    name: "Pemasukan lain",
    icon: "arrow",
    color: "mint",
    income: true,
  },
];
export const currency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const monthLabel = (month) =>
  new Date(month + "-01T12:00:00").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
export const defaultBudgets = () =>
  Object.fromEntries(
    categories.filter((c) => !c.income).map((c) => [c.id, c.budget]),
  );
export function emptyState() {
  return {
    version: 1,
    demo: false,
    transactions: [],
    budgets: defaultBudgets(),
  };
}
export function demoState() {
  const month = localDate().slice(0, 7);
  const day = Math.min(new Date().getDate(), 28);
  const items = [
    ["Gaji bulanan", 8500000, "salary", 1],
    ["Proyek desain", 1250000, "freelance", 5],
    ["Belanja bulanan", 485000, "shopping", 3],
    ["Listrik & internet", 650000, "bills", 4],
    ["Makan siang", 45000, "food", 6],
    ["Bensin", 150000, "transport", 7],
    ["Kopi sore", 38000, "food", 9],
    ["Bahan masakan", 265000, "food", 11],
    ["Langganan musik", 55000, "fun", 12],
    ["Makan bareng teman", 185000, "food", 15],
    ["Ojek online", 32000, "transport", 17],
    ["Buku baru", 129000, "shopping", 18],
    ["Kopi & roti", 52000, "food", 20],
    ["Vitamin", 125000, "health", 21],
  ];
  return {
    version: 1,
    demo: true,
    budgets: defaultBudgets(),
    transactions: items.map(([name, amount, category, d], i) => ({
      id: `demo-${i}`,
      name,
      amount,
      category,
      type: categories.find((c) => c.id === category).income
        ? "income"
        : "expense",
      date: `${month}-${String(Math.min(day, d)).padStart(2, "0")}`,
      note: "",
    })),
  };
}
export function validAmount(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= 1000000000000;
}
export function validDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > "2199-12-31"
  )
    return false;
  const date = new Date(value + "T12:00:00Z");
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function validTransaction(t) {
  return (
    t &&
    typeof t.id === "string" &&
    t.id.length > 0 &&
    t.id.length <= 100 &&
    typeof t.name === "string" &&
    t.name.trim().length > 0 &&
    t.name.length <= 100 &&
    validAmount(t.amount) &&
    validDate(t.date) &&
    ["income", "expense"].includes(t.type) &&
    categories.some(
      (c) => c.id === t.category && Boolean(c.income) === (t.type === "income"),
    ) &&
    typeof t.note === "string" &&
    t.note.length <= 300
  );
}
export function parseBackup(raw) {
  const data = JSON.parse(raw);
  if (
    !data ||
    data.version !== 1 ||
    typeof data.demo !== "boolean" ||
    !Array.isArray(data.transactions) ||
    data.transactions.length > 20000 ||
    !data.transactions.every(validTransaction) ||
    new Set(data.transactions.map((t) => t.id)).size !==
      data.transactions.length ||
    !data.budgets ||
    !categories
      .filter((c) => !c.income)
      .every((c) => validAmount(data.budgets[c.id]))
  )
    throw new Error(
      "Format cadangan tidak valid. Pilih file JSON hasil ekspor Saku.",
    );
  return {
    version: 1,
    demo: data.demo,
    transactions: data.transactions.map(
      ({ id, name, amount, category, type, date, note }) => ({
        id,
        name,
        amount,
        category,
        type,
        date,
        note,
      }),
    ),
    budgets: Object.fromEntries(
      categories
        .filter((c) => !c.income)
        .map((c) => [c.id, data.budgets[c.id]]),
    ),
  };
}
export function summarize(transactions, month) {
  const items = transactions.filter((t) => t.date.startsWith(month));
  const income = items
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = items
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const byCategory = Object.fromEntries(
    categories
      .filter((c) => !c.income)
      .map((c) => [
        c.id,
        items
          .filter((t) => t.type === "expense" && t.category === c.id)
          .reduce((sum, t) => sum + t.amount, 0),
      ]),
  );
  return { items, income, expense, balance: income - expense, byCategory };
}
export function csvExport(items) {
  const cell = (value) =>
    '"' +
    String(value)
      .replace(/^(?:\s*[=+@\-]|[\t\r\n])/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [
      ["Tanggal", "Transaksi", "Jenis", "Kategori", "Rupiah", "Catatan"],
      ...items.map((t) => [
        t.date,
        t.name,
        t.type === "income" ? "Pemasukan" : "Pengeluaran",
        categories.find((c) => c.id === t.category).name,
        t.amount,
        t.note,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
