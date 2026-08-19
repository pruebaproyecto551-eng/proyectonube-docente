import { api } from './api';
import type { AIDiagnosticReport, AIRubric } from '../types';

export const aiService = {
  async chatTeacher(data: {
    message: string;
    courseName?: string;
    teacherName?: string;
  }): Promise<{ reply: string; timestamp: string }> {
    const res = await api.post<{ reply: string; timestamp: string }>('/ai/chat', data);
    return res.data;
  },
  async generateNotice(data: {
    type: 'exam_reminder' | 'assignment_reminder' | 'low_grade_alert' | 'absence_alert' | 'meeting_call' | 'congratulation';
    studentName?: string;
    guardianName?: string;
    courseName: string;
    details?: string;
    dueDate?: string;
    teacherName?: string;
  }): Promise<{ title: string; message: string; whatsappTemplate: string }> {
    const res = await api.post<{ title: string; message: string; whatsappTemplate: string }>(
      '/ai/notice',
      data
    );
    return res.data;
  },

  async analyzeRisk(courseId: string): Promise<AIDiagnosticReport> {
    const res = await api.get<AIDiagnosticReport>(`/ai/risk-analysis/${courseId}`);
    return res.data;
  },

  async generateRubric(data: {
    subject: string;
    gradeLevel: string;
    topic: string;
    evaluationType?: 'cotidiano' | 'tarea' | 'proyecto' | 'examen';
  }): Promise<{ rubric: AIRubric }> {
    const res = await api.post<{ rubric: AIRubric }>('/ai/rubric', data);
    return res.data;
  },

  async askTutor(data: {
    subject: string;
    question: string;
    studentGradeLevel?: string;
  }): Promise<{ answer: string; subject: string; timestamp: string }> {
    const res = await api.post<{ answer: string; subject: string; timestamp: string }>(
      '/ai/tutor',
      data
    );
    return res.data;
  },
};
