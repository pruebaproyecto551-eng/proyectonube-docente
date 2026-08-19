import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export interface AssignmentRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  category: string | null;
  due_date: string | null;
  status: 'draft' | 'published' | 'closed';
  max_score: string | number;
  google_calendar_event_id?: string | null;
  drive_folder_url?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  attachment_data?: string | null;
  submission_type?: 'in_class' | 'digital' | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentDTO {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  category: string | null;
  dueDate: string | null;
  status: AssignmentRow['status'];
  maxScore: number;
  googleCalendarEventId?: string | null;
  driveFolderUrl?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  attachmentData?: string | null;
  submissionType?: 'in_class' | 'digital' | null;
}

export function toAssignmentDTO(row: AssignmentRow): AssignmentDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    category: row.category,
    dueDate: row.due_date,
    status: row.status,
    maxScore: Number(row.max_score),
    googleCalendarEventId: row.google_calendar_event_id ?? null,
    driveFolderUrl: (row as any).drive_folder_url ?? null,
    attachmentName: row.attachment_name ?? null,
    attachmentUrl: row.attachment_url ?? null,
    attachmentData: row.attachment_data ?? null,
    submissionType: (row as any).submission_type || (row as any).submissionType || 'digital',
  };
}

export const assignmentQueries = {
  async listByCourse(courseId: string) {
    if (await testConnection()) {
      return pool.query<AssignmentRow>(
        'SELECT * FROM assignments WHERE course_id = $1 ORDER BY due_date DESC NULLS LAST, created_at DESC',
        [courseId]
      );
    }
    const db = getLocalDb();
    const list = db.assignments.filter((a) => a.course_id === courseId);
    return { rows: list, rowCount: list.length };
  },

  async findById(id: string) {
    if (await testConnection()) {
      return pool.query<AssignmentRow>('SELECT * FROM assignments WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    const a = db.assignments.find((x) => x.id === id);
    return { rows: a ? [a] : [], rowCount: a ? 1 : 0 };
  },

  async create(
    courseId: string,
    data: {
      title: string;
      description?: string | null;
      category?: string | null;
      dueDate?: string | null;
      status?: 'draft' | 'published' | 'closed';
      maxScore: number;
      googleCalendarEventId?: string | null;
      driveFolderUrl?: string | null;
      attachmentName?: string | null;
      attachmentUrl?: string | null;
      attachmentData?: string | null;
      submissionType?: 'in_class' | 'digital' | null;
    }
  ) {
    if (await testConnection()) {
      return pool.query<AssignmentRow>(
        `INSERT INTO assignments (course_id, title, description, category, due_date, status, max_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          courseId,
          data.title,
          data.description ?? null,
          data.category ?? null,
          data.dueDate ?? null,
          data.status ?? 'published',
          data.maxScore,
        ]
      );
    }
    const db = getLocalDb();
    const newA: AssignmentRow = {
      id: crypto.randomUUID(),
      course_id: courseId,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? 'Tareas (10%)',
      due_date: data.dueDate ?? null,
      status: data.status ?? 'published',
      max_score: data.maxScore,
      google_calendar_event_id: data.googleCalendarEventId || `gcal_evt_${Math.random().toString(36).substring(2, 9)}`,
      drive_folder_url: data.driveFolderUrl ?? null,
      attachment_name: data.attachmentName ?? null,
      attachment_url: data.attachmentUrl ?? null,
      attachment_data: data.attachmentData ?? null,
      submission_type: data.submissionType ?? 'digital',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.assignments.unshift(newA);
    saveLocalDb();
    return { rows: [toAssignmentDTO(newA) as any], rowCount: 1 };
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      category: string | null;
      dueDate: string | null;
      status: 'draft' | 'published' | 'closed';
      maxScore: number;
      attachmentName?: string | null;
      attachmentData?: string | null;
      attachmentUrl?: string | null;
      submissionType: 'in_class' | 'digital' | null;
    }>
  ) {
    if (await testConnection()) {
      const map: Record<string, string> = {
        title: 'title',
        description: 'description',
        category: 'category',
        dueDate: 'due_date',
        status: 'status',
        maxScore: 'max_score',
        attachmentName: 'attachment_name',
        attachmentData: 'attachment_data',
        attachmentUrl: 'attachment_url',
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
      return pool.query<AssignmentRow>(
        `UPDATE assignments SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${i} RETURNING *`,
        values
      );
    }
    const db = getLocalDb();
    const idx = db.assignments.findIndex((x) => x.id === id);
    if (idx === -1) return { rows: [], rowCount: 0 };
    db.assignments[idx] = {
      ...db.assignments[idx],
      ...data,
      due_date: data.dueDate !== undefined ? data.dueDate : db.assignments[idx].due_date,
      max_score: data.maxScore !== undefined ? data.maxScore : db.assignments[idx].max_score,
      attachment_name: data.attachmentName !== undefined ? data.attachmentName : db.assignments[idx].attachment_name,
      attachment_data: data.attachmentData !== undefined ? data.attachmentData : db.assignments[idx].attachment_data,
      attachment_url: data.attachmentUrl !== undefined ? data.attachmentUrl : db.assignments[idx].attachment_url,
      updated_at: new Date().toISOString(),
    };
    saveLocalDb();
    return { rows: [toAssignmentDTO(db.assignments[idx]) as any], rowCount: 1 };
  },

  async delete(id: string) {
    if (await testConnection()) {
      return pool.query('DELETE FROM assignments WHERE id = $1', [id]);
    }
    const db = getLocalDb();
    db.assignments = db.assignments.filter((x) => x.id !== id);
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },
};
