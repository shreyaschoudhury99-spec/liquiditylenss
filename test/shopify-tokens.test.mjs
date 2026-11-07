import test from "node:test";
import assert from "node:assert/strict";
import { createShopifyTokenManager, shopifyTokenFields, isShopifyLegacyTokenError } from "../integrations/shopify-tokens.mjs";

const now = 1_800_000_000_000;
const enc = value => `encrypted:${value}`;
const dec = value => value.slice("encrypted:".length);
const pair = { access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600, scope: "read_products" };

function harness(overrides = {}, response = new Response(JSON.stringify(pair))) {
  const row = { external_account: "test-store.myshopify.com", access_token_enc: enc("old-access"), refresh_token_enc: null, token_expires_at: null, ...overrides };
  const queries = [], requests = [];
  let released = false;
  const client = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes("SELECT")) return { rows: [row] };
      return { rows: [] };
    },
    release() { released = true; },
  };
  const manager = createShopifyTokenManager({
    pool: { connect: async () => client }, encrypt: enc, decrypt: dec,
    env: { SHOPIFY_CLIENT_ID: "test-client", SHOPIFY_CLIENT_SECRET: "test-secret" }, now: () => now,
    request: async (url, options) => { requests.push({ url, options }); return response; },
  });
  return { manager, queries, requests, released: () => released };
}

test("legacy-token rejection is distinct from missing scope", () => {
  assert.equal(isShopifyLegacyTokenError(403, "[API] Non-expiring access tokens are no longer accepted for the Admin API. link"), true);
  assert.equal(isShopifyLegacyTokenError(403, "Access denied for read_products"), false);
  assert.equal(isShopifyLegacyTokenError(500, "Non-expiring access tokens are no longer accepted for the Admin API"), false);
});

test("fresh access does not rotate a custom or unexpired token", async () => {
  for (const overrides of [{}, { token_expires_at: new Date(now + 3600_000), refresh_token_enc: enc("refresh") }]) {
    const h = harness(overrides);
    assert.equal((await h.manager("user")).accessToken, "old-access");
    assert.equal(h.requests.length, 0);
    assert.ok(h.released());
  }
});

test("expired access refreshes and persists the replacement pair encrypted", async () => {
  const h = harness({ token_expires_at: new Date(now - 1000), refresh_token_enc: enc("old-refresh") });
  assert.equal((await h.manager("user")).accessToken, "new-access");
  assert.equal(h.requests[0].options.body.get("grant_type"), "refresh_token");
  assert.equal(h.requests[0].options.body.get("refresh_token"), "old-refresh");
  const update = h.queries.find(q => q.sql.startsWith("UPDATE"));
  assert.deepEqual(update.values.slice(1, 4), [enc("new-access"), enc("new-refresh"), new Date(now + 3600_000)]);
  assert.equal(h.queries.at(-1).sql, "COMMIT");
});

test("rejected non-expiring token migrates with Shopify's offline exchange grant", async () => {
  const h = harness();
  assert.equal((await h.manager("user", { rejectedToken: "old-access", migrateLegacy: true })).accessToken, "new-access");
  const { url, options } = h.requests[0];
  assert.equal(url, "https://test-store.myshopify.com/admin/oauth/access_token");
  assert.equal(options.body.get("grant_type"), "urn:ietf:params:oauth:grant-type:token-exchange");
  assert.equal(options.body.get("expiring"), "1");
  assert.equal(options.body.get("subject_token"), "old-access");
  assert.equal(options.body.get("requested_token_type"), "urn:shopify:params:oauth:token-type:offline-access-token");
});

test("a concurrent renewal's replacement is reused without rotating it again", async () => {
  const h = harness({ access_token_enc: enc("other-new-token"), token_expires_at: new Date(now + 3600_000), refresh_token_enc: enc("other-refresh") });
  assert.equal((await h.manager("user", { rejectedToken: "old-access", migrateLegacy: true })).accessToken, "other-new-token");
  assert.equal(h.requests.length, 0);
});

test("invalid refresh rolls back, preserves saved credentials and requests reconnect", async () => {
  const h = harness({ token_expires_at: new Date(now - 1000), refresh_token_enc: enc("expired-refresh") }, new Response('{"error":"invalid_request"}', { status: 401 }));
  await assert.rejects(h.manager("user"), { code: "SHOPIFY_REAUTH_REQUIRED" });
  assert.ok(!h.queries.some(q => q.sql.startsWith("UPDATE")));
  assert.equal(h.queries.at(-1).sql, "ROLLBACK");
  assert.ok(h.released());
});

test("temporary token service failures do not overwrite credentials or demand reconnect", async () => {
  for (const [status, code] of [[429, "SHOPIFY_RATE_LIMITED"], [503, "SHOPIFY_API_ERROR"]]) {
    const h = harness({ token_expires_at: new Date(now - 1000), refresh_token_enc: enc("refresh") }, new Response('{}', { status }));
    await assert.rejects(h.manager("user"), { code });
    assert.ok(!h.queries.some(q => q.sql.startsWith("UPDATE")));
    assert.ok(h.released());
  }
});

test("incomplete token responses never overwrite working credentials", async () => {
  const h = harness({}, new Response('{"access_token":"incomplete"}'));
  await assert.rejects(h.manager("user", { rejectedToken: "old-access", migrateLegacy: true }), { code: "SHOPIFY_REAUTH_REQUIRED" });
  assert.ok(!h.queries.some(q => q.sql.startsWith("UPDATE")));
  assert.throws(() => shopifyTokenFields({ access_token: "a", refresh_token: "r", expires_in: -1 }), { code: "SHOPIFY_REAUTH_REQUIRED" });
});

test("a saved domain cannot send credentials to an unrelated host", async () => {
  const h = harness({ external_account: "example.com", token_expires_at: new Date(now - 1000), refresh_token_enc: enc("refresh") });
  await assert.rejects(h.manager("user"), { code: "SHOPIFY_REAUTH_REQUIRED" });
  assert.equal(h.requests.length, 0);
});
