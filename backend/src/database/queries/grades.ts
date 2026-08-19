import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export interface GradeRow {
  id: string;
  course_id: string;
  student_id: string;
  assignment_id: string | null;
  title: string;
  category: string | null;
  score: string | number;
  max_score: string | number;
  weight: string | number;
  graded_on: string;
  notes: string | null;
  attachment_name?: string | null;
  attachment_data?: string | null;
  attachment_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradeDTO {
  id: string;
  courseId: string;
  studentId: string;
  assignmentId: string | null;
  title: string;
  category: string | null;
  score: number;
  maxScore: number;
  weight: number;
  gradedOn: string;
  notes: string | null;
  attachmentName?: string | null;
  attachmentData?: string | null;
  attachmentUrl?: string | null;
}

export function toGradeDTO(row: GradeRow): GradeDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    assignmentId: row.assignment_id,
    title: row.title,
    category: row.category,
    score: Number(row.score),
    maxScore: Number(row.max_score),
    weight: Number(row.weight),
    gradedOn: row.graded_on,
    notes: row.notes,
    attachmentName: row.attachment_name,
    attachmentData: row.attachment_data,
    attachmentUrl: row.attachment_url,
  };
}

export const gradeQueries = {
  async listByCourse(courseId: string) {
    if (await testConnection()) {
      return pool.query<GradeRow>(
        'SELECT * FROM grades WHERE course_id = $1 ORDER BY graded_on DESC, created_at DESC',
        [courseId]
      );
    }
    const db = getLocalDb();
    if (!db.grades) db.grades = [];

    // Deduplicar registros idénticos por tarea/actividad y alumno
    const seen = new Set<string>();
    const uniqueGrades: GradeRow[] = [];
    for (const g of db.grades) {
      const key = `${g.course_id}_${g.student_id}_${g.assignment_id || g.title}_${g.category || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueGrades.push(g);
      }
    }
    db.grades = uniqueGrades;

    const list = db.grades.filter((g) => g.course_id === courseId);
    return { rows: list, rowCount: list.length };
  },

  async listByCourseAndStudent(courseId: string, studentId: string) {
    if (await testConnection()) {
      return pool.query<GradeRow>(
        'SELECT * FROM grades WHERE course_id = $1 AND student_id = $2 ORDER BY graded_on DESC',
        [courseId, studentId]
      );
    }
    const db = getLocalDb();
    if (!db.grades) db.grades = [];
    const list = db.grades.filter((g) => g.course_id === courseId && g.student_id === studentId);
    return { rows: list, rowCount: list.length };
  },

  async findById(id: string) {
    if (await testConnection()) {
      return pool.query<GradeRow>('SELECT * FROM grades WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    if (!db.grades) db.grades = [];
    const g = db.grades.find((x) => x.id === id);
    return { rows: g ? [g] : [], rowCount: g ? 1 : 0 };
  },

  async create(
    courseId: string,
    data: {
      studentId: string;
      assignmentId?: string | null;
      title: string;
      category?: string | null;
      score: number;
      maxScore: number;
      weight?: number;
      gradedOn: string;
      notes?: string | null;
      attachmentName?: string | null;
      attachmentData?: string | null;
      attachmentUrl?: string | null;
    }
  ) {
    if (await testConnection()) {
      try {
        return await pool.query<GradeRow>(
          `INSERT INTO grades
             (course_id, student_id, assignment_id, title, category, score, max_score, weight, graded_on, notes, attachment_name, attachment_data, attachment_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING *`,
          [
            courseId,
            data.studentId,
            data.assignmentId ?? null,
            data.title,
            data.category ?? null,
            data.score,
            data.maxScore,
            data.weight ?? 1,
            data.gradedOn,
            data.notes ?? null,
            data.attachmentName ?? null,
            data.attachmentData ?? null,
            data.attachmentUrl ?? null,
          ]
        );
      } catch (e: any) {
        if (e?.code === '23514') {
          throw Object.assign(new Error('Invalid grade values'), { status: 400 });
        }
        throw e;
      }
    }
    const db = getLocalDb();
    if (!db.grades) db.grades = [];

    // Si ya existe una nota para este estudiante y la misma tarea o examen, actualizarla en lugar de duplicarla
    const existingIndex = db.grades.findIndex(
      (g) =>
        g.course_id === courseId &&
        g.student_id === data.studentId &&
        ((data.assignmentId && g.assignment_id === data.assignmentId) ||
          (!data.assignmentId && g.title.toLowerCase().trim() === data.title.toLowerCase().trim()))
    );

    if (existingIndex >= 0) {
      db.grades[existingIndex] = {
        ...db.grades[existingIndex],
        title: data.title,
        category: data.category ?? db.grades[existingIndex].category,
        score: data.score,
        max_score: data.maxScore,
        weight: data.weight ?? db.grades[existingIndex].weight,
        graded_on: data.gradedOn || new Date().toISOString(),
        notes: data.notes ?? db.grades[existingIndex].notes,
        attachment_name: data.attachmentName ?? db.grades[existingIndex].attachment_name,
        attachment_data: data.attachmentData ?? db.grades[existingIndex].attachment_data,
        attachment_url: data.attachmentUrl ?? db.grades[existingIndex].attachment_url,
        updated_at: new Date().toISOString(),
      };
      saveLocalDb();
      return { rows: [db.grades[existingIndex]], rowCount: 1 };
    }

    const newGrade: GradeRow = {
      id: crypto.randomUUID(),
      course_id: courseId,
      student_id: data.studentId,
      assignment_id: data.assignmentId ?? null,
      title: data.title,
      category: data.category ?? 'Trabajo Cotidiano (50%)',
      score: data.score,
      max_score: data.maxScore,
      weight: data.weight ?? 1,
      graded_on: data.gradedOn || new Date().toISOString(),
      notes: data.notes ?? null,
      attachment_name: data.attachmentName ?? null,
      attachment_data: data.attachmentData ?? null,
      attachment_url: data.attachmentUrl ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.grades.unshift(newGrade);
    saveLocalDb();
    return { rows: [newGrade], rowCount: 1 };
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      category: string | null;
      score: number;
      maxScore: number;
      weight: number;
      gradedOn: string;
      notes: string | null;
    }>
  ) {
    if (await testConnection()) {
      const map: Record<string, string> = {
        title: 'title',
        category: 'category',
        score: 'score',
        maxScore: 'max_score',
        weight: 'weight',
        gradedOn: 'graded_on',
        notes: 'notes',
      };
      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;
      for (const [k, v] of Object.entries(data)) {
        if (v === undefined) continue;
        const col = map[k];
        if (!col) continue;
        fields.push(`${col} = $${i++}`);
        values.push(v);
      }
      if (fields.length === 0) return this.findById(id);
      values.push(id);
      try {
        return await pool.query<GradeRow>(
          `UPDATE grades SET ${fields.join(', ')}, updated_at = NOW()
           WHERE id = $${i} RETURNING *`,
          values
        );
      } catch (e: any) {
        if (e?.code === '23514') {
          throw Object.assign(new Error('Invalid grade values'), { status: 400 });
        }
        throw e;
      }
    }
    const db = getLocalDb();
    const idx = db.grades.findIndex((x) => x.id === id);
    if (idx === -1) return { rows: [], rowCount: 0 };
    db.grades[idx] = {
      ...db.grades[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    saveLocalDb();
    return { rows: [db.grades[idx]], rowCount: 1 };
  },

  async delete(id: string) {
    if (await testConnection()) {
      return pool.query('DELETE FROM grades WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    db.grades = db.grades.filter((x) => x.id !== id);
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },
};
