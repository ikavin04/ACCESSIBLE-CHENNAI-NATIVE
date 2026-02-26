# Accessible Chennai - React Native APK Build Guide

## Prerequisites

1. **Node.js** (v18+): https://nodejs.org/
2. **Expo CLI**: `npm install -g expo-cli eas-cli`
3. **Expo Account**: Create at https://expo.dev/signup

---

## Quick Start (Development)

```bash
cd AccessibleChennaiNative

# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Press 'a' to open in Android emulator
# Or scan QR code with Expo Go app on your phone
```

---

## Build APK (EAS Build — Recommended)

### Step 1: Login to Expo

```bash
npx eas-cli login
```

### Step 2: Configure EAS Build

Create `eas.json` in the project root (already provided below), then run:

```bash
npx eas-cli build:configure
```

### Step 3: Build APK

```bash
# Build APK (not AAB) for direct installation
npx eas-cli build --platform android --profile preview

# Or build production AAB for Play Store
npx eas-cli build --platform android --profile production
```

### Step 4: Download APK

After the build completes (~10–15 minutes), the download link will be shown in the terminal and on https://expo.dev/accounts/YOUR_USERNAME/projects/accessible-chennai/builds

---

## eas.json Configuration

Create this file in `AccessibleChennaiNative/eas.json`:

```json
{
  "cli": {
    "version": ">= 8.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-services.json",
        "track": "production"
      }
    }
  }
}
```

---

## Local APK Build (Without EAS / Offline)

If you want to build locally without Expo's cloud:

### Step 1: Prebuild native project

```bash
npx expo prebuild --platform android
```

### Step 2: Build with Gradle

```bash
cd android

# Debug APK
./gradlew assembleDebug

# Release APK (requires signing key)
./gradlew assembleRelease
```

### Step 3: Find APK

- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

---

## Backend Setup for Mobile

The app expects the Flask backend at `http://10.0.2.2:5000` (Android emulator → host machine).

### For physical device testing:

1. Find your machine's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update `API_BASE` in all service files:
   - `src/services/LocationService.js`
   - `src/services/MetroService.js`
   - `src/services/MTCBusService.js`
   - `src/screens/LoginScreen.js`
   - `src/screens/AlertsScreen.js`

3. Start the Flask backend:
```bash
cd backend
pip install -r requirements.txt
python app.py
```

---

## Required Android Permissions (Already Configured)

- `RECORD_AUDIO` — Voice commands
- `ACCESS_FINE_LOCATION` — GPS navigation
- `ACCESS_COARSE_LOCATION` — Area-based features
- `VIBRATE` — Haptic feedback
- `CALL_PHONE` — Emergency calling
- `SEND_SMS` — Emergency SMS

---

## Project Structure

```
AccessibleChennaiNative/
├── App.js                          # Root navigator
├── app.json                        # Expo config
├── package.json                    # Dependencies
├── babel.config.js                 # Babel config
├── index.js                        # Entry point
├── eas.json                        # EAS Build config
└── src/
    ├── context/
    │   └── PreferencesContext.js    # Theme, language, mode
    ├── screens/
    │   ├── ModeSelectionScreen.js   # Voice/Touch mode picker
    │   ├── LoginScreen.js           # Auth (login/register)
    │   ├── HomeScreen.js            # Dashboard + GPS
    │   ├── NavigateScreen.js        # Full voice navigation
    │   ├── AlertsScreen.js          # Real-time alerts
    │   ├── CommunityScreen.js       # Community posts
    │   └── SettingsScreen.js        # Preferences
    ├── services/
    │   ├── LocationService.js       # Locations + routes
    │   ├── MetroService.js          # Metro data
    │   └── MTCBusService.js         # Bus data
    └── utils/
        └── voiceUtils.js            # Voice hook
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `expo-speech` not working | Run `npx expo install expo-speech` to ensure correct version |
| Voice recognition fails | Check RECORD_AUDIO permission in device settings |
| API calls fail on emulator | Ensure backend runs on port 5000, use `10.0.2.2` |
| API calls fail on device | Replace `10.0.2.2` with your machine's LAN IP |
| Build fails | Run `npx expo doctor` to check dependency compatibility |
| Gradle build OOM | Add `org.gradle.jvmargs=-Xmx4096m` to `gradle.properties` |
