# Axis Housing Mobile App

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

The mobile app connects to the Axis backend via `EXPO_PUBLIC_API_URL` in `.env`.

The default — and production — backend is the permanent Render deployment:

```bash
EXPO_PUBLIC_API_URL=https://afodabohousing.onrender.com
```

This is already set in `.env` and shipped config. Render provides a public HTTPS
endpoint, so no tunnel is needed.

### Optional: Local development with ngrok (not part of the normal workflow)

> Historical/local-dev reference only. Only relevant if you run the backend
> locally on your machine instead of using the Render deployment. The shipped
> `.env` always points at Render; do not use ngrok for production.

To test against a local backend, the mobile app on a physical device cannot reach
`localhost`, so a public tunnel is required:

1. Start the backend locally and expose it:
   ```bash
   cd backend
   .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
   ngrok http 8000
   ```
2. Temporarily point `.env` at the tunnel URL:
   ```bash
   EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.dev
   ```
3. Re-register the Pesapal IPN against the tunnel URL (see "Pesapal Payment Flow").

When done, restore `.env` to the Render URL.

## Pesapal Payment Flow

The app uses Pesapal API 3.0 for property boosts and manager subscriptions.

### How It Works

1. User selects a boost package and proceeds to payment
2. App calls `POST /boosts/initiate` with `callback_url` = `EXPO_PUBLIC_API_URL`
3. Backend creates a Pesapal order and returns a `redirect_url`
4. App opens `redirect_url` in an in-app browser (expo-web-browser)
5. User completes payment on Pesapal
6. Pesapal calls the backend IPN (`/payments/webhook/pesapal`) → backend updates payment status
7. Pesapal redirects user to `callback_url/payment/status` → frontend/mobile polls `/payments/pesapal/status`

### Production Wiring

| Component | Production Value |
|-----------|------------------|
| Backend URL | https://afodabohousing.onrender.com |
| `EXPO_PUBLIC_API_URL` | https://afodabohousing.onrender.com |
| Pesapal IPN URL | https://afodabohousing.onrender.com/payments/webhook/pesapal |
| Pesapal Callback URL | https://afodabohousing.onrender.com/payment/status |

The IPN is registered once with Pesapal against the Render URL:

```bash
# Run from backend directory
python backend/scripts/register_ipn.py https://afodabohousing.onrender.com/payments/webhook/pesapal
```

This stores the `ipn_id` in the `pesapal_config` table so boost/subscription calls reuse it.

<!-- Local (ngrok) dev only, optional: the IPN URL must be re-registered every time ngrok restarts.
python backend/scripts/register_ipn.py https://YOUR_NGROK_URL/payments/webhook/pesapal
-->

### Payment Testing Checklist

- [ ] Backend reachable at https://afodabohousing.onrender.com/health
- [ ] `EXPO_PUBLIC_API_URL` in mobile `.env` = `https://afodabohousing.onrender.com`
- [ ] IPN registered against the Render URL (see command above)
- [ ] Pesapal credentials set in backend `.env` (`PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_ENVIRONMENT=live`)
- [ ] Test subscription/boost initiated → Pesapal page opens in app

## Project Structure

```
MobileAppAfodabo_v2/ (renamed: MobileAppAfodabo/ in a future rename)
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
| `EXPO_PUBLIC_API_URL` | Yes | Backend base URL (Render deployment by default) |
| `EXPO_PUBLIC_PESAPAL_CALLBACK_URL` | No | Override callback URL for Pesapal (defaults to `EXPO_PUBLIC_API_URL`) |

## Troubleshooting

### App can't reach backend
- Verify backend health: `  curl https://afodabohousing.onrender.com/health`
- Check `.env` has `EXPO_PUBLIC_API_URL=https://afodabohousing.onrender.com`
- Restart Metro bundler: `bun run start --clear`

### Payment doesn't complete
- Verify IPN registered: `python backend/scripts/register_ipn.py https://afodabohousing.onrender.com/payments/webhook/pesapal`
- Check backend logs for Pesapal webhook hits
- Ensure `PESAPAL_IPN_URL` in backend `.env` (if set) matches the registered Render URL

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