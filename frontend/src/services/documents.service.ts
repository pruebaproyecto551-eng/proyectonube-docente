import { api } from '../services/api';
import type { TeacherDocument } from '../types';

export const documentsService = {
  async list(filters?: { courseId?: string; category?: string }): Promise<TeacherDocument[]> {
    const res = await api.get<{ documents: TeacherDocument[] }>('/documents', {
      params: filters,
    });
    return res.data.documents;
  },

  async create(data: {
    courseId?: string | null;
    courseName?: string | null;
    title: string;
    category: 'planeamiento' | 'examen' | 'guia' | 'rubrica' | 'otro';
    period?: string | null;
    fileName: string;
    fileData?: string | null;
  }): Promise<TeacherDocument> {
    const res = await api.post<{ document: TeacherDocument }>('/documents', data);
    return res.data.document;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },
};
