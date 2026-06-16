# LiquidityLens Auth Setup

The app cannot sign users in when opened as `file:///.../index.html`.
Email/password, Google, and Microsoft all require the Express backend, a Postgres database, and environment variables.

## What is already implemented

- Email/password sign-up and sign-in endpoints in `server.js`
- Password reset endpoints in `server.js`
- Google and Microsoft OAuth/OIDC with state + PKCE in `server.js`
- User/session storage tables in `db/schema.sql`
- Frontend sign-in/sign-up UI in `app.js`
- Setup checker: `npm run check:auth`

## What you need to do

### 1. Install Node.js and npm

Install the current LTS version of Node.js from:

https://nodejs.org/

Then confirm these commands work:

```sh
node --version
npm --version
```

### 2. Install project dependencies

From this project folder:

```sh
cd "/Users/shreyaschoudhury/Documents/New project"
npm install
```

### 3. Create the environment file

```sh
cp .env.example .env
```

Edit `.env` and fill in real values.

You need:

```env
PORT=4174
APP_BASE_URL=http://localhost:4174
DATABASE_URL=postgres://postgres:postgres@localhost:5432/liquiditylens
JWT_SECRET=<long random string>
COOKIE_SECRET=<another long random string>
GOOGLE_CLIENT_ID=<from Google Cloud>
GOOGLE_CLIENT_SECRET=<from Google Cloud>
MICROSOFT_CLIENT_ID=<from Microsoft Entra>
MICROSOFT_CLIENT_SECRET=<from Microsoft Entra>
```

Generate secrets with:

```sh
openssl rand -base64 32
```

### 4. Set up Postgres

Install/start Postgres, create a database named `liquiditylens`, then apply the schema:

```sh
createdb liquiditylens
psql "$DATABASE_URL" -f db/schema.sql
```

If your Postgres username/password are different, update `DATABASE_URL` in `.env`.

If you see `ECONNREFUSED 127.0.0.1:5432` or `ECONNREFUSED ::1:5432`, the app is running but Postgres is not installed or not started. Install/start Postgres first, then rerun the schema command.

### 5. Create Google OAuth credentials

Google basic OAuth sign-in is normally free.

In Google Cloud Console:

- Create/select a project.
- Configure the OAuth consent screen.
- Create OAuth Client ID credentials for a Web application.
- Add this authorized redirect URI:

```text
http://localhost:4174/api/auth/oauth/google/callback
```

Put the client ID and secret into `.env`.

### 6. Create Microsoft OAuth credentials

Microsoft basic OAuth sign-in is normally free.

In Microsoft Entra admin center / Azure Portal:

- Create an App Registration.
- Add a Web redirect URI:

```text
http://localhost:4174/api/auth/oauth/microsoft/callback
```

- Create a client secret.
- Put the Application/client ID and secret into `.env`.

### 7. Stop any static server on port 4174

If a Python/static server is using port `4174`, stop it. The Express backend must own that port.

Check with:

```sh
lsof -nP -iTCP:4174 -sTCP:LISTEN
```

### 8. Run the backend

```sh
npm run dev
```

Open:

```text
http://localhost:4174
```

Do not open `index.html` directly.

### 9. Run the checker

In another terminal:

```sh
npm run check:auth
```

Fix anything marked `MISSING`.

## Production setup

For a Netlify/prod URL, also register production redirect URIs:

```text
https://<site>.netlify.app/api/auth/oauth/google/callback
https://<site>.netlify.app/api/auth/oauth/microsoft/callback
```

Then set `APP_BASE_URL` to the production URL in production environment variables.

## Do you have to pay?

Usually no for basic Google/Microsoft sign-in itself.

You may pay for:

- hosting the backend
- hosting Postgres
- a custom domain
- email sending for password resets
- higher usage tiers later

The current blocker is not payment. The blocker is that the backend, database, and OAuth credentials are not set up yet.
