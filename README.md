# Saku

A mobile-friendly Indonesian personal finance tracker. React + Vite, with a small Node production server and no external services.

## Run

Use Node 22 or newer. If Node is installed with nvm, run `source ~/.nvm/nvm.sh` first.

```sh
npm ci
npm run dev
```

For production: `npm run build && npm start`. Set `PORT` to change port 3000.
Run finance calculation and input validation tests with `npm test`.

## Data model and privacy

Data lives only in this browser's localStorage, not on a server. It is not synced between devices or browsers. Clearing browser data removes it. Export JSON backups from the sidebar and import them later. CSV export is available for spreadsheet use.

The app starts with clearly labelled demo data. “Mulai catatan saya” clears the demo after confirmation and starts an empty personal ledger. No login, bank connection, analytics, payments, or service worker. The web manifest supports an app icon, but offline use is not promised.

All summaries are calculated from transactions in the selected calendar month; balance is monthly net income, not an actual bank account balance. Budgets repeat each month. Amounts are whole rupiah; negatives and zero are not accepted. There are no transfers or multi-currency accounts in this first version.
