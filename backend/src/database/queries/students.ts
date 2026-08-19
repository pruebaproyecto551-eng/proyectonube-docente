import type { PoolClient } from 'pg';
import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export interface StudentRow {
  id: string;
  user_id: string;
  student_number: string | null;
  grade_level: string | null;
  birth_date: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentDTO {
  id: string;
  userId: string;
  studentNumber: string | null;
  gradeLevel: string | null;
  birthDate: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
}

export function toStudentDTO(row: StudentRow): StudentDTO {
  return {
    id: row.id,
    userId: row.user_id,
    studentNumber: row.student_number,
    gradeLevel: row.grade_level,
    birthDate: row.birth_date,
    guardianName: row.guardian_name,
    guardianPhone: row.guardian_phone,
  };
}

export const studentQueries = {
  async listAll() {
    if (await testConnection()) {
      return pool.query<StudentRow>('SELECT * FROM students ORDER BY created_at DESC');
    }
    const db = getLocalDb();
    const seen = new Set<string>();
    const uniqueStudents: StudentRow[] = [];
    for (const s of db.students) {
      const key = (s.student_number || s.id).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueStudents.push(s);
      }
    }
    db.students = uniqueStudents;
    return { rows: uniqueStudents, rowCount: uniqueStudents.length };
  },

  async listEnrolledInTeacherCourses(teacherId: string) {
    if (await testConnection()) {
      return pool.query<StudentRow>(
        `SELECT DISTINCT s.*
         FROM students s
         LEFT JOIN enrollments e ON e.student_id = s.id
         ORDER BY s.created_at DESC`
      );
    }
    const db = getLocalDb();
    const seen = new Set<string>();
    const uniqueStudents: StudentRow[] = [];
    for (const s of db.students) {
      const key = (s.student_number || s.id).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueStudents.push(s);
      }
    }
    db.students = uniqueStudents;
    return { rows: uniqueStudents, rowCount: uniqueStudents.length };
  },

  async findById(id: string) {
    if (await testConnection()) {
      return pool.query<StudentRow>('SELECT * FROM students WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    const s = db.students.find((x) => x.id === id);
    return { rows: s ? [s] : [], rowCount: s ? 1 : 0 };
  },

  async findByCedulaOrStudentNumber(identifier: string) {
    const clean = identifier.replace(/[-\s]/g, '').toLowerCase();
    if (await testConnection()) {
      return pool.query<StudentRow>(
        `SELECT * FROM students WHERE LOWER(REPLACE(REPLACE(student_number, '-', ''), ' ', '')) = $1 OR student_number = $2`,
        [clean, identifier]
      );
    }
    const db = getLocalDb();
    const s = db.students.find((x) => {
      const num = (x.student_number || '').replace(/[-\s]/g, '').toLowerCase();
      return (
        num === clean ||
        x.student_number === identifier ||
        (x.student_number && x.student_number.toLowerCase().includes(clean))
      );
    });
    return { rows: s ? [s] : [], rowCount: s ? 1 : 0 };
  },

  async findByUserId(userId: string) {
    if (await testConnection()) {
      return pool.query<StudentRow>('SELECT * FROM students WHERE user_id = $1', [userId]);
    }
    const db = getLocalDb();
    let s = db.students.find((x) => x.user_id === userId);
    if (!s) {
      // Auto-generar perfil alumno si el usuario existe
      s = {
        id: crypto.randomUUID(),
        user_id: userId,
        student_number: `2026-${Math.floor(1000 + Math.random() * 9000)}`,
        grade_level: '10° Año',
        birth_date: '2010-01-01',
        guardian_name: 'Encargado de Familia',
        guardian_phone: '+506 8888-9999',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.students.push(s);
      saveLocalDb();
    }
    return { rows: [s], rowCount: 1 };
  },

  async create(
    client: PoolClient | typeof pool,
    data: {
      userId: string;
      studentNumber?: string | null;
      gradeLevel?: string | null;
      birthDate?: string | null;
      guardianName?: string | null;
      guardianPhone?: string | null;
    }
  ) {
    if (await testConnection()) {
      try {
        return await client.query<StudentRow>(
          `INSERT INTO students (user_id, student_number, grade_level, birth_date, guardian_name, guardian_phone)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            data.userId,
            data.studentNumber ?? null,
            data.gradeLevel ?? null,
            data.birthDate ?? null,
            data.guardianName ?? null,
            data.guardianPhone ?? null,
          ]
        );
      } catch (e: any) {
        if (e?.code === '23505') {
          throw Object.assign(new Error('Student number already exists'), { status: 409 });
        }
        throw e;
      }
    }
    const db = getLocalDb();
    const cleanNum = (data.studentNumber || '').trim();
    const existing = cleanNum ? db.students.find((s) => s.student_number === cleanNum || s.user_id === data.userId) : null;
    if (existing) {
      if (data.gradeLevel) existing.grade_level = data.gradeLevel;
      if (data.guardianPhone) existing.guardian_phone = data.guardianPhone;
      if (data.birthDate) existing.birth_date = data.birthDate;
      existing.updated_at = new Date().toISOString();
      saveLocalDb();
      return { rows: [existing], rowCount: 1 };
    }

    const newStudent: StudentRow = {
      id: crypto.randomUUID(),
      user_id: data.userId,
      student_number: data.studentNumber ?? `2026-${Math.floor(1000 + Math.random() * 9000)}`,
      grade_level: data.gradeLevel ?? '10° Año',
      birth_date: data.birthDate ?? null,
      guardian_name: data.guardianName ?? null,
      guardian_phone: data.guardianPhone ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.students.unshift(newStudent);
    saveLocalDb();
    return { rows: [newStudent], rowCount: 1 };
  },

  async update(
    id: string,
    data: Partial<{
      studentNumber: string | null;
      gradeLevel: string | null;
      birthDate: string | null;
      guardianName: string | null;
      guardianPhone: string | null;
    }>
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
        return await pool.query<StudentRow>(
          `UPDATE students SET ${fields.join(', ')}, updated_at = NOW()
           WHERE id = $${i}
           RETURNING *`,
          values
        );
      } catch (e: any) {
        if (e?.code === '23505') {
          throw Object.assign(new Error('Student number already exists'), { status: 409 });
        }
        throw e;
      }
    }
    const db = getLocalDb();
    const idx = db.students.findIndex((x) => x.id === id);
    if (idx === -1) return { rows: [], rowCount: 0 };
    db.students[idx] = {
      ...db.students[idx],
      student_number: data.studentNumber !== undefined ? data.studentNumber : db.students[idx].student_number,
      grade_level: data.gradeLevel !== undefined ? data.gradeLevel : db.students[idx].grade_level,
      birth_date: data.birthDate !== undefined ? data.birthDate : db.students[idx].birth_date,
      guardian_name: data.guardianName !== undefined ? data.guardianName : db.students[idx].guardian_name,
      guardian_phone: data.guardianPhone !== undefined ? data.guardianPhone : db.students[idx].guardian_phone,
      updated_at: new Date().toISOString(),
    };
    saveLocalDb();
    return { rows: [db.students[idx]], rowCount: 1 };
  },

  async delete(id: string) {
    if (await testConnection()) {
      await pool.query('DELETE FROM enrollments WHERE student_id = $1', [id]).catch(() => {});
      await pool.query('DELETE FROM grades WHERE student_id = $1', [id]).catch(() => {});
      await pool.query('DELETE FROM attendance WHERE student_id = $1', [id]).catch(() => {});
      return pool.query('DELETE FROM students WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    const student = db.students.find((x) => x.id === id);
    if (student) {
      db.students = db.students.filter((x) => x.id !== id);
      if (student.user_id) {
        db.users = db.users.filter((u) => u.id !== student.user_id);
      }
      db.enrollments = db.enrollments.filter((e) => e.student_id !== id);
      db.grades = db.grades.filter((g) => g.student_id !== id);
      db.attendance = db.attendance.filter((a) => a.student_id !== id);
      if (db.justifications) {
        db.justifications = db.justifications.filter((j) => j.studentId !== id);
      }
      if (db.submissions) {
        db.submissions = db.submissions.filter((s) => s.studentId !== id);
      }
      saveLocalDb();
    }
    return { rows: [], rowCount: 1 };
  },
};
