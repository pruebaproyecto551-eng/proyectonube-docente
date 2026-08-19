import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { coursesService } from '../services/courses.service';
import { calendarService, type CalendarEvent } from '../services/calendar.service';
import type { Course } from '../types';
import { alerts } from '../utils/alerts';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import {
  Calendar as CalendarIcon,
  Plus,
  ExternalLink,
  Clock,
  CheckCircle2,
  CalendarDays,
  RefreshCw,
  FileCheck2,
  Users,
  Flag,
  AlertCircle,
  Trash2,
  FolderSync,
} from 'lucide-react';
import { cn } from '../utils';

export function GoogleCalendarPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState<string>('18:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [eventType, setEventType] = useState<'exam' | 'civic' | 'meeting' | 'deadline'>('exam');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [locationName, setLocationName] = useState<string>('CINDEA · Gimnasio / Aulas');
  const [eventDesc, setEventDesc] = useState<string>('');

  const targetEmail = user?.email || 'pruebaproyecto551@gmail.com';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const courseList = await coursesService.list();
      setCourses(courseList);

      // Obtener eventos reales directamente de Google Calendar API
      const realGoogleEvents = await calendarService.getEvents(targetEmail);
      setEvents(realGoogleEvents);
    } catch (err) {
      console.error('Error cargando calendario:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar eventos base institucionales en Google Calendar
  const handleSyncBaseEvents = async () => {
    setSyncingAll(true);
    const baseToSync = [
      {
        summary: '🇨🇷 Acto Cívico Oficial: Día de la Independencia de Costa Rica',
        description: 'Celebración patriótica en CINDEA con entonación de himnos, faroles y actos culturales.',
        location: 'Gimnasio Central CINDEA',
        startDateTime: '2026-09-15T18:30:00',
        endDateTime: '2026-09-15T20:30:00',
      },
      {
        summary: '🇨🇷 Acto Cívico: Conmemoración Batalla de Rivas y Juan Santamaría',
        description: 'Homenaje a los héroes nacionales. Asistencia oficial para personal docente y estudiantes.',
        location: 'Patio Central CINDEA',
        startDateTime: '2026-04-11T18:00:00',
        endDateTime: '2026-04-11T19:30:00',
      },
      {
        summary: '👨‍👩‍👧 I Asamblea y Reunión General de Padres de Familia',
        description: 'Socialización del reglamento de evaluación MEP, entrega de lineamientos y comités.',
        location: 'Comedor Estudiantil CINDEA',
        startDateTime: '2026-03-20T18:00:00',
        endDateTime: '2026-03-20T19:45:00',
      },
      {
        summary: '📝 I Prueba Parcial de Inglés - Nivel 10° (Colorado / Módulo IV)',
        description: 'Evaluación sumativa de contenidos de la unidad 1 y 2. Ponderación MEP: 15%.',
        location: 'Aula 4 · Sede Colorado',
        startDateTime: '2026-04-22T18:00:00',
        endDateTime: '2026-04-22T19:30:00',
      },
      {
        summary: '📊 Entrega Oficial de Boletines de Notas (I Periodo)',
        description: 'Atención personalizada a padres de familia y entrega de informes de notas ponderadas.',
        location: 'Aulas de Inglés CINDEA',
        startDateTime: '2026-06-26T18:00:00',
        endDateTime: '2026-06-26T21:00:00',
      },
    ];

    try {
      for (const item of baseToSync) {
        // Evitar duplicar si ya existe un evento con el mismo título
        const exists = events.some((e) => e.summary.toLowerCase().includes(item.summary.toLowerCase().slice(0, 20)));
        if (!exists) {
          await calendarService.createEvent({
            ...item,
            email: targetEmail,
          });
        }
      }
      setSuccessMsg('✅ Fechas institucionales y exámenes sincronizados en tu Google Calendar');
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error sincronizando calendario:', err);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    setSaving(true);
    try {
      const startDateTime = `${eventDate}T${eventTime}:00`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
      const endDateTime = endDate.toISOString().split('.')[0];

      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const courseNameStr = selectedCourse ? selectedCourse.name : 'Toda la Institución';
      const fullDesc = `${eventDesc}\n\nActividad: ${getEventTypeName(eventType)}\nGrupo / Módulo: ${courseNameStr}\nLugar: ${locationName}\nPlataforma: CINDEA MEP Cloud`;

      await calendarService.createEvent({
        summary: eventTitle,
        description: fullDesc,
        location: locationName,
        startDateTime,
        endDateTime,
        email: targetEmail,
      });

      setSuccessMsg('✅ Actividad agregada directamente a tu Google Calendar');
      await loadData();

      setTimeout(() => {
        setIsModalOpen(false);
        setEventTitle('');
        setEventDesc('');
        setSuccessMsg(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error al agendar en Google Calendar. Verifica la conexión con Google.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id?: string) => {
    if (!id) return;
    const ok = await alerts.confirmDelete(
      '¿Eliminar de Google Calendar?',
      'Esta actividad será removida de tu cuenta de Google.'
    );
    if (!ok) return;
    try {
      await calendarService.deleteEvent(id, targetEmail);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      alerts.success('Evento eliminado', 'Se actualizó tu Google Calendar.');
    } catch (err) {
      console.error('Error al eliminar:', err);
      alerts.error('Error al eliminar', 'No se pudo remover el evento de Google Calendar.');
    }
  };

  const getEventTypeName = (type?: string) => {
    switch (type) {
      case 'exam':
        return 'Prueba / Examen Parcial';
      case 'civic':
        return 'Acto Cívico Institucional';
      case 'meeting':
        return 'Reunión de Padres / Entrega de Notas';
      case 'deadline':
        return 'Cierre de Periodo / Fecha Límite';
      default:
        return 'Actividad Clave';
    }
  };

  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'exams') return e.summary.toLowerCase().includes('examen') || e.summary.toLowerCase().includes('prueba') || e.summary.toLowerCase().includes('quiz');
    if (activeFilter === 'civic') return e.summary.toLowerCase().includes('acto') || e.summary.toLowerCase().includes('cívico') || e.summary.toLowerCase().includes('independencia') || e.summary.toLowerCase().includes('batalla');
    if (activeFilter === 'meetings') return e.summary.toLowerCase().includes('padres') || e.summary.toLowerCase().includes('asamblea') || e.summary.toLowerCase().includes('boletin') || e.summary.toLowerCase().includes('informe');
    if (activeFilter === 'deadlines') return e.summary.toLowerCase().includes('cierre') || e.summary.toLowerCase().includes('límite') || e.summary.toLowerCase().includes('sicin') || e.summary.toLowerCase().includes('entrega');
    return true;
  });

  const openGoogleCalendarDirect = () => {
    window.open(`https://calendar.google.com/calendar/r?authuser=${encodeURIComponent(targetEmail)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Minimalista & Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            <span>Calendario Institucional</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Actividades, exámenes, actos cívicos y reuniones programadas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={openGoogleCalendarDirect}
            className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1 text-blue-600" />
            <span>Abrir Calendar ↗</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSyncBaseEvents}
            disabled={syncingAll}
            className="text-xs font-bold border-blue-200 text-blue-800 bg-blue-50/70 hover:bg-blue-100 shadow-2xs"
            title="Cargar fechas patrias y exámenes oficiales del MEP"
          >
            <FolderSync className={`w-3.5 h-3.5 mr-1 text-blue-600 ${syncingAll ? 'animate-spin' : ''}`} />
            <span>{syncingAll ? 'Sincronizando...' : 'Fechas MEP'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Agendar Evento</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl font-bold flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Filtros de Categorías Minimalistas */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {[
          { id: 'all', label: `Todos (${events.length})`, icon: CalendarDays },
          { id: 'exams', label: '📝 Exámenes', icon: FileCheck2 },
          { id: 'civic', label: '🇨🇷 Actos Cívicos', icon: Flag },
          { id: 'meetings', label: '👨‍👩‍👧 Reuniones', icon: Users },
          { id: 'deadlines', label: '⏰ Cierres', icon: AlertCircle },
        ].map((f) => {
          const Icon = f.icon;
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer',
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{f.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="ml-auto p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          title="Actualizar eventos desde Google"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 3. Stream de Agenda Minimalista */}
      <div className="space-y-2.5">
        {filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 space-y-2">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-xs">No hay actividades agendadas en esta categoría.</p>
            <p className="text-slate-400 text-[11px]">Haz clic en "+ Agendar" para crear un evento en Google Calendar.</p>
          </div>
        ) : (
          filteredEvents.map((evt, index) => {
            const startDate = evt.start ? new Date(evt.start) : null;
            const dayNum = startDate && !isNaN(startDate.getTime()) ? startDate.getDate() : '--';
            const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
            const monthStr = startDate && !isNaN(startDate.getTime()) ? months[startDate.getMonth()] : '---';
            const timeFormatted = startDate && !isNaN(startDate.getTime())
              ? startDate.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
              : '18:00';

            const isExam = evt.summary.toLowerCase().includes('examen') || evt.summary.toLowerCase().includes('prueba');
            const isCivic = evt.summary.toLowerCase().includes('acto') || evt.summary.toLowerCase().includes('cívico') || evt.summary.toLowerCase().includes('independencia') || evt.summary.toLowerCase().includes('batalla');
            const isMeeting = evt.summary.toLowerCase().includes('padres') || evt.summary.toLowerCase().includes('asamblea') || evt.summary.toLowerCase().includes('boletin');
            const isDeadline = evt.summary.toLowerCase().includes('cierre') || evt.summary.toLowerCase().includes('sicin');

            const badgeBg = isExam
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : isCivic
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : isMeeting
              ? 'bg-purple-50 text-purple-800 border-purple-200'
              : isDeadline
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200';

            const badgeLabel = isExam
              ? '📝 Prueba'
              : isCivic
              ? '🇨🇷 Acto Cívico'
              : isMeeting
              ? '👨‍👩‍👧 Reunión'
              : isDeadline
              ? '⏰ Cierre'
              : 'Evento';

            const cleanDesc = evt.description?.split('\n')[0] || '';

            return (
              <div
                key={evt.id || index}
                className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-blue-200 hover:shadow-xs transition flex items-center justify-between gap-3 group"
              >
                {/* Bloque Fecha Minimalista */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center shrink-0 text-center shadow-2xs">
                    <span className="text-[9px] font-extrabold uppercase text-blue-600 tracking-wider leading-none">
                      {monthStr}
                    </span>
                    <span className="text-base font-black text-slate-900 leading-tight">
                      {dayNum}
                    </span>
                  </div>

                  {/* Contenido del Evento */}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', badgeBg)}>
                        {badgeLabel}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {evt.summary}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {timeFormatted}
                      </span>
                      {evt.location && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[220px]">{evt.location}</span>
                        </>
                      )}
                      {cleanDesc && !cleanDesc.startsWith('Actividad:') && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[260px] text-slate-400">{cleanDesc}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones Rápidas (Alineadas a la derecha) */}
                <div className="flex items-center gap-1 shrink-0">
                  {evt.htmlLink && (
                    <a
                      href={
                        evt.htmlLink.includes('?')
                          ? `${evt.htmlLink}&authuser=${encodeURIComponent(targetEmail)}`
                          : `${evt.htmlLink}?authuser=${encodeURIComponent(targetEmail)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition"
                      title="Abrir en Google Calendar"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {evt.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(evt.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                      title="Eliminar de Google Calendar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Modal para Agendar Nueva Actividad Directamente en Google Calendar */}
      <Modal
        open={isModalOpen}
        title="Crear Evento en Google Calendar"
        onClose={() => setIsModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateEvent}
              disabled={saving || !eventTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              {saving ? 'Guardando en Google...' : 'Agendar en Google Calendar'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-800 block mb-1">Nombre de la Actividad o Examen *</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              placeholder="Ej. I Prueba Parcial de Inglés / Acto Cívico de la Independencia"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Tipo de Actividad</label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={eventType}
                onChange={(e: any) => setEventType(e.target.value)}
              >
                <option value="exam">📝 Prueba / Examen Parcial</option>
                <option value="civic">🇨🇷 Acto Cívico Institucional</option>
                <option value="meeting">👨‍👩‍👧 Reunión de Padres / Entrega de Notas</option>
                <option value="deadline">⏰ Cierre de Periodo / Límite SICIN</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Grupo o Audiencia</label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="all">Toda la Institución / Todos los Grupos</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Fecha</label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Hora</label>
              <input
                type="time"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Duración</label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                <option value={60}>1 hora</option>
                <option value={90}>1.5 horas</option>
                <option value={120}>2 horas</option>
                <option value={180}>3 horas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Lugar o Ubicación</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              placeholder="Ej. Gimnasio CINDEA / Aula 3 / Comedor"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Descripción u Observaciones (Opcional)</label>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              placeholder="Indicaciones sobre contenidos a evaluar, uniforme requerido, materiales..."
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
