import { api } from './api';
import type { Student } from '../types';

export const studentsService = {
  async list(): Promise<Student[]> {
    const { data } = await api.get<{ students: Student[] }>('/students');
    return data.students;
  },
  async get(id: string): Promise<Student> {
    const { data } = await api.get<{ student: Student }>(`/students/${id}`);
    return data.student;
  },
  async create(payload: {
    fullName: string;
    studentNumber: string;
    email?: string;
    password?: string;
    gradeLevel?: string;
    guardianName?: string;
    guardianPhone?: string;
    courseId?: string;
  }): Promise<{ student: Student }> {
    const { data } = await api.post<{ student: Student }>('/students', payload);
    return data;
  },
  async createBatch(payload: {
    students: { fullName: string; studentNumber: string; email?: string; gradeLevel?: string }[];
    courseId?: string;
  }): Promise<{ createdCount: number; message: string }> {
    const { data } = await api.post<{ createdCount: number; message: string }>('/students/batch', payload);
    return data;
  },
  async update(id: string, payload: Partial<Student>): Promise<Student> {
    const { data } = await api.put<{ student: Student }>(`/students/${id}`, payload);
    return data.student;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/students/${id}`);
  },
};
