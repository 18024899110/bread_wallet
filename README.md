# BREAD Wallet

This is our COMP9900  project — a digital identity wallet system built to the EUDI (European Digital Identity) standards. The idea is that users can apply for verifiable credentials (like a national ID or driving licence), store them in a mobile wallet app, and then present them to a verifier when needed. Everything runs on OpenID4VCI and OpenID4VP standards.

There are three main parts: an **Issuer Portal** (web) where people apply for credentials, a **Verifier Portal** (web) where credentials get checked, and a **Mobile Wallet** (React Native) that the user carries around. We also built a face comparison service that checks whether the person claiming a credential actually matches the photo in it.

---

## Option 1 — Use the AWS server (recommended, no setup needed)

We have the whole backend deployed on AWS already. This is the easiest way to see the system working — no Docker, no config, nothing to install on your machine except the mobile wallet.

| Service | URL |
|---------|-----|
| Issuer Portal | https://breadwallet.duckdns.org |
| Verifier Portal | https://breadverfier.duckdns.org:3443 |

Admin account for the cloud server:
- Email: `adm123@123.com`
- Password: `adm123`

For the mobile wallet, just do:

```bash
cd moving_wallet
npm install
npx expo start
```

The wallet's default config already points to the AWS server, so it'll connect to the cloud backend automatically. Nothing else to change.

---

## Option 2 — Run locally

### Before you start

You need these installed:

- **Docker Desktop** — download from docker.com. Make sure you open it before running any docker commands, the icon in the taskbar needs to be green (engine running)
- **Node.js 20+** and npm
- **Expo Go** on your phone — search for it on the App Store or Google Play
- Your phone and computer on the same Wi-Fi network (for expo)

---

### Step 1 — Start all backend services

Copy the env.example into .env file:

```bash
cp .env.example .env
```

Then just run this one command from the repo root:

```bash
docker compose up -d
```

No config files to edit — all defaults are already baked in. This starts 7 containers: issuer portal, verifier portal, Walt.id APIs, wallet API, and the face comparison service. First time will take a few minutes to pull the images.

After it's up:

| Service | URL |
|---------|-----|
| Issuer Portal | http://localhost |
| Verifier Portal | http://localhost:3000 |
| Walt.id Wallet API | http://localhost:7001 |

Give it about 30–60 seconds before opening anything — the Walt.id services are Java-based and take a moment to fully start.

To stop everything:

```bash
docker compose down
```

---

### Step 2 — Start the mobile wallet

If you are running the app for the first time, you will need to use npm install command, otherwise, just cd to the target directory and run npx expo start:

```bash
cd moving_wallet
npm install
npx expo start
```

A QR code appears in the terminal. Open Expo Go on your phone and scan it. The wallet loads up — no IP configuration needed, it detects your machine's address on its own.

---

## How to demo it

### Getting a credential (Issuer flow)

**1. Register an account**

Go to the Issuer Portal and click Register. Fill in your details and choose your role:

- **User** — no extra fields needed
- **Admin** — select Admin role and enter the admin secret key: `cyleonadm`

Then log in.

**2. Apply for a credential**

Click **Apply for Credential**. Pick a type from the dropdown — NationalID or ProofOfAge are good starting points. Fill in the form. For NationalID, there's also a face photo step where you take a photo through the browser camera.

**3. Approve it as admin**

Open a new browser window (incognito works well) and log in with the admin account:

| Email | `admin@123.com` |
|-------|-----------------|
| Password | `admin123` |

In the admin dashboard you'll see the pending application. Click into it and hit **Approve**.

If SMTP email isn't set up, you can find the credential offer QR code directly on the application detail page — no email needed.

**4. Receive it in the wallet**

In the wallet app, tap the scan button at the bottom. Scan the QR code from the admin page.

If the credential has a face photo (NationalID, mDL, Passport, etc.), a camera screen will open. Line up your face in the oval shape and tap Verify. The face service compares your live selfie against the stored photo — if it matches the credential gets saved, if not it gets rejected automatically.

The credential will now show in your wallet with an assurance level badge: **High**, **Substantial**, or **Low**.

---

### Presenting a credential (Verifier flow)

1. Go to the Verifier Portal and pick a scenario card — **Bank Onboarding** or **Border Check** are the clearest ones for a demo
2. A QR code shows on screen
3. In the wallet, tap scan and scan it — a consent screen opens showing what the verifier is requesting

> **Note:** Each QR code is single-use. If the scan fails for any reason, go back to the Verifier Portal and click the scenario card again to generate a fresh QR before trying again.

4. Fields with a lock icon are required. Fields with an eye icon are optional — you can toggle them off if you don't want to share that info
5. Tap the share button to submit
6. The verifier page updates to show **Access Granted** with the disclosed fields, or a rejection message if something doesn't pass (e.g. user is under 18 for the bank scenario)

---

### Quick test with demo credentials

If you want to skip the full issuance flow and just test the presentation side, tap **Load Demo Credentials** on the wallet home screen. It loads some pre-built credentials so you can jump straight to scanning a verifier QR.

---

## Credential types

14 types are supported: NationalID, mDL, ProofOfAge, AddressCredential, HealthInsuranceCard, StudentID, VehicleRegistration, ProfessionalLicense, PassportCredential, SocialSecurityCredential, BankAccountCredential, EmploymentCredential, VaccinationCredential, DisabilityCredential.

The high-assurance ones (NationalID, mDL, Passport) require a face photo during the application.

---

## Running the API tests

There are automated tests for the Verifier backend API in the `test/` folder at the repo root.

### Prerequisites

The verifier backend must be running before you run the tests. The quickest way is to start it directly with ts-node:

```bash
cd eudi_verifier/backend
npm install
npx ts-node-dev --transpile-only src/index.ts
```

Alternatively, if you already have the full Docker stack up (`docker compose up -d`), the verifier backend on port 5000 is already running and you can skip the above.

### Run the tests

From the repo root:

```bash
node test/run_all.js
```

### What gets tested

| File | Endpoints covered |
|------|-------------------|
| `test_health.js` | `GET /health` — checks the server is up and returns `{ status: "ok" }` |
| `test_scenarios.js` | `GET /api/verify/scenarios` — checks all expected scenario keys exist and have labels |
| `test_session.js` | `POST /api/verify/start` with a bad scenario (expects 400), `GET /api/verify/status/:id` with a fake session (expects 404), `POST /api/verify/face-check` with missing params (expects 400), `POST /api/verify/callback` (expects 200) |

Note: the tests that call `/start` with a valid scenario are not included because that endpoint needs the Walt.id service running. The tests above only cover what works with the standalone backend.

---

## Project structure

```
9900/
├── moving_wallet/         React Native wallet app (Expo)
├── eudi_issuer/
│   ├── backend/           Express + SQLite API (port 4000)
│   └── frontend/          React web portal (port 80)
├── eudi_verifier/
│   ├── backend/           Express API (port 5000)
│   └── frontend/          React web portal (port 3000)
├── face_service/          Python/Flask face comparison (port 5010)
├── docker-compose.yml         local setup
└── docker-compose.prod.yml    AWS deployment
```

---

*UNSW COMP9900 — Team 9900-T09A-BREAD*
