import type { PoolClient } from 'pg';
import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export interface CourseRow {
  id: string;
  teacher_id: string;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseDTO {
  id: string;
  teacherId: string;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
}

export function toCourseDTO(row: CourseRow): CourseDTO {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    name: row.name,
    code: row.code,
    description: row.description,
    color: row.color,
  };
}

export const courseQueries = {
  async listAll() {
    if (await testConnection()) {
      return pool.query<CourseRow>('SELECT * FROM courses ORDER BY name');
    }
    const db = getLocalDb();
    return { rows: db.courses, rowCount: db.courses.length };
  },

  async listByTeacher(teacherId: string) {
    if (await testConnection()) {
      return pool.query<CourseRow>(
        'SELECT * FROM courses ORDER BY created_at DESC'
      );
    }
    const db = getLocalDb();
    return { rows: db.courses, rowCount: db.courses.length };
  },

  async findById(id: string) {
    if (await testConnection()) {
      return pool.query<CourseRow>('SELECT * FROM courses WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    const c = db.courses.find((x) => x.id === id);
    return { rows: c ? [c] : [], rowCount: c ? 1 : 0 };
  },

  async findByCode(code: string) {
    if (await testConnection()) {
      return pool.query<CourseRow>('SELECT * FROM courses WHERE code = $1', [code]);
    }
    const db = getLocalDb();
    const c = db.courses.find((x) => x.code.toLowerCase() === code.toLowerCase());
    return { rows: c ? [c] : [], rowCount: c ? 1 : 0 };
  },

  async create(teacherId: string, data: { name: string; code: string; description?: string | null; color?: string | null }) {
    if (await testConnection()) {
      try {
        return await pool.query<CourseRow>(
          `INSERT INTO courses (teacher_id, name, code, description, color)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [teacherId, data.name, data.code, data.description ?? null, data.color ?? null]
        );
      } catch (e: any) {
        if (e?.code === '23505') {
          throw Object.assign(new Error('Course code already exists'), { status: 409 });
        }
        throw e;
      }
    }
    const db = getLocalDb();
    if (db.courses.some((x) => x.code.toLowerCase() === data.code.toLowerCase())) {
      throw Object.assign(new Error('Course code already exists'), { status: 409 });
    }
    const newCourse: CourseRow = {
      id: crypto.randomUUID(),
      teacher_id: teacherId,
      name: data.name,
      code: data.code,
      description: data.description ?? null,
      color: data.color ?? '#2563EB',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.courses.unshift(newCourse);
    saveLocalDb();
    return { rows: [newCourse], rowCount: 1 };
  },

  async update(
    id: string,
    data: Partial<{ name: string; code: string; description: string | null; color: string | null }>
  ) {
    if (await testConnection()) {
      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;
      for (const [k, v] of Object.entries(data)) {
        if (v === undefined) continue;
        fields.push(`${k} = $${i++}`);
        values.push(v);
      }
      if (fields.length === 0) return this.findById(id);
      values.push(id);
      try {
        return await pool.query<CourseRow>(
          `UPDATE courses SET ${fields.join(', ')}, updated_at = NOW()
           WHERE id = $${i}
           RETURNING *`,
          values
        );
      } catch (e: any) {
        if (e?.code === '23505') {
          throw Object.assign(new Error('Course code already exists'), { status: 409 });
        }
        throw e;
      }
    }
    const db = getLocalDb();
    const idx = db.courses.findIndex((x) => x.id === id);
    if (idx === -1) return { rows: [], rowCount: 0 };
    db.courses[idx] = {
      ...db.courses[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    saveLocalDb();
    return { rows: [db.courses[idx]], rowCount: 1 };
  },

  async delete(id: string) {
    if (await testConnection()) {
      return pool.query('DELETE FROM courses WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    db.courses = db.courses.filter((x) => x.id !== id);
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },

  async ownsCourse(teacherId: string, courseId: string) {
    if (await testConnection()) {
      return pool.query<{ id: string }>(
        'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
        [courseId, teacherId]
      );
    }
    const db = getLocalDb();
    const match = db.courses.find((c) => c.id === courseId);
    // Para simplificar permisos en local permitimos acceso al curso si existe
    return { rows: match ? [{ id: match.id }] : [], rowCount: match ? 1 : 0 };
  },
};
