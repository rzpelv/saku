import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  ChartNoAxesCombined,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  ArrowRight,
  Download,
  Upload,
  ShieldCheck,
  Leaf,
  Utensils,
  ShoppingBag,
  Car,
  ReceiptText,
  Coffee,
  Heart,
  Ellipsis,
  BriefcaseBusiness,
  Pencil,
  Trash2,
  Check,
  CircleHelp,
  Sprout,
} from "lucide-react";
import {
  categories,
  currency,
  localDate,
  monthLabel,
  demoState,
  emptyState,
  summarize,
  validAmount,
  parseRupiah,
  validDate,
  parseBackup,
  csvExport,
} from "./finance.js";
import "./style.css";

const KEY = "saku.finance.v1";
const icons = {
  utensils: Utensils,
  bag: ShoppingBag,
  car: Car,
  receipt: ReceiptText,
  coffee: Coffee,
  heart: Heart,
  dots: Ellipsis,
  wallet: Wallet,
  briefcase: BriefcaseBusiness,
  arrow: ArrowDownLeft,
};
const navigation = [
  { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
  { id: "transactions", label: "Transaksi", icon: ArrowLeftRight },
  { id: "budgets", label: "Anggaran", icon: PieChart },
  { id: "reports", label: "Laporan", icon: ChartNoAxesCombined },
];
function initial() {
  try {
    const value = localStorage.getItem(KEY);
    return { data: value ? parseBackup(value) : demoState(), error: "" };
  } catch {
    return {
      data: emptyState(),
      error:
        "Data tersimpan tidak dapat dibaca. Data lama belum diubah; impor cadangan atau ekspor data sebelum melanjutkan.",
    };
  }
}
function CategoryIcon({ category, small = false }) {
  const Icon = icons[category.icon];
  return (
    <span className={`category-icon ${category.color} ${small ? "small" : ""}`}>
      <Icon size={small ? 16 : 19} />
    </span>
  );
}
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "wide" : ""}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Tutup">
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function App() {
  const [loaded] = useState(initial);
  const [data, setData] = useState(loaded.data);
  const [storageError, setStorageError] = useState(loaded.error);
  const [page, setPage] = useState("overview");
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [showAll, setShowAll] = useState(false);
  const importRef = useRef(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function save(next, message) {
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Penyimpanan browser penuh atau tidak tersedia. Ekspor cadangan sebelum menutup halaman.",
      );
    }
    if (message) setToast(message);
  }
  const summary = summarize(data.transactions, month);
  const totalBudget = Object.values(data.budgets).reduce((a, b) => a + b, 0);
  const usage = Math.round((summary.expense / totalBudget) * 100);
  const sorted = [...summary.items].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
  const filtered = sorted.filter(
    (t) =>
      (filter === "all" || t.type === filter) &&
      `${t.name} ${t.note} ${categories.find((c) => c.id === t.category).name}`
        .toLocaleLowerCase("id-ID")
        .includes(search.toLocaleLowerCase("id-ID")),
  );
  const breakdown = categories
    .filter((c) => !c.income && summary.byCategory[c.id] > 0)
    .sort((a, b) => summary.byCategory[b.id] - summary.byCategory[a.id]);
  function navigate(id) {
    setPage(id);
    setSearch("");
    setFilter("all");
    setShowAll(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function moveMonth(offset) {
    const d = new Date(month + "-01T12:00:00");
    d.setMonth(d.getMonth() + offset);
    const next = localDate(d).slice(0, 7);
    if (next < "1900-01" || next > "2199-12") return;
    setMonth(next);
    setShowAll(false);
  }
  function download(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 10000000)
        throw new Error("File terlalu besar. Maksimal 10 MB.");
      const next = parseBackup(await file.text());
      setModal({ kind: "import", data: next });
    } catch (err) {
      setToast(
        err instanceof SyntaxError
          ? "File bukan JSON yang valid."
          : err.message,
      );
    }
  }
  function transactionTable(limit) {
    const visible = limit && !showAll ? filtered.slice(0, limit) : filtered;
    return (
      <>
        <div className="transaction-filters">
          <div className="segmented" aria-label="Filter jenis transaksi">
            {[
              ["all", "Semua"],
              ["expense", "Pengeluaran"],
              ["income", "Pemasukan"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={filter === id ? "selected" : ""}
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Cari transaksi"
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Transaksi</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th className="amount">Jumlah</th>
                <th>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const category = categories.find((c) => c.id === t.category);
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="transaction-name">
                        <CategoryIcon category={category} />
                        <div>
                          <strong>{t.name}</strong>
                          <span>
                            {t.note ||
                              `${new Date(t.date + "T12:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · ${category.name}`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-label">{category.name}</span>
                    </td>
                    <td className="muted date-cell">
                      {new Date(t.date + "T12:00:00").toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short" },
                      )}
                    </td>
                    <td
                      className={`amount ${t.type === "income" ? "positive" : ""}`}
                    >
                      {t.type === "income" ? "+" : "−"}
                      {currency(t.amount)}
                    </td>
                    <td>
                      <button
                        className="icon-button edit"
                        aria-label={`Edit ${t.name}`}
                        onClick={() =>
                          setModal({ kind: "transaction", transaction: t })
                        }
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="empty">
            <Wallet size={30} />
            <h3>
              {search || filter !== "all"
                ? "Tidak ada transaksi yang cocok"
                : "Lembar baru, langkah pertama"}
            </h3>
            <p>
              {search || filter !== "all"
                ? "Coba kata kunci atau filter lain."
                : "Catat pemasukan atau pengeluaran pertamamu bulan ini."}
            </p>
            {!search && filter === "all" && (
              <button
                className="text-button"
                onClick={() => setModal({ kind: "transaction" })}
              >
                Tambah transaksi <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
        {limit && filtered.length > limit && !showAll && (
          <button className="table-more" onClick={() => setShowAll(true)}>
            Tampilkan {filtered.length - limit} transaksi lainnya{" "}
            <ChevronDown size={16} />
          </button>
        )}
        <div className="table-footer">
          <span>
            {visible.length} dari {filtered.length} transaksi
          </span>
          <span>{monthLabel(month)}</span>
        </div>
      </>
    );
  }
  function budgetRows(all = false) {
    return categories
      .filter((c) => !c.income)
      .slice(0, all ? undefined : 3)
      .map((c) => {
        const spent = summary.byCategory[c.id];
        const budget = data.budgets[c.id];
        const percent = Math.round((spent / budget) * 100);
        return (
          <div className="budget-row" key={c.id}>
            <div className="budget-title">
              <span>
                <CategoryIcon category={c} small />
                {c.name}
              </span>
              <span className={percent > 100 ? "negative" : "muted"}>
                {percent}%
              </span>
            </div>
            <div className={`progress ${percent > 100 ? "over" : ""}`}>
              <span style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            <div className="budget-numbers">
              <span>
                {currency(spent)}{" "}
                <span className="muted">/ {currency(budget)}</span>
              </span>
              {all && (
                <button
                  className="text-button"
                  onClick={() => setModal({ kind: "budget", category: c })}
                >
                  <Pencil size={13} /> Ubah
                </button>
              )}
            </div>
          </div>
        );
      });
  }
  const titles = {
    overview: [
      "Uang tertata, hidup lebih tenang.",
      "Sedikit perhatian hari ini, lebih banyak kemungkinan nanti.",
    ],
    transactions: [
      "Setiap rupiah, ada ceritanya.",
      "Catat yang masuk. Kenali yang keluar.",
    ],
    budgets: [
      "Beri uangmu arah.",
      "Rencana sederhana untuk hal-hal yang penting.",
    ],
    reports: [
      "Kenali kebiasaan keuanganmu.",
      "Lihat gambaran besarnya, ambil langkah kecil berikutnya.",
    ],
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
          aria-label="Saku beranda"
        >
          <span className="brand-mark">
            <Wallet size={24} />
          </span>
          <span>
            saku<span className="brand-dot">.</span>
          </span>
        </a>
        <p className="sidebar-caption">RUANG KEUANGAN PRIBADI</p>
        <nav aria-label="Navigasi utama">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={page === id ? "nav-item active" : "nav-item"}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={20} />
              {label}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Sprout size={27} />
            <h3>Pelan-pelan, jadi kebiasaan.</h3>
            <p>Keuangan yang sehat dimulai dari satu catatan kecil.</p>
            <span>Catat. Kenali. Kendalikan.</span>
          </div>
          <button
            className="utility"
            onClick={() =>
              download(
                JSON.stringify(data, null, 2),
                `saku-cadangan-${localDate()}.json`,
                "application/json",
              )
            }
          >
            <Download size={17} /> Ekspor cadangan
          </button>
          <button className="utility" onClick={() => importRef.current.click()}>
            <Upload size={17} /> Impor cadangan
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={importFile}
          />
          <div className="local-note">
            <ShieldCheck size={16} />
            <span>Tersimpan di browser ini</span>
            <button
              className="icon-button"
              aria-label="Tentang penyimpanan"
              onClick={() => setModal({ kind: "about" })}
            >
              <CircleHelp size={14} />
            </button>
          </div>
          <div className="profile">
            <span className="avatar">{data.demo ? "S" : "K"}</span>
            <div>
              <strong>{data.demo ? "Ruang contoh" : "Keuangan saya"}</strong>
              <span>
                {data.demo
                  ? "Kenalan dulu dengan Saku"
                  : "Satu langkah lebih teratur"}
              </span>
            </div>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Ruang pribadi <span>/</span>{" "}
            <strong>{navigation.find((n) => n.id === page).label}</strong>
          </div>
          <span className="today">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="mobile-brand">saku.</span>
        </header>
        <div className="main-content">
          {data.demo && (
            <div className="demo-banner">
              <span>
                <span className="demo-indicator" /> Kamu sedang melihat data
                contoh. Yuk, mulai ceritamu sendiri.
              </span>
              <button onClick={() => setModal({ kind: "start" })}>
                Mulai catatan saya <ArrowRight size={15} />
              </button>
            </div>
          )}
          {storageError && (
            <div className="warning" role="alert">
              {storageError}
            </div>
          )}
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "overview"
                  ? "SELAMAT DATANG DI SAKU"
                  : navigation.find((n) => n.id === page).label.toUpperCase()}
              </div>
              <h1>{titles[page][0]}</h1>
              <p>{titles[page][1]}</p>
            </div>
            <button
              className="primary"
              onClick={() => setModal({ kind: "transaction" })}
            >
              <Plus size={18} /> Tambah transaksi
            </button>
          </section>
          <div className="period-row">
            <div className="month-switch">
              <button
                className="icon-button"
                onClick={() => moveMonth(-1)}
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft size={17} />
              </button>
              <label>
                <span>{monthLabel(month)}</span>
                <input
                  type="month"
                  value={month}
                  min="1900-01"
                  max="2199-12"
                  aria-label="Pilih bulan"
                  onChange={(e) => {
                    if (/^\d{4}-\d{2}$/.test(e.target.value))
                      setMonth(e.target.value);
                  }}
                />
              </label>
              <button
                className="icon-button"
                onClick={() => moveMonth(1)}
                aria-label="Bulan berikutnya"
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <span className="period-hint">
              {page === "budgets"
                ? "Anggaran berulang setiap bulan"
                : "Satu bulan, satu langkah lebih baik"}
            </span>
          </div>
          {(page === "overview" || page === "reports") && (
            <section className="summary-grid" aria-label="Ringkasan keuangan">
              <article className="balance-card">
                <div className="summary-label">
                  <span>Sisa uang bulan ini</span>
                  <Wallet size={20} />
                </div>
                <h2>{currency(summary.balance)}</h2>
                <div className="balance-divider" />
                <p>
                  <span className="tiny-dot" />
                  {summary.income
                    ? `${Math.round((summary.balance / summary.income) * 100)}% dari pemasukan tersisa`
                    : "Pemasukan dikurangi pengeluaran"}
                </p>
                <div className="balance-decoration" aria-hidden="true">
                  <Leaf size={110} strokeWidth={0.65} />
                </div>
              </article>
              <article className="stat-card">
                <div className="summary-label">
                  <span>Total pemasukan</span>
                  <span className="stat-icon income">
                    <ArrowDownLeft size={19} />
                  </span>
                </div>
                <h2>{currency(summary.income)}</h2>
                <p>
                  <span className="positive">
                    {summary.items.filter((t) => t.type === "income").length}{" "}
                    transaksi
                  </span>
                  <span>bulan ini</span>
                </p>
              </article>
              <article className="stat-card">
                <div className="summary-label">
                  <span>Total pengeluaran</span>
                  <span className="stat-icon expense">
                    <ArrowUpRight size={19} />
                  </span>
                </div>
                <h2>{currency(summary.expense)}</h2>
                <p>
                  <span>
                    {summary.items.filter((t) => t.type === "expense").length}{" "}
                    transaksi
                  </span>
                  <span>bulan ini</span>
                </p>
              </article>
            </section>
          )}
          {page === "overview" && (
            <div className="insight-grid">
              <section className="panel spending-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Ke mana uangmu pergi?</h2>
                    <p>Pengeluaran berdasarkan kategori</p>
                  </div>
                  <PieChart size={19} className="muted" />
                </div>
                <div className="spending-body">
                  <div className="donut-wrap">
                    <svg
                      viewBox="0 0 180 180"
                      role="img"
                      aria-label={`Pengeluaran ${currency(summary.expense)} dalam ${breakdown.length} kategori`}
                    >
                      <circle
                        className="donut-track"
                        cx="90"
                        cy="90"
                        r="70"
                        fill="none"
                        strokeWidth="20"
                      />
                      {breakdown.map((c, i) => {
                        const before =
                          (breakdown
                            .slice(0, i)
                            .reduce((s, x) => s + summary.byCategory[x.id], 0) /
                            summary.expense) *
                          439.823;
                        const size =
                          (summary.byCategory[c.id] / summary.expense) *
                          439.823;
                        return (
                          <circle
                            key={c.id}
                            className={`chart-stroke chart-${c.color}`}
                            cx="90"
                            cy="90"
                            r="70"
                            fill="none"
                            strokeWidth="20"
                            strokeDasharray={`${Math.max(0, size - 3)} ${439.823 - Math.max(0, size - 3)}`}
                            strokeDashoffset={-before}
                            transform="rotate(-90 90 90)"
                          />
                        );
                      })}
                    </svg>
                    <div className="donut-center">
                      <span>Total pengeluaran</span>
                      <strong>{currency(summary.expense)}</strong>
                      <small>{breakdown.length} kategori</small>
                    </div>
                  </div>
                  <div className="legend">
                    {breakdown.length ? (
                      breakdown.slice(0, 4).map((c) => (
                        <div className="legend-row" key={c.id}>
                          <span>
                            <i className={`chart-bg chart-${c.color}`} />
                            {c.name}
                          </span>
                          <strong>
                            {Math.round(
                              (summary.byCategory[c.id] / summary.expense) *
                                100,
                            )}
                            %
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p className="muted">
                        Grafikmu akan muncul setelah pengeluaran pertama.
                      </p>
                    )}
                    {breakdown.length > 4 && (
                      <div className="legend-row">
                        <span>
                          <i className="chart-bg chart-gray" />
                          Kategori lainnya
                        </span>
                        <strong>
                          {Math.round(
                            (breakdown
                              .slice(4)
                              .reduce(
                                (s, c) => s + summary.byCategory[c.id],
                                0,
                              ) /
                              summary.expense) *
                              100,
                          )}
                          %
                        </strong>
                      </div>
                    )}
                    <button
                      className="text-button"
                      onClick={() => navigate("reports")}
                    >
                      Lihat laporan <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </section>
              <section className="panel budget-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Jaga rencana bulanan</h2>
                    <p>
                      {usage > 100
                        ? "Saatnya meninjau kembali rencanamu"
                        : "Sedikit batas, lebih banyak kendali"}
                    </p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Lihat anggaran"
                    onClick={() => navigate("budgets")}
                  >
                    <ArrowUpRight size={19} />
                  </button>
                </div>
                {budgetRows()}
                <button
                  className="budget-link"
                  onClick={() => navigate("budgets")}
                >
                  Lihat semua anggaran <ArrowRight size={15} />
                </button>
              </section>
            </div>
          )}
          {(page === "overview" || page === "transactions") && (
            <section className="panel transactions-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    {page === "overview"
                      ? "Catatan terbaru"
                      : "Semua transaksi"}
                  </h2>
                  <p>Hal kecil yang membentuk gambaran besar.</p>
                </div>
                {page === "overview" ? (
                  <button
                    className="text-button"
                    onClick={() => navigate("transactions")}
                  >
                    Lihat semua <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    className="secondary export-csv"
                    onClick={() =>
                      download(
                        csvExport(filtered),
                        `saku-transaksi-${month}.csv`,
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    <Download size={15} /> Ekspor CSV
                  </button>
                )}
              </div>
              {transactionTable(page === "overview" ? 5 : 30)}
            </section>
          )}
          {page === "budgets" && (
            <>
              <section className="budget-summary panel">
                <span className="stat-icon income">
                  <PieChart size={24} />
                </span>
                <div>
                  <p>Total rencana bulanan</p>
                  <h2>{currency(totalBudget)}</h2>
                </div>
                <div className="budget-summary-right">
                  <strong className={usage > 100 ? "negative" : ""}>
                    {usage}% terpakai
                  </strong>
                  <span>
                    {currency(Math.abs(totalBudget - summary.expense))}{" "}
                    {usage > 100 ? "melewati anggaran" : "tersisa"}
                  </span>
                </div>
              </section>
              <div className="budget-card-grid">
                {categories
                  .filter((c) => !c.income)
                  .map((c) => (
                    <section className="panel single-budget" key={c.id}>
                      <div className="single-budget-heading">
                        <CategoryIcon category={c} />
                        <button
                          className="icon-button"
                          onClick={() =>
                            setModal({ kind: "budget", category: c })
                          }
                          aria-label={`Ubah anggaran ${c.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                      <h2>{c.name}</h2>
                      {budgetRows(true).find((row) => row.key === c.id)}
                    </section>
                  ))}
              </div>
            </>
          )}
          {page === "reports" && (
            <section className="panel report-panel">
              <div className="panel-heading">
                <div>
                  <h2>Rincian pengeluaran</h2>
                  <p>Lebih kenal kebiasaanmu, lebih mudah mengaturnya.</p>
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    download(
                      csvExport(sorted),
                      `saku-laporan-${month}.csv`,
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  <Download size={15} /> Ekspor CSV
                </button>
              </div>
              {breakdown.length ? (
                breakdown.map((c) => (
                  <div key={c.id} className="report-row">
                    <CategoryIcon category={c} />
                    <div>
                      <strong>{c.name}</strong>
                      <div className="progress">
                        <span
                          className={`chart-bg chart-${c.color}`}
                          style={{
                            width: `${(summary.byCategory[c.id] / summary.expense) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="muted">
                      {Math.round(
                        (summary.byCategory[c.id] / summary.expense) * 100,
                      )}
                      %
                    </span>
                    <strong>{currency(summary.byCategory[c.id])}</strong>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <ChartNoAxesCombined size={32} />
                  <h3>Belum ada cerita bulan ini</h3>
                  <p>Tambahkan pengeluaran untuk melihat laporanmu.</p>
                </div>
              )}
              <div className="report-insight">
                <Leaf size={23} />
                <p>
                  {summary.income > 0 && summary.balance >= 0
                    ? `Kamu menyisihkan ${Math.round((summary.balance / summary.income) * 100)}% pemasukan bulan ini. Jaga ritme baikmu.`
                    : summary.income > 0
                      ? "Pengeluaran melebihi pemasukan bulan ini. Coba tinjau kategori terbesar untuk langkah berikutnya."
                      : "Mulai dari mencatat pemasukan. Gambaran keuanganmu akan lebih lengkap."}
                </p>
              </div>
            </section>
          )}
          <footer>
            <span>
              saku.{" "}
              <span className="footer-tagline">
                Ruang untuk keuangan yang lebih tenang.
              </span>
            </span>
            <button
              className="text-button backup-link"
              onClick={() => setModal({ kind: "about" })}
            >
              <ShieldCheck size={13} /> Cadangan & privasi
            </button>
            <a
              href="https://app.devin.ai/sessions/8ee1fab5699947a4a8613077a9b1c84c"
              target="_blank"
              rel="noreferrer"
            >
              Saran & masukan <ArrowUpRight size={12} />
            </a>
          </footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Navigasi seluler">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={page === id ? "active" : ""}
            onClick={() => navigate(id)}
            aria-current={page === id ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal?.kind === "transaction" && (
        <TransactionModal
          transaction={modal.transaction}
          onClose={() => setModal(null)}
          onSave={(transaction) => {
            save(
              {
                ...data,
                transactions: modal.transaction
                  ? data.transactions.map((t) =>
                      t.id === transaction.id ? transaction : t,
                    )
                  : [...data.transactions, transaction],
              },
              "Transaksi berhasil disimpan",
            );
            setMonth(transaction.date.slice(0, 7));
            setModal(null);
          }}
          onDelete={(transaction) => setModal({ kind: "delete", transaction })}
        />
      )}
      {modal?.kind === "budget" && (
        <BudgetModal
          category={modal.category}
          amount={data.budgets[modal.category.id]}
          onClose={() => setModal(null)}
          onSave={(amount) => {
            save(
              {
                ...data,
                budgets: { ...data.budgets, [modal.category.id]: amount },
              },
              "Anggaran diperbarui",
            );
            setModal(null);
          }}
        />
      )}
      {["start", "delete", "import"].includes(modal?.kind) && (
        <Modal
          title={
            modal.kind === "start"
              ? "Siap mulai ceritamu?"
              : modal.kind === "delete"
                ? "Hapus transaksi ini?"
                : "Pulihkan cadangan?"
          }
          onClose={() => setModal(null)}
        >
          <p className="modal-description">
            {modal.kind === "start"
              ? "Data contoh dan anggaran contoh akan diganti dengan catatan kosong dan anggaran awal. Selanjutnya, setiap catatan adalah milikmu."
              : modal.kind === "delete"
                ? `“${modal.transaction.name}” akan dihapus permanen. Ringkasan dan anggaran akan ikut diperbarui.`
                : `Cadangan berisi ${modal.data.transactions.length} transaksi. Seluruh data saat ini akan diganti, bukan digabung. Ekspor cadangan terlebih dahulu jika masih dibutuhkan.`}
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              Batal
            </button>
            <button
              className={modal.kind === "delete" ? "danger" : "primary"}
              onClick={() => {
                if (modal.kind === "start") {
                  save(
                    emptyState(),
                    "Catatan pribadimu siap. Mulai dari satu transaksi.",
                  );
                  setMonth(localDate().slice(0, 7));
                } else if (modal.kind === "delete")
                  save(
                    {
                      ...data,
                      transactions: data.transactions.filter(
                        (t) => t.id !== modal.transaction.id,
                      ),
                    },
                    "Transaksi dihapus",
                  );
                else save(modal.data, "Cadangan berhasil dipulihkan");
                setModal(null);
              }}
            >
              {modal.kind === "start"
                ? "Mulai dari nol"
                : modal.kind === "delete"
                  ? "Ya, hapus"
                  : "Ganti & pulihkan"}
            </button>
          </div>
        </Modal>
      )}
      {modal?.kind === "about" && (
        <Modal
          title="Ruang pribadi, di browsermu"
          onClose={() => setModal(null)}
        >
          <div className="about-content">
            <ShieldCheck size={34} />
            <p>
              Catatan disimpan hanya di browser dan perangkat ini. Tidak dikirim
              ke server dan tidak tersinkron antarperangkat.
            </p>
            <p>
              Menghapus data browser juga menghapus catatan. Gunakan{" "}
              <strong>Ekspor cadangan</strong> secara berkala, lalu{" "}
              <strong>Impor cadangan</strong> untuk memulihkannya.
            </p>
            <p>
              “Sisa uang” adalah pemasukan dikurangi pengeluaran bulan terpilih,
              bukan saldo rekening bank. Anggaran berlaku berulang setiap bulan.
            </p>
          </div>
          <div className="backup-actions">
            <button
              className="secondary"
              onClick={() =>
                download(
                  JSON.stringify(data, null, 2),
                  `saku-cadangan-${localDate()}.json`,
                  "application/json",
                )
              }
            >
              <Download size={16} /> Ekspor cadangan
            </button>
            <button
              className="secondary"
              onClick={() => {
                setModal(null);
                importRef.current.click();
              }}
            >
              <Upload size={16} /> Impor cadangan
            </button>
          </div>
          <button className="primary full" onClick={() => setModal(null)}>
            Mengerti
          </button>
        </Modal>
      )}
    </div>
  );
}
function AmountField({ name, label, initialValue }) {
  const [raw, setRaw] = useState(
    initialValue === undefined
      ? ""
      : new Intl.NumberFormat("id-ID").format(initialValue),
  );
  const parsed = parseRupiah(raw);
  return (
    <label className="field amount-field">
      {label}
      <span>
        <b>Rp</b>
        <input
          autoFocus
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          maxLength={35}
          required
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-describedby={`${name}-hint`}
        />
      </span>
      <small
        id={`${name}-hint`}
        className={raw && !validAmount(parsed) ? "negative" : "amount-hint"}
        aria-live="polite"
      >
        {!raw
          ? "Tulis 5000 atau 5.000, tanpa pecahan rupiah."
          : validAmount(parsed)
            ? `Akan dicatat: ${currency(parsed)}`
            : "Gunakan angka bulat, misalnya 5.000. Maksimal 1 triliun."}
      </small>
    </label>
  );
}
function TransactionModal({ transaction, onClose, onSave, onDelete }) {
  const [type, setType] = useState(transaction?.type || "expense");
  const [category, setCategory] = useState(transaction?.category || "food");
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = parseRupiah(form.get("amount"));
    const name = form.get("name").trim();
    const date = form.get("date");
    if (!validAmount(amount) || !name || !validDate(date)) {
      setError(
        "Isi nama, tanggal yang valid, dan nominal rupiah bulat lebih dari nol (maksimal 1 triliun).",
      );
      return;
    }
    onSave({
      id: transaction?.id || crypto.randomUUID(),
      type,
      category,
      name,
      amount,
      date,
      note: form.get("note").trim(),
    });
  }
  return (
    <Modal
      title={transaction ? "Edit transaksi" : "Catat transaksi baru"}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="type-switch">
          <button
            type="button"
            className={type === "expense" ? "selected" : ""}
            onClick={() => {
              setType("expense");
              setCategory("food");
            }}
          >
            <ArrowUpRight size={17} /> Pengeluaran
          </button>
          <button
            type="button"
            className={type === "income" ? "selected" : ""}
            onClick={() => {
              setType("income");
              setCategory("salary");
            }}
          >
            <ArrowDownLeft size={17} /> Pemasukan
          </button>
        </div>
        <AmountField
          name="amount"
          label="Nominal"
          initialValue={transaction?.amount}
        />
        <label className="field">
          Nama transaksi
          <input
            name="name"
            placeholder="Misalnya, makan siang"
            maxLength={100}
            defaultValue={transaction?.name}
            required
          />
        </label>
        <div className="form-columns">
          <label className="field">
            Kategori
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories
                .filter((c) => Boolean(c.income) === (type === "income"))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Tanggal
            <input
              name="date"
              type="date"
              min="1900-01-01"
              max="2199-12-31"
              required
              defaultValue={transaction?.date || localDate()}
            />
          </label>
        </div>
        <label className="field">
          Catatan <span className="optional">opsional</span>
          <input
            name="note"
            placeholder="Tambahkan cerita kecil..."
            maxLength={300}
            defaultValue={transaction?.note}
          />
        </label>
        {error && (
          <p role="alert" className="negative">
            {error}
          </p>
        )}
        <div className="modal-actions">
          {transaction && (
            <button
              type="button"
              className="delete-button"
              onClick={() => onDelete(transaction)}
              aria-label="Hapus transaksi"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="primary">
            {transaction ? "Simpan perubahan" : "Simpan transaksi"}{" "}
            <Check size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function BudgetModal({ category, amount, onClose, onSave }) {
  const [error, setError] = useState("");
  return (
    <Modal title={`Anggaran ${category.name.toLowerCase()}`} onClose={onClose}>
      <p className="modal-description">
        Tentukan batas yang nyaman untukmu. Anggaran ini berlaku setiap bulan.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = parseRupiah(
            new FormData(e.currentTarget).get("budget"),
          );
          if (!validAmount(value)) {
            setError(
              "Masukkan rupiah bulat lebih dari nol, maksimal 1 triliun.",
            );
            return;
          }
          onSave(value);
        }}
      >
        <AmountField
          name="budget"
          label="Anggaran bulanan"
          initialValue={amount}
        />
        {error && (
          <p role="alert" className="negative">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Batal
          </button>
          <button className="primary" type="submit">
            Simpan anggaran
          </button>
        </div>
      </form>
    </Modal>
  );
}

createRoot(document.getElementById("root")).render(<App />);
