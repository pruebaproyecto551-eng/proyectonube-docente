import { api } from './api';
import type { Assignment, Submission } from '../types';

export const assignmentsService = {
  async list(courseId: string): Promise<Assignment[]> {
    const res = await api.get<{ assignments: Assignment[] }>(`/courses/${courseId}/assignments`);
    return res.data.assignments;
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
      attachmentName?: string | null;
      attachmentUrl?: string | null;
      attachmentData?: string | null;
      submissionType?: 'in_class' | 'digital' | null;
    }
  ): Promise<Assignment> {
    const res = await api.post<{ assignment: Assignment }>(
      `/courses/${courseId}/assignments`,
      data
    );
    return res.data.assignment;
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
      submissionType?: 'in_class' | 'digital' | null;
    }>
  ): Promise<Assignment> {
    const res = await api.put<{ assignment: Assignment }>(`/assignments/${id}`, data);
    return res.data.assignment;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/assignments/${id}`);
  },

  async listSubmissions(assignmentId: string): Promise<Submission[]> {
    const res = await api.get<{ submissions: Submission[] }>(
      `/assignments/${assignmentId}/submissions`
    );
    return res.data.submissions;
  },

  async listStudentSubmissions(studentId: string): Promise<Submission[]> {
    const res = await api.get<{ submissions: Submission[] }>(
      `/submissions/student/${studentId}`
    );
    return res.data.submissions;
  },

  async submitAssignment(data: {
    assignmentId: string;
    studentId: string;
    fileName: string;
    fileData?: string;
    fileSize?: number;
  }): Promise<{ submission: Submission; cloudMetadata: any }> {
    const res = await api.post<{ submission: Submission; cloudMetadata: any }>(
      '/submissions',
      data
    );
    return res.data;
  },

  async gradeSubmission(
    submissionId: string,
    data: { grade: number; feedback?: string | null }
  ): Promise<Submission> {
    const res = await api.put<{ submission: Submission }>(
      `/submissions/${submissionId}/grade`,
      data
    );
    return res.data.submission;
  },
};
