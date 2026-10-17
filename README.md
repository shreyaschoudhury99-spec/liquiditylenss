# LiquidityLink

LiquidityLink is a vanilla JavaScript frontend with an Express/Postgres auth backend.

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
createdb liquiditylink
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

For the Clover private REST Clients flow, leave `CLOVER_USE_PKCE` and `CLOVER_USE_V2` unset or set both to `false`. Only set them to `true` for a newer Clover app that explicitly requires v2 OAuth/PKCE.

For sandbox REST Clients, do not override the Clover URLs unless you need to debug a Clover environment issue. The default sandbox authorize and token hosts are `https://apisandbox.dev.clover.com/oauth/authorize` and `https://apisandbox.dev.clover.com/oauth/token`; API calls use `https://apisandbox.dev.clover.com/v3`.

## Edit website text without Codex

Sign in using Google with the website owner email (the `DEMO_REQUEST_OWNER_EMAIL` environment variable, defaulting to `shreyaschoudhury23@gmail.com`). On the public website, click **Edit website** at the bottom. Click an outlined heading, paragraph, FAQ, footer text, or statistic; enter the replacement and click **Save changes**. Saves publish immediately to all visitors. Use **Restore original** to undo a field, and **Done editing** to leave edit mode.

Edits apply to matching text on the current page and are stored in Postgres, so they survive restarts and deployments. Edit other pages by navigating to them. The live Instagram count continues to come from the connected channel. Layout, images, link destinations, and interactive app data remain code-managed. The server requires a verified owner account for every write; workspace admins and other visitors cannot publish edits.

## Free public website hosting

The public marketing pages can deploy separately as a Render Static Site using `node scripts/build-public-site.mjs` and publish directory `dist-public`. Set `SKIP_INSTALL_DEPS=true`; the exporter uses only Node built-ins. Render's `RENDER_EXTERNAL_URL` supplies the canonical origin; `PUBLIC_SITE_URL` overrides it for a custom domain. `APP_ORIGIN` defaults to the existing Render app.

Add Render **Rewrite** rules for `/api/site-content`, `/api/live-statistics`, and `/api/demo-request`, each targeting the same path on `https://liquiditylens-f536.onrender.com`. This keeps public contact forms, live channel data, and saved website text connected to the original backend. Authentication and app links open the existing app directly. The footer's **Website editor** link opens the owner editor on that app; saved copy appears on the public host when reloaded. Public HTML, styles, images, robots.txt, and sitemap remain available even while the backend sleeps. Forms and content refreshes can take longer when the backend must wake up.

Public routes export full HTML, so search engines can read the marketing content without JavaScript or the app database. Adding a new public route requires adding it to the shared app route/view map. The generator stops with an error if the app/template structure no longer supports a complete export.

Live public site: https://liquiditylink-public.onrender.com/

The backend redirects public marketing requests to this host and preserves `?edit=1` for its owner editing view. Its old sitemap redirects to the static sitemap. Set `PUBLIC_SITE_URL` on the app if moving the public host later. `/industries` now redirects to `/solutions`.
