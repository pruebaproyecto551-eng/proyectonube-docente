import { getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export interface TeacherDocumentRow {
  id: string;
  teacher_id: string;
  course_id: string | null;
  course_name: string | null;
  title: string;
  category: 'planeamiento' | 'examen' | 'guia' | 'rubrica' | 'otro';
  period: string | null;
  file_name: string;
  file_data: string | null;
  file_url: string | null;
  drive_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherDocumentDTO {
  id: string;
  teacherId: string;
  courseId: string | null;
  courseName: string | null;
  title: string;
  category: 'planeamiento' | 'examen' | 'guia' | 'rubrica' | 'otro';
  period: string | null;
  fileName: string;
  fileData?: string | null;
  fileUrl?: string | null;
  driveLink?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toTeacherDocumentDTO(row: TeacherDocumentRow): TeacherDocumentDTO {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    courseId: row.course_id,
    courseName: row.course_name,
    title: row.title,
    category: row.category,
    period: row.period,
    fileName: row.file_name,
    fileData: row.file_data,
    fileUrl: row.file_url,
    driveLink: row.drive_link,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const documentQueries = {
  async list(filters?: { courseId?: string; category?: string; teacherId?: string }) {
    const db = getLocalDb();
    let docs = db.teacher_documents || [];
    
    if (filters?.courseId) {
      docs = docs.filter((d) => d.course_id === filters.courseId || d.course_id === null);
    }
    if (filters?.category) {
      docs = docs.filter((d) => d.category === filters.category);
    }
    
    return { rows: docs, rowCount: docs.length };
  },

  async findById(id: string) {
    const db = getLocalDb();
    const doc = (db.teacher_documents || []).find((d) => d.id === id);
    return { rows: doc ? [doc] : [], rowCount: doc ? 1 : 0 };
  },

  async create(data: {
    teacherId: string;
    courseId?: string | null;
    courseName?: string | null;
    title: string;
    category: 'planeamiento' | 'examen' | 'guia' | 'rubrica' | 'otro';
    period?: string | null;
    fileName: string;
    fileData?: string | null;
    fileUrl?: string | null;
    driveLink?: string | null;
  }) {
    const db = getLocalDb();
    if (!db.teacher_documents) {
      db.teacher_documents = [];
    }

    const newDoc: TeacherDocumentRow = {
      id: crypto.randomUUID(),
      teacher_id: data.teacherId,
      course_id: data.courseId ?? null,
      course_name: data.courseName ?? null,
      title: data.title,
      category: data.category,
      period: data.period ?? 'I Período 2026',
      file_name: data.fileName,
      file_data: data.fileData ?? null,
      file_url: data.fileUrl ?? null,
      drive_link: data.driveLink ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.teacher_documents.unshift(newDoc);
    saveLocalDb();
    return { rows: [newDoc], rowCount: 1 };
  },

  async delete(id: string) {
    const db = getLocalDb();
    if (!db.teacher_documents) return { rowCount: 0 };
    const idx = db.teacher_documents.findIndex((d) => d.id === id);
    if (idx !== -1) {
      db.teacher_documents.splice(idx, 1);
      saveLocalDb();
      return { rowCount: 1 };
    }
    return { rowCount: 0 };
  },
};
