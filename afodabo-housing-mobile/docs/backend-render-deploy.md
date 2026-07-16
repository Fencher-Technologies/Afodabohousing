# Backend Deploy To Render

This repo's mobile app expects a deployed backend API URL in `EXPO_PUBLIC_API_BASE_URL`.

As of June 20, 2026, the FastAPI backend code is on the remote Git branch `Backend`, not in the current mobile-only checkout. That backend branch includes:

- `main.py`
- `pyproject.toml`
- `/health`
- `/health/ready`

## Recommended Deploy Path

Deploy the `Backend` branch to a Render `Web Service`.

If you want Render to auto-configure from YAML, copy [render.backend.yaml](/C:/Users/Michael/Desktop/Projects/AFODABO/afodabo-housing-mobile/render.backend.yaml) into the backend branch as `render.yaml` before creating the service.

## Manual Render Settings

Use these values when creating the service:

- `Runtime`: `Python`
- `Branch`: `Backend`
- `Build Command`: `pip install .`
- `Start Command`: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- `Health Check Path`: `/health`

## Required Render Environment Variables

Add these in the Render dashboard:

- `ENVIRONMENT=production`
- `SUPABASE_URL=...`
- `SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `SECRET_KEY=...`
- `CORS_ORIGINS=["https://your-mobile-web-origin-if-needed"]`

## Notes On Env Values

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` should come from the same Supabase project the app already uses.
- `SECRET_KEY` should be a long random string.
- `CORS_ORIGINS` is parsed as a JSON array string by the backend settings model.
- `DATABASE_URL` exists in backend config, but the current `Backend` branch appears to authenticate and query through Supabase clients instead of using a direct Postgres connection for startup.

## First Deploy Smoke Check

After Render finishes, open these in the browser:

- `https://your-service.onrender.com/health`
- `https://your-service.onrender.com/`

Expected:

- `/health` returns a healthy JSON response
- `/` returns API metadata

## Connect The Mobile App

Set the project root `.env` to your live backend URL:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-service.onrender.com
```

Then restart Expo so the new env var is picked up:

```bash
npx expo start -c
```

## If Login Or Protected Screens Fail

Check these first:

- `SUPABASE_URL` matches the mobile app's real Supabase project
- `SUPABASE_ANON_KEY` matches that same project
- `SUPABASE_SERVICE_ROLE_KEY` is present and valid
- the Render service is deploying the `Backend` branch
- `/health` is up before testing the app

## Optional Next Cleanup

For an easier long-term setup, move the backend code into either:

- a dedicated backend repo, or
- a `/backend` folder on the main branch with a committed `render.yaml`

That would make future Render deploys one-click instead of branch-specific.
