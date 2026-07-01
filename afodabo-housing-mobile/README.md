# Afodabo Housing Mobile

React Native mobile app for Afodabo Housing, built with Expo SDK 54, TypeScript, and React Navigation.

## Stack

- Expo
- React Native
- TypeScript
- React Navigation
- Python backend API + Supabase
- React Query

## Prerequisites

Install these before running the app:

- Node.js `20+`
- npm `10+`
- Android Studio with Android SDK if you want native Android builds
- Expo Go on your phone for quick testing
- `eas-cli` if you want cloud release builds

## Environment Variables

Create a local `.env` file in the project root.

Required variables:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend.onrender.com
```

You can start from:

```bash
cp .env.example .env
```

The mobile app now talks to the backend API first. It no longer boots from direct client-side Supabase environment variables.

Render deployment notes for the backend live in [docs/backend-render-deploy.md](/C:/Users/Michael/Desktop/Projects/AFODABO/afodabo-housing-mobile/docs/backend-render-deploy.md).

## Install Dependencies

This project uses `npm`.

```bash
npm install
```

## Daily Development

### Start Expo Go

Use this for the fastest iteration loop:

```bash
npx expo start
```

Useful variants:

- `npx expo start -c` clears Metro cache
- `npx expo start --tunnel` helps when LAN networking is unreliable

### Run on Android with Expo Go

1. Start the dev server:

```bash
npx expo start
```

2. Scan the QR code with Expo Go.

## Native Android Development

Use this when you need a real Android app build instead of Expo Go.

### First-time Android device setup

On your Android phone:

1. Enable `Developer options`
2. Enable `USB debugging`
3. Connect the phone with USB
4. Accept the `Allow USB debugging` prompt

Check that ADB sees the device:

```bash
adb devices
```

You want the device to show as:

```text
device
```

If it shows `unauthorized`, revoke USB debugging authorizations on the phone, reconnect, and accept the RSA prompt again.

### Run the app natively on Android

From the project root:

```bash
npx expo run:android
```

This creates or updates the native Android project and installs a debug build on the device or emulator.

### Clean Android build artifacts

If the Android build gets stuck or behaves strangely, clean it first.

PowerShell:

```powershell
cd android
.\gradlew clean
cd ..
```

Git Bash:

```bash
cd android
./gradlew clean
cd ..
```

Then run:

```bash
npx expo run:android
```

## Quality Checks

### Type check

```bash
npx tsc --noEmit
```

### Lint

```bash
npm run lint
```

### Auto-fix lint issues

```bash
npm run lint:fix
```

### Format

```bash
npm run format
```

### Tests

```bash
npm test
```

## Production Builds

There are two common Android release outputs:

- `APK`: install directly on a device
- `AAB`: upload to Google Play

### Option 1: Build an installable APK with EAS

This project already includes [eas.json](/C:/Users/Michael/Desktop/Projects/AFODABO%20HOUSING/afodabo-housing-mobile/eas.json:1).

Login first if needed:

```bash
npx eas login
```

Build an installable Android APK using the `preview` profile:

```bash
npx eas build -p android --profile preview
```

That is the easiest command if you want a final installable Android file without opening Android Studio.

### Option 2: Build a production Android release with EAS

For a production store-style build:

```bash
npx eas build -p android --profile production
```

Important:

- the current `production` profile is for the real production build flow
- Expo/EAS production Android builds are commonly `AAB` for Play Store submission
- if you specifically need a production `APK`, keep using the `preview` profile or add an APK-specific profile in `eas.json`

### Option 3: Local release APK from Gradle

If you want to build locally from the native Android project:

PowerShell:

```powershell
cd android
.\gradlew assembleRelease
```

Git Bash:

```bash
cd android
./gradlew assembleRelease
```

If the release build succeeds, the APK is typically written to:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Note:

- local release builds require a valid Android signing setup if you intend to distribute the APK
- EAS is usually the easier path for release signing and distribution

## Common Commands

```bash
npm install
npx expo start
npx expo start -c
npx expo run:android
npx tsc --noEmit
npm run lint
npm run format
npm test
npx eas build -p android --profile preview
npx eas build -p android --profile production
```

## Project Structure

- `assets/` static images, icons, splash assets
- `src/components/` reusable UI components
- `src/context/` shared app context such as auth
- `src/navigation/` stack and tab navigation
- `src/screens/` app screens
- `src/services/` backend API integration and business logic
- `src/theme/` colors, spacing, typography tokens
- `src/types/` TypeScript app types
- `src/utils/` formatters and constants

## Notes

- This app currently uses classic React Navigation, not Expo Router.
- `newArchEnabled` is currently set to `false` in [app.json](/C:/Users/Michael/Desktop/Projects/AFODABO%20HOUSING/afodabo-housing-mobile/app.json:1) because of Windows native build path issues encountered in this repo.
- If Android native builds fail on Windows, shorter project paths often help.
- For local Android emulator testing against a local backend, `http://10.0.2.2:8000` is usually the correct API base URL instead of `http://127.0.0.1:8000`.
