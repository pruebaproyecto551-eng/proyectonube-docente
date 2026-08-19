import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_data?: string | null;
  submitted_at: string;
  status: 'submitted' | 'late' | 'graded';
  grade?: number | null;
  feedback?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubmissionDTO {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileData?: string | null;
  submittedAt: string;
  status: 'submitted' | 'late' | 'graded';
  grade: number | null;
  feedback: string | null;
}

export function toSubmissionDTO(row: SubmissionRow, studentName?: string): SubmissionDTO {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    studentName: studentName ?? 'Estudiante',
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: Number(row.file_size || 0),
    fileData: row.file_data ?? null,
    submittedAt: row.submitted_at || new Date().toISOString(),
    status: row.status || 'submitted',
    grade: row.grade !== undefined ? row.grade : null,
    feedback: row.feedback ?? null,
  };
}

export const submissionQueries = {
  async listByAssignment(assignmentId: string) {
    const db = getLocalDb();
    if (!db.submissions) db.submissions = [];
    const list = db.submissions.filter((s) => s.assignment_id === assignmentId);
    const enriched = list.map((s) => {
      const student = db.students.find((x) => x.id === s.student_id);
      const user = student ? db.users.find((u) => u.id === student.user_id) : null;
      return toSubmissionDTO(s, user?.full_name);
    });
    return { rows: enriched, rowCount: enriched.length };
  },

  async listByStudent(studentId: string) {
    const db = getLocalDb();
    if (!db.submissions) db.submissions = [];
    const list = db.submissions.filter((s) => s.student_id === studentId);
    return { rows: list.map((s) => toSubmissionDTO(s)), rowCount: list.length };
  },

  async createOrUpdate(data: {
    assignmentId: string;
    studentId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileData?: string | null;
    status?: 'submitted' | 'late' | 'graded';
  }) {
    const db = getLocalDb();
    if (!db.submissions) db.submissions = [];
    const idx = db.submissions.findIndex(
      (s) => s.assignment_id === data.assignmentId && s.student_id === data.studentId
    );
    const item: SubmissionRow = {
      id: idx !== -1 ? db.submissions[idx].id : crypto.randomUUID(),
      assignment_id: data.assignmentId,
      student_id: data.studentId,
      file_name: data.fileName,
      file_url: data.fileUrl,
      file_size: data.fileSize,
      file_data: data.fileData ?? (idx !== -1 ? db.submissions[idx].file_data : null),
      submitted_at: new Date().toISOString(),
      status: data.status ?? 'submitted',
      grade: idx !== -1 ? db.submissions[idx].grade : null,
      feedback: idx !== -1 ? db.submissions[idx].feedback : null,
    };
    if (idx !== -1) {
      db.submissions[idx] = item;
    } else {
      db.submissions.unshift(item);
    }
    saveLocalDb();
    return { rows: [toSubmissionDTO(item)], rowCount: 1 };
  },

  async gradeSubmission(id: string, grade: number, feedback?: string | null) {
    const db = getLocalDb();
    if (!db.submissions) db.submissions = [];
    const idx = db.submissions.findIndex((s) => s.id === id);
    if (idx === -1) return { rows: [], rowCount: 0 };
    db.submissions[idx].grade = grade;
    db.submissions[idx].feedback = feedback ?? null;
    db.submissions[idx].status = 'graded';
    saveLocalDb();
    return { rows: [toSubmissionDTO(db.submissions[idx])], rowCount: 1 };
  },
};
