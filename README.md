# LiquidityLens

LiquidityLens is a vanilla JavaScript frontend with an Express/Postgres auth backend.

Do not open `index.html` directly for auth testing. Google, Microsoft, and email/password sign-in require the backend server.

## Run Locally

1. Install Node.js LTS.
2. Install dependencies:

```sh
npm install
```

3. Create and fill `.env`:

```sh
cp .env.example .env
```

4. Create/apply the Postgres schema:

```sh
createdb liquiditylens
psql "$DATABASE_URL" -f db/schema.sql
```

5. Start the app:

```sh
npm run dev
```

6. Open:

```text
http://localhost:4174
```

## Auth Setup

Read [AUTH_SETUP.md](AUTH_SETUP.md) for the exact Google/Microsoft OAuth, database, and environment variable steps.

To check setup status:

```sh
npm run check:auth
```

## Clover Setup

Add the Clover callback URL to your Clover developer app:

```text
http://localhost:4174/api/integrations/clover/callback
https://liquiditylens-f536.onrender.com/api/integrations/clover/callback
```

Then add `CLOVER_CLIENT_ID`, `CLOVER_CLIENT_SECRET`, and `CLOVER_ENV` to `.env` locally and to Render environment variables for production.
