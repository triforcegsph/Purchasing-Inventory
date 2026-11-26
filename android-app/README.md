# Purchasing & Inventory System — Android Mobile Companion (Flutter / Dart)

Native Android companion application built with **Flutter**, **Dart**, and **Material Design 3** for the Triforce Global Solutions Purchasing & Inventory System.

> **Platform Scope:** Android smartphones only (`android/` target; iOS is explicitly excluded).

---

## Supported Mobile Roles (Enforced Client-Side & Server-Side)

| Role | Test Account | Password | Authorized Mobile Modules |
| :--- | :--- | :---: | :--- |
| **Applicant / Requestor** | `applicant@triforcegs.com.ph` | `1234` | Dashboard, BOQ (read-only), PQTO, PR (create/draft/submit/edit returned), PO (read-only), Material Withdrawal, End-to-End Tracking, Transaction Logs, Notifications, Profile |
| **REQ Approver** | `req.approver@triforcegs.com.ph` | `1234` | Approver Dashboard, BOQ (view/add/CSV import/itemize fittings/post to PQTO), PQTO, PR Approval Queue (Approve/Reject with mandatory reason), PO (read-only), End-to-End Tracking, Transaction Logs, Notifications, Profile |

Web-only roles (`PO Approver`, `Warehouse Manager`, `Purchaser`, `Admin`) are rejected with `403 Forbidden` when signing in through the mobile client.

---

## Backend Setup

Start the shared Express API server from the repository root:

```bash
npx tsx server/index.ts
```

- Runs on `http://0.0.0.0:4000` by default.
- For SQL Server (MSSQL), configure `server/.env` from `server/.env.example`, run `server/schema.sql`, and run the additive migration `server/migration_mobile_api.sql`.
- Without MSSQL configured, the backend uses a persistent local store (`server/data/store.json`) and file storage (`server/uploads/`) with identical REST contracts and RBAC enforcement.

### Configuring the API Base URL on Android

- **Android Emulator:** Default `http://10.0.2.2:4000` works out of the box.
- **Physical Android Device:** Tap the **Server icon** (top-right of Login screen) or open **Profile → Backend API Configuration** and enter `http://<YOUR-PC-LAN-IP>:4000`, then tap **Test**.

---

## Building APKs

### 1. Debug APK (Testing & Installation)

```bash
cd android-app
flutter pub get
flutter build apk --debug
```

Output: `android-app/build/app/outputs/flutter-apk/app-debug.apk`

Install to a connected device via ADB:

```bash
adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

### 2. Release APK (Production Distribution)

1. Generate an Android upload keystore:
   ```bash
   keytool -genkey -v -keystore android/app/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. Create `android/key.properties` (do not commit to Git):
   ```properties
   storePassword=<YOUR_STORE_PASSWORD>
   keyPassword=<YOUR_KEY_PASSWORD>
   keyAlias=upload
   storeFile=upload-keystore.jks
   ```
3. Configure `signingConfigs` in `android/app/build.gradle.kts` to read `key.properties`.
4. Build the release APK with your production HTTPS API URL:
   ```bash
   flutter build apk --release --dart-define=API_BASE_URL=https://api.yourdomain.com
   ```
   Output: `android-app/build/app/outputs/flutter-apk/app-release.apk`

---

## Running Automated Tests

```bash
# Flutter static analysis & unit/widget tests
cd android-app
flutter analyze
flutter test
```
