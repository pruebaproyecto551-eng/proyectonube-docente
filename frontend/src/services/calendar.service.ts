import { api } from './api';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  htmlLink?: string;
  courseName?: string;
  type?: 'class' | 'exam' | 'assignment' | 'meeting' | 'institutional' | 'civic' | 'deadline';
}

export const calendarService = {
  async getEvents(email?: string): Promise<CalendarEvent[]> {
    try {
      const { data } = await api.get<{ events: CalendarEvent[] }>('/integrations/google/calendar/events', {
        params: email ? { email } : undefined,
      });
      return data.events || [];
    } catch (_) {
      return [];
    }
  },

  async createEvent(event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    email?: string;
  }): Promise<any> {
    const { data } = await api.post('/integrations/google/calendar/events', event);
    return data;
  },

  async deleteEvent(id: string, email?: string): Promise<boolean> {
    try {
      const { data } = await api.delete<{ success: boolean }>(`/integrations/google/calendar/events/${id}`, {
        params: email ? { email } : undefined,
      });
      return data.success;
    } catch (_) {
      return false;
    }
  },
};

