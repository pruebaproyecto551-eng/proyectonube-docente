import type { PoolClient } from 'pg';
import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  avatar_url: string | null;
  is_active: boolean;
  must_change_password?: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRow['role'];
  avatarUrl: string | null;
  mustChangePassword?: boolean;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    mustChangePassword: row.must_change_password ?? (row.role === 'student'),
  };
}

export const userQueries = {
  async findByEmail(email: string) {
    if (await testConnection()) {
      return pool.query<UserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    }
    const db = getLocalDb();
    const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
  },

  async findById(id: string) {
    if (await testConnection()) {
      return pool.query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    }
    const db = getLocalDb();
    const u = db.users.find((x) => x.id === id);
    return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
  },

  async updatePassword(id: string, passwordHash: string) {
    if (await testConnection()) {
      return pool.query<UserRow>(
        `UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [passwordHash, id]
      );
    }
    const db = getLocalDb();
    const u = db.users.find((x) => x.id === id);
    if (u) {
      u.password_hash = passwordHash;
      u.must_change_password = false;
      u.updated_at = new Date().toISOString();
      saveLocalDb();
      return { rows: [u], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  },

  async updateProfile(id: string, data: { fullName?: string; avatarUrl?: string | null }) {
    if (await testConnection()) {
      return pool.query<UserRow>(
        `UPDATE users SET full_name = COALESCE($1, full_name), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING *`,
        [data.fullName ?? null, data.avatarUrl ?? null, id]
      );
    }
    const db = getLocalDb();
    const u = db.users.find((x) => x.id === id);
    if (u) {
      if (data.fullName !== undefined) u.full_name = data.fullName;
      if (data.avatarUrl !== undefined) u.avatar_url = data.avatarUrl;
      u.updated_at = new Date().toISOString();
      saveLocalDb();
      return { rows: [u], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  },

  async createTeacher(
    client: PoolClient,
    data: { email: string; passwordHash: string; fullName: string }
  ) {
    if (await testConnection()) {
      return client.query<UserRow>(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'teacher')
         RETURNING *`,
        [data.email, data.passwordHash, data.fullName]
      );
    }
    const db = getLocalDb();
    const newUser: UserRow = {
      id: crypto.randomUUID(),
      email: data.email,
      password_hash: data.passwordHash,
      full_name: data.fullName,
      role: 'teacher',
      avatar_url: null,
      is_active: true,
      must_change_password: false,
      email_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveLocalDb();
    return { rows: [newUser], rowCount: 1 };
  },

  async create(
    email: string,
    passwordHash: string,
    fullName: string,
    role: 'admin' | 'teacher' | 'student'
  ) {
    if (await testConnection()) {
      return pool.query<UserRow>(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [email, passwordHash, fullName, role]
      );
    }
    const db = getLocalDb();
    const newUser: UserRow = {
      id: crypto.randomUUID(),
      email,
      password_hash: passwordHash,
      full_name: fullName,
      role,
      avatar_url: null,
      is_active: true,
      must_change_password: role === 'student',
      email_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveLocalDb();
    return { rows: [newUser], rowCount: 1 };
  },
};

export const teacherQueries = {
  async findByUserId(userId: string) {
    if (await testConnection()) {
      return pool.query<{ id: string; user_id: string }>(
        'SELECT id, user_id FROM teachers WHERE user_id = $1',
        [userId]
      );
    }
    const db = getLocalDb();
    let t = db.teachers.find((x) => x.user_id === userId);
    if (!t) {
      // Auto-generar perfil docente si no existe
      t = {
        id: crypto.randomUUID(),
        user_id: userId,
        employee_number: `MEP-${Math.floor(10000 + Math.random() * 90000)}`,
        department: 'Docencia General',
        phone: '+506 8000-0000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.teachers.push(t);
      saveLocalDb();
    }
    return { rows: [t], rowCount: 1 };
  },

  async create(client: PoolClient, userId: string) {
    if (await testConnection()) {
      return client.query<{ id: string; user_id: string }>(
        `INSERT INTO teachers (user_id) VALUES ($1) RETURNING id, user_id`,
        [userId]
      );
    }
    const db = getLocalDb();
    const newT = {
      id: crypto.randomUUID(),
      user_id: userId,
      employee_number: `MEP-${Math.floor(10000 + Math.random() * 90000)}`,
      department: 'Docencia General',
      phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.teachers.push(newT);
    saveLocalDb();
    return { rows: [newT], rowCount: 1 };
  },
};
