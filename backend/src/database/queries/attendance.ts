import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export type AttendanceStatusType = 
  | 'present' 
  | 'absent' 
  | 'late' 
  | 'excused'
  | 'absent_unexcused'
  | 'absent_excused'
  | 'late_unexcused'
  | 'late_excused';

export interface AttendanceRow {
  id: string;
  course_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatusType;
  lessons_count?: number;
  points_deducted?: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDTO {
  id: string;
  courseId: string;
  studentId: string;
  date: string;
  status: AttendanceStatusType;
  lessonsCount: number;
  pointsDeducted: number;
  notes: string | null;
}

export function calculatePointsDeduction(status: AttendanceStatusType, lessons: number = 2): number {
  switch (status) {
    case 'absent':
    case 'absent_unexcused':
      return Number((lessons * 1.0).toFixed(2)); // 1 punto por lección de ausencia injustificada
    case 'late':
    case 'late_unexcused':
      return Number((0.5).toFixed(2)); // 0.5 puntos por tardía injustificada
    case 'absent_excused':
    case 'excused':
    case 'late_excused':
    case 'present':
    default:
      return 0;
  }
}

export function toAttendanceDTO(row: AttendanceRow): AttendanceDTO {
  const lessons = row.lessons_count ?? 2;
  const points = row.points_deducted !== undefined ? Number(row.points_deducted) : calculatePointsDeduction(row.status, lessons);
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    date: row.date,
    status: row.status,
    lessonsCount: lessons,
    pointsDeducted: points,
    notes: row.notes,
  };
}

export const attendanceQueries = {
  async listByCourse(courseId: string, date?: string) {
    if (await testConnection()) {
      if (date) {
        return pool.query<AttendanceRow>(
          'SELECT * FROM attendance WHERE course_id = $1 AND date = $2 ORDER BY student_id',
          [courseId, date]
        );
      }
      return pool.query<AttendanceRow>(
        'SELECT * FROM attendance WHERE course_id = $1 ORDER BY date DESC, student_id',
        [courseId]
      );
    }
    const db = getLocalDb();
    let records = db.attendance.filter((a) => a.course_id === courseId);
    if (date) {
      records = records.filter((a) => a.date === date);
    }
    return { rows: records, rowCount: records.length };
  },

  async listByStudent(studentId: string) {
    if (await testConnection()) {
      return pool.query<AttendanceRow>(
        'SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC',
        [studentId]
      );
    }
    const db = getLocalDb();
    const records = db.attendance.filter((a) => a.student_id === studentId);
    return { rows: records, rowCount: records.length };
  },

  async findById(id: string) {
    if (await testConnection()) {
      return pool.query<AttendanceRow>('SELECT * FROM attendance WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    const a = db.attendance.find((x) => x.id === id);
    return { rows: a ? [a] : [], rowCount: a ? 1 : 0 };
  },

  async upsert(
    courseId: string,
    studentId: string,
    date: string,
    status: AttendanceStatusType,
    lessonsCount: number = 2,
    notes?: string | null
  ) {
    const pointsDeducted = calculatePointsDeduction(status, lessonsCount);
    if (await testConnection()) {
      try {
        return await pool.query<AttendanceRow>(
          `INSERT INTO attendance (course_id, student_id, date, status, notes)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (course_id, student_id, date)
           DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW()
           RETURNING *`,
          [courseId, studentId, date, status, notes ?? null]
        );
      } catch (_) {
        // Fallback
      }
    }
    const db = getLocalDb();
    const existingIdx = db.attendance.findIndex(
      (a) => a.course_id === courseId && a.student_id === studentId && a.date === date
    );
    const updatedRecord: AttendanceRow = {
      id: existingIdx !== -1 ? db.attendance[existingIdx].id : crypto.randomUUID(),
      course_id: courseId,
      student_id: studentId,
      date,
      status,
      lessons_count: lessonsCount,
      points_deducted: pointsDeducted,
      notes: notes ?? null,
      created_at: existingIdx !== -1 ? db.attendance[existingIdx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (existingIdx !== -1) {
      db.attendance[existingIdx] = updatedRecord;
    } else {
      db.attendance.push(updatedRecord);
    }
    saveLocalDb();
    return { rows: [updatedRecord], rowCount: 1 };
  },

  async update(
    id: string,
    data: { status?: AttendanceStatusType; lessonsCount?: number; notes?: string | null }
  ) {
    const db = getLocalDb();
    const idx = db.attendance.findIndex((x) => x.id === id);
    if (idx === -1) return { rows: [], rowCount: 0 };
    const current = db.attendance[idx];
    const newStatus = data.status ?? current.status;
    const newLessons = data.lessonsCount ?? current.lessons_count ?? 2;
    const newPoints = calculatePointsDeduction(newStatus, newLessons);

    db.attendance[idx] = {
      ...current,
      status: newStatus,
      lessons_count: newLessons,
      points_deducted: newPoints,
      notes: data.notes !== undefined ? data.notes : current.notes,
      updated_at: new Date().toISOString(),
    };
    saveLocalDb();
    return { rows: [db.attendance[idx]], rowCount: 1 };
  },

  async delete(id: string) {
    if (await testConnection()) {
      return pool.query('DELETE FROM attendance WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    db.attendance = db.attendance.filter((x) => x.id !== id);
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },
};
