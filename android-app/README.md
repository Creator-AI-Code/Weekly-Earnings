# Momentum · Android

Capacitor wrapper for the Momentum web app in the repo root. GitHub Actions (`.github/workflows/android.yml`)
builds a debug-signed `Momentum.apk` on every push to `main` and attaches it to the `latest` release.

Local build: `npm install && npm run build:www && npx cap add android && npx cap sync android && python3 scripts/icons.py && python3 scripts/patch-android.py && cd android && ./gradlew assembleDebug`

`momentum-debug.jks` is a debug key (password `android`) kept in the repo only so every CI build has the same
signature and installs over the previous version. It is not a release key.
