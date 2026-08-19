import { api } from './api';
import type { AttendanceRecord, AttendanceStatus, AttendanceSummaryItem } from '../types';

export const attendanceService = {
  async list(courseId: string, date?: string): Promise<AttendanceRecord[]> {
    const res = await api.get<{ attendance: AttendanceRecord[] }>(
      `/courses/${courseId}/attendance`,
      { params: date ? { date } : undefined }
    );
    return res.data.attendance;
  },

  async mark(
    courseId: string,
    data: {
      studentId: string;
      date: string;
      status: AttendanceStatus;
      lessonsCount?: number;
      notes?: string | null;
    }
  ): Promise<AttendanceRecord> {
    const res = await api.post<{ attendance: AttendanceRecord }>(
      `/courses/${courseId}/attendance`,
      data
    );
    return res.data.attendance;
  },

  async update(
    id: string,
    data: { status?: AttendanceStatus; lessonsCount?: number; notes?: string | null }
  ): Promise<AttendanceRecord> {
    const res = await api.put<{ attendance: AttendanceRecord }>(`/attendance/${id}`, data);
    return res.data.attendance;
  },

  async getSummary(courseId: string): Promise<Record<string, AttendanceSummaryItem>> {
    const res = await api.get<{ summary: Record<string, AttendanceSummaryItem> }>(
      `/courses/${courseId}/attendance/summary`
    );
    return res.data.summary;
  },
};
