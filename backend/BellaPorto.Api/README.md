# BellaPorto API Notes

## Role and profile access

The frontend signs users in with Supabase Auth, but profile and role reads should go through this backend.

Endpoints:

- `GET /api/profiles/me`
  Requires the signed-in user's bearer token.
  Returns that user's `profiles` row and normalized role.

- `GET /api/profiles`
- `GET /api/profiles/{userId}`
- `PUT /api/profiles/{userId}/role`
  Require both:
  - a valid signed-in bearer token
  - an `admin` role on the caller's profile

These admin endpoints also require the backend to have `SUPABASE_SERVICE_ROLE_KEY`, because they use server-side Supabase access and must never rely on browser credentials alone.

## Required backend environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional local fallback:

- `SUPABASE_ANON_KEY`
  Only enough for limited local development. Do not rely on it for admin profile management.

For **local `dotnet run`**, if you already use `frontend/.env` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, add a **server-only** line (do **not** use a `VITE_` prefix, or the key could be exposed to the browser):

`SUPABASE_SERVICE_ROLE_KEY=<your service role key from Supabase Dashboard → Project Settings → API>`

The API reads that value from `frontend/.env` when process environment variables are not set, so user management and role changes work the same as on the deployed backend.

Optional emergency override:

- `KNOWN_ADMIN_EMAILS`
  Comma-separated emails that should be treated as admins if a profile row is missing a role. This is only a safety net and should stay minimal.

## Expected Supabase profile shape

The backend expects a `profiles` table with at least:

- `id`
- `email`
- `first_name`
- `last_name`
- `role`

Current supported roles:

- `admin`
- `donor`

## Deployment reminder

The GitHub Actions workflow deploys on pushes to `main`, so make sure Azure App Service has the backend environment variables above before merging role-management changes.
