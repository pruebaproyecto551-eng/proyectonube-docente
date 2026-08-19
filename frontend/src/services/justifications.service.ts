import { api } from './api';
import type { Justification } from '../types';

export const justificationsService = {
  async list(filters?: { courseId?: string; studentId?: string; status?: string }): Promise<Justification[]> {
    const res = await api.get<Justification[]>('/justifications', { params: filters });
    return res.data;
  },

  async getPendingCount(): Promise<number> {
    const res = await api.get<{ pendingCount: number }>('/justifications/pending-count');
    return res.data.pendingCount;
  },

  async getById(id: string): Promise<Justification> {
    const res = await api.get<Justification>(`/justifications/${id}`);
    return res.data;
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
  }): Promise<Justification> {
    const res = await api.post<Justification>('/justifications', data);
    return res.data;
  },

  async review(
    id: string,
    data: { status: 'approved' | 'rejected'; teacherComment?: string | null }
  ): Promise<Justification> {
    const res = await api.patch<Justification>(`/justifications/${id}/review`, data);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/justifications/${id}`);
  },
};
