import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';
import { attendanceQueries } from './attendance';

export type JustificationStatus = 'pending' | 'approved' | 'rejected';

export interface JustificationRow {
  id: string;
  student_id: string;
  student_name: string;
  student_number?: string;
  course_id: string;
  course_name?: string;
  absence_date: string;
  reason: string;
  file_name?: string;
  file_type?: string;
  file_data?: string; // base64 string or data uri
  status: JustificationStatus;
  teacher_comment?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JustificationDTO {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber?: string;
  courseId: string;
  courseName?: string;
  absenceDate: string;
  reason: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  status: JustificationStatus;
  teacherComment?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toJustificationDTO(row: JustificationRow): JustificationDTO {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentNumber: row.student_number,
    courseId: row.course_id,
    courseName: row.course_name,
    absenceDate: row.absence_date,
    reason: row.reason,
    fileName: row.file_name,
    fileType: row.file_type,
    fileData: row.file_data,
    status: row.status,
    teacherComment: row.teacher_comment,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const justificationQueries = {
  async list(filters?: { courseId?: string; studentId?: string; status?: string }) {
    const db: any = getLocalDb();
    if (!db.justifications) {
      db.justifications = [];
    }

    let records: JustificationRow[] = [...db.justifications];

    if (filters?.courseId) {
      records = records.filter((j: JustificationRow) => j.course_id === filters.courseId);
    }
    if (filters?.studentId) {
      records = records.filter((j: JustificationRow) => j.student_id === filters.studentId);
    }
    if (filters?.status) {
      records = records.filter((j: JustificationRow) => j.status === filters.status);
    }

    // Ordenar más recientes primero
    records.sort((a: JustificationRow, b: JustificationRow) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { rows: records, rowCount: records.length };
  },

  async findById(id: string) {
    const db: any = getLocalDb();
    if (!db.justifications) db.justifications = [];
    const record = db.justifications.find((j: JustificationRow) => j.id === id);
    return { rows: record ? [record] : [], rowCount: record ? 1 : 0 };
  },

  async create(data: {
    studentId: string;
    studentName?: string;
    studentNumber?: string;
    courseId: string;
    courseName?: string;
    absenceDate: string;
    reason: string;
    fileName?: string;
    fileType?: string;
    fileData?: string;
  }) {
    const db: any = getLocalDb();
    if (!db.justifications) db.justifications = [];

    // Enriquecer con nombres si no vienen
    let finalStudentName = data.studentName;
    let finalStudentNumber = data.studentNumber;
    if (!finalStudentName) {
      const student = db.students?.find((s: any) => s.id === data.studentId || s.user_id === data.studentId);
      if (student) {
        const user = db.users?.find((u: any) => u.id === student.user_id);
        finalStudentName = user?.full_name || 'Estudiante';
        finalStudentNumber = student.student_number || undefined;
      }
    }

    let finalCourseName = data.courseName;
    if (!finalCourseName) {
      const course = db.courses?.find((c: any) => c.id === data.courseId);
      finalCourseName = course?.name || 'Inglés CINDEA';
    }

    const newJustification: JustificationRow = {
      id: crypto.randomUUID(),
      student_id: data.studentId,
      student_name: finalStudentName || 'Estudiante CINDEA',
      student_number: finalStudentNumber || '504540188',
      course_id: data.courseId,
      course_name: finalCourseName,
      absence_date: data.absenceDate,
      reason: data.reason,
      file_name: data.fileName,
      file_type: data.fileType || 'application/octet-stream',
      file_data: data.fileData,
      status: 'pending',
      teacher_comment: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.justifications.unshift(newJustification);
    saveLocalDb();

    return { rows: [newJustification], rowCount: 1 };
  },

  async review(id: string, status: 'approved' | 'rejected', teacherComment?: string | null) {
    const db: any = getLocalDb();
    if (!db.justifications) db.justifications = [];

    const idx = db.justifications.findIndex((j: JustificationRow) => j.id === id);
    if (idx === -1) return { rows: [], rowCount: 0 };

    const current = db.justifications[idx];
    const updated: JustificationRow = {
      ...current,
      status,
      teacher_comment: teacherComment !== undefined ? teacherComment : current.teacher_comment,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.justifications[idx] = updated;
    saveLocalDb();

    // ⚡ SI SE APRUEBA LA JUSTIFICACIÓN:
    // Actualizar automáticamente la asistencia en el sistema SICIN / MEP a 'excused' (Justificada)
    if (status === 'approved') {
      try {
        await attendanceQueries.upsert(
          updated.course_id,
          updated.student_id,
          updated.absence_date,
          'excused',
          2, // 2 lecciones estándar
          `Justificación médica/oficial aprobada por la docente. Motivo: ${updated.reason.slice(0, 100)}`
        );
      } catch (err) {
        console.error('[Justification] Error actualizando asistencia a justificada:', err);
      }
    }

    return { rows: [updated], rowCount: 1 };
  },

  async countPending() {
    const db: any = getLocalDb();
    if (!db.justifications) db.justifications = [];
    const count = db.justifications.filter((j: JustificationRow) => j.status === 'pending').length;
    return count;
  },

  async delete(id: string) {
    const db: any = getLocalDb();
    if (!db.justifications) db.justifications = [];
    db.justifications = db.justifications.filter((j: JustificationRow) => j.id !== id);
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },
};
