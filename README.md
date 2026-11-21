# Saku

Saku — pencatat keuangan pribadi berbahasa Indonesia.

A mobile-friendly Indonesian personal finance tracker. React + Vite, with a small Node production server and no external services.

## Run

Use Node 22 or newer. If Node is installed with nvm, run `source ~/.nvm/nvm.sh` first.

```sh
npm ci
npm run dev
```

For production: `npm run build && npm start`. Set `PORT` to change port 3000.
Run finance calculation and input validation tests with `npm test`.

## iOS app

The native app uses Capacitor 7 and Swift Package Manager (no Pods). Requires Node 22+, Xcode with iOS support, and an installed simulator runtime. From the repository root:

```sh
npm ci
npm run ios:sync # build bundled assets and sync native dependencies
npm run ios:open # open the App project in Xcode
```

Select the **App** scheme and an iPhone simulator in Xcode, then Run. Or build and launch from Terminal:

```sh
npm run ios:build
UDID=405F45A9-B471-47B7-A5D9-E545EA624713 # replace with your simulator from xcrun simctl list devices
xcrun simctl boot "$UDID" # omit if already booted
open -a Simulator
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" ios/build/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch "$UDID" id.saku.app
```

For a real iPhone, open Xcode, connect and trust the device, enable Developer Mode on it, and select it as the run destination. Under App → Signing & Capabilities, choose the owner's Apple Developer team and a unique bundle identifier if needed (default `id.saku.app`). Signing is automatic with no team or credentials committed. Run from Xcode; distribution/TestFlight later requires the owner's developer membership and provisioning.

The WKWebView loads bundled `dist` assets at the stable `capacitor://localhost` origin, never a remote website. Fonts are bundled too. The standard persistent WKWebView data store keeps localStorage across force-quit/relaunch and app updates; deleting the app removes its ledger. Do not change its origin or bundle ID for an existing install. Data does not sync to Safari or another device. Export backups before uninstalling. Re-run `ios:sync` after web changes. Native icons/splash can be regenerated on macOS with `swift scripts/ios-assets.swift`.

### TestFlight upload

On a Mac with full Xcode selected (`xcode-select -p`), Node 22+ and a current
Homebrew Ruby (not macOS system Ruby), install the locked tools once:

```sh
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
npm ci
bundle install
```

Create the App Store Connect app record for **Saku**, bundle ID **id.saku.app**,
in the owner's Apple Developer team first. Set these environment variables in
your shell or secret manager (never commit a `.p8` file or credentials):

| Variable | Value |
| --- | --- |
| `ASC_KEY_ID` | App Store Connect team API key ID |
| `ASC_ISSUER_ID` | API key issuer UUID |
| `APPLE_TEAM_ID` | 10-character Apple Developer team ID (not the numeric App Store Connect provider ID) |
| `ASC_KEY_P8` | Raw contents of the downloaded `.p8` private key, including PEM headers/newlines; base64 is also accepted |
| `ASC_KEY_P8_BASE64` | Alternative to `ASC_KEY_P8`: base64-encoded `.p8` contents |

Set only one key-content variable; `ASC_KEY_P8` takes precedence. For example,
load raw contents with `export ASC_KEY_P8="$(cat /secure/path/AuthKey.p8)"`, or
base64 with `export ASC_KEY_P8_BASE64="$(base64 < /secure/path/AuthKey.p8)"`.
The key must have access to this app and Certificates, Identifiers & Profiles,
including cloud-managed distribution certificates (typically an Admin team API
key). Active paid membership and accepted Apple agreements are required.

Then, from the repository root:

```sh
npm run ios:testflight
```

The `ios beta` lane builds web assets, syncs Capacitor, queries the latest
TestFlight build for marketing version **1.0.0**, and builds Release with the
next build number (starts at 1). Build number and signing team are command-line
overrides, not edits to the checked-in project. It uses automatic signing and
API-key provisioning for both archive and export, with no `match` repository
or committed certificates/profiles. A mode-0600 temporary key file is deleted
when the lane exits. The IPA is written to ignored `ios/App/output/` and uploaded
without waiting for Apple processing. Serialize uploads: concurrent runs can
select the same next number. After an upload, wait for that build to appear in
App Store Connect before running again. Processing, tester groups and external
beta review are managed in App Store Connect; a successful upload does not mean
the build is immediately available to testers.

Checks without credentials (do not run the `beta` lane):

```sh
(cd ios/App && bundle exec fastlane lanes)
bundle exec ruby ios/App/fastlane/release_config_test.rb
```

Signing/provisioning and uploading cannot be verified until the real API key,
team and app record are available. The existing privacy manifest declares the
Filesystem timestamp API reason `C617.1`; Capacitor bundles its own framework
manifests. Encryption is declared exempt (`ITSAppUsesNonExemptEncryption=false`);
review this and App Store privacy answers if future features add cryptography
or off-device data collection.

## Data model and privacy

Data lives only in this browser's localStorage, not on a server. It is not synced between devices or browsers. Clearing browser data removes it. Export JSON backups from the sidebar and import them later. CSV export is available for spreadsheet use.

Saving requires a modern browser with Web Locks support over HTTPS or localhost. Writes are serialized across tabs; a stale tab reloads the latest saved ledger and asks the user to retry rather than overwriting another tab's changes.

The app starts with clearly labelled demo data. “Mulai catatan saya” clears the demo after confirmation and starts an empty personal ledger. No login, bank connection, analytics, payments, or service worker. The web manifest supports an app icon, but offline use is not promised.

All summaries are calculated from transactions in the selected calendar month; balance is monthly net income, not an actual bank account balance. Default budgets repeat, while edits apply only to the selected month and do not rewrite history. Amounts are whole rupiah; negatives and zero are not accepted. There are no transfers or multi-currency accounts in this first version.

Demo data is view-only until the user confirms starting personal records. The transition removes built-in demo entries but preserves new transactions made in earlier builds and existing budgets. Dates use DD-MM-YYYY entry. Deleted transactions can be restored with the eight-second undo action. New entries remember the last type/category, retain creation time/reference, and appear newest-first within a date.
