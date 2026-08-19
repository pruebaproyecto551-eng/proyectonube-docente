import type { PoolClient } from 'pg';
import { pool } from '../connection';

export interface OAuthRow {
  id: string;
  user_id: string;
  provider: 'google' | 'microsoft';
  provider_account_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const oauthQueries = {
  findByProviderAccount(provider: 'google' | 'microsoft', providerAccountId: string) {
    return pool.query<OAuthRow>(
      'SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_account_id = $2',
      [provider, providerAccountId]
    );
  },

  upsert(
    client: PoolClient | typeof pool,
    data: {
      userId: string;
      provider: 'google' | 'microsoft';
      providerAccountId: string;
      accessToken?: string | null;
      refreshToken?: string | null;
      tokenType?: string | null;
      scope?: string | null;
      expiresAt?: Date | string | null;
    }
  ) {
    return client.query<OAuthRow>(
      `INSERT INTO oauth_accounts
         (user_id, provider, provider_account_id, access_token, refresh_token, token_type, scope, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (provider, provider_account_id)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_accounts.refresh_token),
         token_type = EXCLUDED.token_type,
         scope = EXCLUDED.scope,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()
       RETURNING *`,
      [
        data.userId,
        data.provider,
        data.providerAccountId,
        data.accessToken ?? null,
        data.refreshToken ?? null,
        data.tokenType ?? null,
        data.scope ?? null,
        data.expiresAt ?? null,
      ]
    );
  },
};
