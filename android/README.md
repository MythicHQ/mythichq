# MythicHQ Android app (Trusted Web Activity)

MythicHQ is a Vite React website, so the recommended Android package is a Trusted Web Activity (TWA). It opens the existing HTTPS site in a verified, fullscreen Android activity and keeps Supabase authentication and the website as the source of app content. A TWA needs a valid production PWA and Digital Asset Links association; without that association Android Chrome falls back to a Custom Tab.

## Current setup

- Production origin: `https://mythichq.vercel.app`
- Android application ID proposal: `com.mythichq.app` (valid reverse-domain format; confirm it is unused in Play Console before the first release because the application ID is permanent once published).
- Entry point: `/`
- Branding and splash colors: `#101014`
- Launcher icon: `https://mythichq.vercel.app/icons/mythichq-512.png`

## Generate the Android project

Install Node.js and Android Studio/Android SDK, then run from the repository root:

```powershell
npm install
npm run build
npm install --global @bubblewrap/cli
bubblewrap init --manifest=https://mythichq.vercel.app/manifest.webmanifest --directory=android/project
```

During initialization use the application ID above, name `MythicHQ`, start URL `/`, and the MythicHQ icon and dark colors. `twa-manifest.template.json` records the intended settings; apply them to the generated `android/project/twa-manifest.json` and keep the generated Android project in `android/project/`. Bubblewrap asks to create a signing key. Keep the keystore and its passwords private and back up the keystore securely; never commit either to Git. If Bubblewrap prompts to download its Android dependencies, allow the official Bubblewrap setup or install them through Android Studio.

Validate the live PWA before building:

```powershell
bubblewrap validate --url=https://mythichq.vercel.app
Set-Location android/project
bubblewrap build
```

The signed APK and Android App Bundle (AAB) are produced by Bubblewrap in the Android project directory. Install the APK on a connected test phone with `bubblewrap install`; upload the AAB to Google Play when ready.

## Digital Asset Links (required for fullscreen TWA)

After the release signing certificate is finalized, obtain its SHA-256 certificate fingerprint. For a locally generated keystore, use:

```powershell
keytool -list -v -keystore android/project/android.keystore -alias android
```

For a Play Store release signed by Play App Signing, use the **App signing key certificate** fingerprint from Play Console (not the upload key fingerprint). Add the package ID and this fingerprint to Bubblewrap's `fingerprints`, generate the Digital Asset Links JSON with `bubblewrap fingerprint generateAssetLinks`, then publish the result at `public/.well-known/assetlinks.json`. Deploy and verify that `https://mythichq.vercel.app/.well-known/assetlinks.json` returns the JSON directly with HTTP 200. The fingerprint cannot be filled in until the actual signing key exists.

Google OAuth and Supabase auth redirect URLs must include the production website URLs used by MythicHQ. TWA uses the same website origin, so no separate API keys or Supabase service-role key belong in the Android project.
