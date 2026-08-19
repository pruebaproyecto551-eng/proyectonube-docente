import { api } from './api';
import type { Announcement } from '../types';

export const announcementsService = {
  async list(courseId?: string): Promise<Announcement[]> {
    const res = await api.get<{ announcements: Announcement[] }>('/announcements', {
      params: courseId ? { courseId } : undefined,
    });
    return res.data.announcements;
  },

  async create(data: {
    courseId?: string | null;
    title: string;
    content: string;
    channels?: string[];
  }): Promise<{ announcement: Announcement; whatsappShareUrl: string; notificationsDispatched: any }> {
    const res = await api.post<{
      announcement: Announcement;
      whatsappShareUrl: string;
      notificationsDispatched: any;
    }>('/announcements', data);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/announcements/${id}`);
  },
};
