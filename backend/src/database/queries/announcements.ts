import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export interface AnnouncementRow {
  id: string;
  course_id: string | null;
  title: string;
  content: string;
  channels: string[];
  sent_by: string;
  created_at: string;
}

export interface AnnouncementDTO {
  id: string;
  courseId: string | null;
  title: string;
  content: string;
  channels: string[];
  sentBy: string;
  createdAt: string;
}

export function toAnnouncementDTO(row: AnnouncementRow): AnnouncementDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    content: row.content,
    channels: row.channels || ['email', 'whatsapp'],
    sentBy: row.sent_by || 'Docente de Inglés CINDEA',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export const announcementQueries = {
  async listByCourse(courseId?: string) {
    const db = getLocalDb();
    if (!db.announcements) db.announcements = [];
    let list = db.announcements;
    if (courseId) {
      list = list.filter((a) => !a.course_id || a.course_id === courseId);
    }
    return { rows: list.map(toAnnouncementDTO), rowCount: list.length };
  },

  async create(data: {
    courseId?: string | null;
    title: string;
    content: string;
    channels?: string[];
    sentBy?: string;
  }) {
    const db = getLocalDb();
    if (!db.announcements) db.announcements = [];
    const newA: AnnouncementRow = {
      id: crypto.randomUUID(),
      course_id: data.courseId ?? null,
      title: data.title,
      content: data.content,
      channels: data.channels ?? ['email', 'whatsapp'],
      sent_by: data.sentBy ?? 'Docente de Inglés CINDEA',
      created_at: new Date().toISOString(),
    };
    db.announcements.unshift(newA);
    saveLocalDb();
    return { rows: [toAnnouncementDTO(newA)], rowCount: 1 };
  },

  async delete(id: string) {
    const db = getLocalDb();
    if (!db.announcements) db.announcements = [];
    db.announcements = db.announcements.filter((a) => a.id !== id);
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },
};
