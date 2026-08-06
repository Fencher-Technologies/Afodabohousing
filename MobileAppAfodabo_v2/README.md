# Afodabo Housing Mobile App

Native cross-platform mobile app built with Expo Router + React Native.

## Platform
- Native iOS & Android app, exportable to web
- Framework: Expo Router + React Native
- Language: TypeScript

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env with your backend URL (see "Backend Connection" below)

# 3. Start development server
bun run start

# 4. Open on device
# iOS: Press "i" in terminal (requires macOS + Xcode)
# Android: Press "a" in terminal (requires Android Studio)
# Web: bun run start-web
```

## Backend Connection

The mobile app connects to the Afodabo Housing backend via `EXPO_PUBLIC_API_URL` in `.env`.

### Local Development (with ngrok)

When running the backend locally on `localhost:8000`, the mobile app on a physical device cannot reach `localhost`. You need a public tunnel:

1. Start the backend locally:
   ```bash
   cd backend
   .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. Expose it with ngrok:
   ```bash
   ngrok http 8000
   # Copy the HTTPS URL (e.g. https://spiffy-unsavory-kindred.ngrok-free.dev)
   ```

3. Update `MobileAppAfodabo_v2/.env`:
   ```bash
   EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.dev
   ```

4. Restart the mobile dev server:
   ```bash
   bun run start
   ```

**Important**: The ngrok URL must be registered as the Pesapal IPN and callback URL so payments work end-to-end. See "Pesapal Payment Flow" below.

### Production (Render)

For production, point to the deployed Render backend:

```bash
EXPO_PUBLIC_API_URL=https://afodabohousing.onrender.com
```

No tunnel needed — Render provides a public HTTPS endpoint.

## Pesapal Payment Flow

The app uses Pesapal API 3.0 for property boosts and manager subscriptions.

### How It Works

1. User selects a boost package and enters their phone number
2. App calls `POST /boosts/initiate` with `callback_url` = `EXPO_PUBLIC_API_URL`
3. Backend creates a Pesapal order and returns a `redirect_url`
4. App opens `redirect_url` in an in-app browser (expo-web-browser)
5. User completes payment on Pesapal
6. Pesapal calls the backend IPN (`/payments/webhook/pesapal`) → backend updates payment status
7. Pesapal redirects user to `callback_url/payment/status` → frontend/mobile polls `/payments/pesapal/status`

### Local Development Wiring

| Component | Local Value | Render Value |
|-----------|-------------|--------------|
| Backend URL | ngrok HTTPS URL | https://afodabohousing.onrender.com |
| `EXPO_PUBLIC_API_URL` | ngrok URL | Render URL |
| Pesapal IPN URL | ngrok + `/payments/webhook/pesapal` | Render + `/payments/webhook/pesapal` |
| Pesapal Callback URL | ngrok + `/payment/status` | Render + `/payment/status` |

**Critical**: The ngrok URL must be registered with Pesapal as the IPN endpoint before testing locally.

```bash
# Run from backend directory
python scripts/register_ipn.py https://YOUR_NGROK_URL/payments/webhook/pesapal
```

This stores the `ipn_id` in the local DB so boost/subscription calls reuse it.

### Payment Testing Checklist

- [ ] Backend running locally on `:8000`
- [ ] ngrok tunnel active, URL in `.env`
- [ ] IPN registered for ngrok URL
- [ ] `EXPO_PUBLIC_API_URL` in mobile `.env` matches ngrok URL
- [ ] Pesapal credentials set in backend `.env` (`PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_ENVIRONMENT=live`)
- [ ] Test subscription/boost initiated → Pesapal page opens in app

## Project Structure

```
MobileAppAfodabo_v2/
├── app/                    # App screens (Expo Router)
│   ├── (tabs)/            # Tab navigation screens
│   ├── boost-property.tsx # Property boost with Pesapal
│   └── ...
├── constants/
│   ├── config.ts          # API_BASE_URL from env
│   └── theme.ts           # Design tokens
├── src/
│   ├── lib/api-client.ts  # Authenticated fetch wrapper
│   ├── services/
│   │   └── boosts.ts      # Boost API calls (sends callback_url)
│   ├── types.ts           # TypeScript interfaces
│   └── ...
├── .env                   # Local config (gitignored)
├── .env.example           # Template for env vars
└── package.json
```

## Key Files

- `constants/config.ts` — Reads `EXPO_PUBLIC_API_URL`, throws if missing
- `src/services/boosts.ts` — `initiateBoost(propertyId, days, callbackUrl)` — sends `callback_url` so Pesapal redirect returns to a reachable URL
- `app/boost-property.tsx` — Opens Pesapal `redirect_url` via `expo-web-browser`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend base URL (ngrok for local, Render for prod) |
| `EXPO_PUBLIC_PESAPAL_CALLBACK_URL` | No | Override callback URL for Pesapal (defaults to `EXPO_PUBLIC_API_URL`) |

## Troubleshooting

### App can't reach backend
- Verify ngrok tunnel is running: `curl https://YOUR_NGROK_URL/health/ready`
- Check `.env` has the correct `EXPO_PUBLIC_API_URL`
- Restart Metro bundler: `bun run start --clear`

### Payment doesn't complete
- Verify IPN registered: `python backend/scripts/register_ipn.py https://NGROK_URL/payments/webhook/pesapal`
- Check backend logs for Pesapal webhook hits
- Ensure `PESAPAL_IPN_URL` in backend `.env` matches the registered ngrok URL

### Phone number format
The app expects Ugandan numbers as `07XXXXXXXXX` or `2567XXXXXXXXX`. Backend normalizes to `+2567XXXXXXXXX` (exactly 9 digits after country code).

## Deployment

```bash
# Build for app stores
bun i -g @expo/eas-cli
eas build:configure
eas build --platform ios
eas build --platform android

# Submit
eas submit --platform ios
eas submit --platform android
```

## Tech Stack

- Expo Router (file-based routing)
- React Native 0.81 / Expo 54
- TypeScript
- TanStack Query (server state)
- expo-web-browser (Pesapal payments)
- Lucide React Native (icons)