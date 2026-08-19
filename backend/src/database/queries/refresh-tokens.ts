import type { PoolClient } from 'pg';
import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  revoked: boolean;
  expires_at: string;
  created_at: string;
}

export const refreshTokenQueries = {
  async insert(
    client: PoolClient | typeof pool,
    data: { userId: string; tokenHash: string; expiresAt: Date }
  ) {
    if (await testConnection()) {
      return client.query<RefreshTokenRow>(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.userId, data.tokenHash, data.expiresAt]
      );
    }
    const db = getLocalDb();
    if (!db.refresh_tokens) db.refresh_tokens = [];
    const item: RefreshTokenRow = {
      id: crypto.randomUUID(),
      user_id: data.userId,
      token_hash: data.tokenHash,
      revoked: false,
      expires_at: data.expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    };
    db.refresh_tokens.push(item);
    saveLocalDb();
    return { rows: [item], rowCount: 1 };
  },

  async findByHash(tokenHash: string) {
    if (await testConnection()) {
      return pool.query<RefreshTokenRow>(
        `SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
        [tokenHash]
      );
    }
    const db = getLocalDb();
    if (!db.refresh_tokens) db.refresh_tokens = [];
    const item = db.refresh_tokens.find((t) => t.token_hash === tokenHash);
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  },

  async revoke(tokenHash: string) {
    if (await testConnection()) {
      return pool.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
        [tokenHash]
      );
    }
    const db = getLocalDb();
    if (!db.refresh_tokens) db.refresh_tokens = [];
    const item = db.refresh_tokens.find((t) => t.token_hash === tokenHash);
    if (item) item.revoked = true;
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },

  async revokeAllForUser(userId: string) {
    if (await testConnection()) {
      return pool.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
        [userId]
      );
    }
    const db = getLocalDb();
    if (!db.refresh_tokens) db.refresh_tokens = [];
    db.refresh_tokens.forEach((t) => {
      if (t.user_id === userId) t.revoked = true;
    });
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },
};
