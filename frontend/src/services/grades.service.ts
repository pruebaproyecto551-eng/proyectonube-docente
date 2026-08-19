import { api } from './api';
import type { Assignment, Grade } from '../types';

export const gradesService = {
  async listAssignments(courseId: string): Promise<Assignment[]> {
    const { data } = await api.get<{ assignments: Assignment[] }>(
      `/courses/${courseId}/assignments`
    );
    return data.assignments;
  },
  async createAssignment(
    courseId: string,
    payload: Partial<Assignment>
  ): Promise<Assignment> {
    const { data } = await api.post<{ assignment: Assignment }>(
      `/courses/${courseId}/assignments`,
      payload
    );
    return data.assignment;
  },
  async deleteAssignment(id: string): Promise<void> {
    await api.delete(`/assignments/${id}`);
  },

  async listGrades(
    courseId: string,
    studentId?: string
  ): Promise<Grade[]> {
    const { data } = await api.get<{ grades: Grade[] }>(
      `/courses/${courseId}/grades`,
      { params: studentId ? { studentId } : undefined }
    );
    return data.grades;
  },
  async createGrade(
    courseId: string,
    payload: Omit<Grade, 'id' | 'courseId'>
  ): Promise<Grade> {
    const { data } = await api.post<{ grade: Grade }>(
      `/courses/${courseId}/grades`,
      payload
    );
    return data.grade;
  },
  async updateGrade(id: string, payload: Partial<Grade>): Promise<Grade> {
    const { data } = await api.put<{ grade: Grade }>(`/grades/${id}`, payload);
    return data.grade;
  },
  async deleteGrade(id: string): Promise<void> {
    await api.delete(`/grades/${id}`);
  },
};
