import { api } from './api';
import type { Course, Student } from '../types';

export interface CourseStudent extends Student {
  fullName: string;
  email: string;
}

export const coursesService = {
  async list(): Promise<Course[]> {
    const { data } = await api.get<{ courses: Course[] }>('/courses');
    return data.courses;
  },
  async get(id: string): Promise<Course> {
    const { data } = await api.get<{ course: Course }>(`/courses/${id}`);
    return data.course;
  },
  async create(payload: {
    name: string;
    code: string;
    description?: string;
    color?: string;
  }): Promise<Course> {
    const { data } = await api.post<{ course: Course }>('/courses', payload);
    return data.course;
  },
  async update(id: string, payload: Partial<Course>): Promise<Course> {
    const { data } = await api.put<{ course: Course }>(`/courses/${id}`, payload);
    return data.course;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/courses/${id}`);
  },
  async listStudents(courseId: string): Promise<CourseStudent[]> {
    const { data } = await api.get<{ students: CourseStudent[] }>(
      `/courses/${courseId}/students`
    );
    return data.students;
  },
  async enroll(courseId: string, studentId: string): Promise<void> {
    await api.post(`/courses/${courseId}/students/${studentId}`);
  },
  async unenroll(courseId: string, studentId: string): Promise<void> {
    await api.delete(`/courses/${courseId}/students/${studentId}`);
  },
};
