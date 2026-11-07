const offlineType = "urn:shopify:params:oauth:token-type:offline-access-token";

function reauth(message = "Shopify needs to be reconnected. Click Connect Shopify to renew access.") {
  return Object.assign(new Error(message), { code: "SHOPIFY_REAUTH_REQUIRED" });
}

export function shopifyTokenFields(tokenSet, now = Date.now()) {
  const seconds = Number(tokenSet.expires_in);
  if (!tokenSet.access_token || !tokenSet.refresh_token || !Number.isFinite(seconds) || seconds <= 0) {
    throw reauth("Shopify did not return an expiring token pair. Reconnect Shopify to try again.");
  }
  return {
    accessToken: tokenSet.access_token,
    refreshToken: tokenSet.refresh_token,
    expiresAt: new Date(now + seconds * 1000),
  };
}

export function isShopifyLegacyTokenError(status, message) {
  return status === 403 && /Non-expiring access tokens are no longer accepted for the Admin API/i.test(message);
}

// Serialize renewal on the connection row, including across server processes.
// Credentials are never returned to the browser or written to logs.
export function createShopifyTokenManager({ pool, encrypt, decrypt, env = process.env, request = fetch, now = Date.now }) {
  return async function getShopifyToken(userId, { rejectedToken = null, migrateLegacy = false } = {}) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT external_account, access_token_enc, refresh_token_enc, token_expires_at
         FROM integration_connections WHERE user_id = $1 AND provider = 'shopify' FOR UPDATE`, [userId]
      );
      const stored = result.rows[0];
      if (!stored?.access_token_enc || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(stored.external_account || "")) throw reauth();
      let accessToken = decrypt(stored.access_token_enc);
      const alreadyRotated = rejectedToken && rejectedToken !== accessToken;
      const expiresSoon = stored.token_expires_at && new Date(stored.token_expires_at).getTime() <= now() + 60_000;
      const renew = expiresSoon || (rejectedToken && !alreadyRotated);
      if (renew) {
        if (!env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET) throw reauth("Shopify app credentials are required to renew access. Contact the app owner.");
        const refreshToken = stored.refresh_token_enc ? decrypt(stored.refresh_token_enc) : null;
        if (!refreshToken && !migrateLegacy) throw reauth();
        const body = new URLSearchParams({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET });
        if (refreshToken) {
          body.set("grant_type", "refresh_token");
          body.set("refresh_token", refreshToken);
        } else {
          body.set("grant_type", "urn:ietf:params:oauth:grant-type:token-exchange");
          body.set("subject_token", accessToken);
          body.set("subject_token_type", offlineType);
          body.set("requested_token_type", offlineType);
          body.set("expiring", "1");
        }
        const response = await request(`https://${stored.external_account}/admin/oauth/access_token`, {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
          body, signal: AbortSignal.timeout(20_000),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 429) throw Object.assign(new Error("Shopify rate limit reached. Try Sync again in a minute."), { code: "SHOPIFY_RATE_LIMITED" });
          if (response.status >= 500) throw Object.assign(new Error("Shopify token service is temporarily unavailable. Try Sync again shortly."), { code: "SHOPIFY_API_ERROR" });
          throw reauth();
        }
        const fields = shopifyTokenFields(data, now());
        await client.query(
          `UPDATE integration_connections SET access_token_enc = $2, refresh_token_enc = $3,
           token_expires_at = $4, scopes = COALESCE($5, scopes), updated_at = now()
           WHERE user_id = $1 AND provider = 'shopify'`,
          [userId, encrypt(fields.accessToken), encrypt(fields.refreshToken), fields.expiresAt, data.scope || null]
        );
        accessToken = fields.accessToken;
      }
      await client.query("COMMIT");
      return { shop: stored.external_account, accessToken };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };
}
