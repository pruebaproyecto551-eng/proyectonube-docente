import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService } from '../services/courses.service';
import { announcementsService } from '../services/announcements.service';
import type { Course, Announcement } from '../types';
import {
  Megaphone,
  MessageCircle,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Clock,
  Search,
  Users,
  Send,
  FileText,
} from 'lucide-react';
import { alerts } from '../utils/alerts';

const TEMPLATES = [
  {
    label: '📝 Recordatorio de Examen',
    title: 'Recordatorio de Prueba Escrita de Inglés',
    content: `Estimados estudiantes y familias:\n\nLes recuerdo que la próxima semana realizaremos nuestra **Prueba Parcial de Inglés**.\n\n**Detalles importantes:**\n• **Temario:** Vocabulario, estructuras gramaticales y comprensión de lectura vistas en clase.\n• **Materiales:** Es indispensable presentarse con su propio **lapicero azul o negro**.\n\n¡Muchos éxitos en su preparación!`,
  },
  {
    label: '📚 Entrega de Tarea / GTA',
    title: 'Fecha Límite: Entrega de Tarea / Guía GTA',
    content: `Estimados estudiantes:\n\nLes recuerdo que la fecha límite para entregar la **Guía de Trabajo Autónomo (GTA)** vence próximamente.\n\nPueden subir su documento a través del **Portal Estudiantil** o presentarlo en el aula según corresponda.\n\nSaludos cordiales.`,
  },
  {
    label: '👨‍👩‍👧 Reunión / Entrega de Notas',
    title: 'Convocatoria: Entrega de Informes de Calificaciones',
    content: `Estimadas familias y estudiantes:\n\nSe les convoca cordialmente a la reunión para la **Entrega de Informes de Calificaciones** del periodo lectivo en curso.\n\nSu puntual asistencia es de suma importancia para dar seguimiento al rendimiento académico.`,
  },
  {
    label: '📢 Aviso General',
    title: 'Aviso Importante CINDEA Inglés',
    content: `Estimada comunidad estudiantil:\n\nPor este medio les comunicamos las siguientes disposiciones académicas para las próximas lecciones:\n\nQuedo a su disposición ante cualquier consulta.`,
  },
];

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-2" />;
        // Procesa formato de negrita **texto**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={idx} className="break-words">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="font-bold text-slate-900">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

export function Announcements() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtros
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [form, setForm] = useState({
    courseId: '',
    title: '',
    content: '',
    channels: ['email', 'whatsapp'],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    coursesService.list().then(setCourses).catch(() => {});
    loadAnnouncements();
  }, []);

  const loadAnnouncements = () => {
    announcementsService
      .list()
      .then(setAnnouncements)
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar avisos'));
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[0]) => {
    setForm((prev) => ({
      ...prev,
      title: tpl.title,
      content: tpl.content,
    }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await announcementsService.create({
        courseId: form.courseId || null,
        title: form.title,
        content: form.content,
        channels: form.channels,
      });
      setOpen(false);
      setForm({
        courseId: '',
        title: '',
        content: '',
        channels: ['email', 'whatsapp'],
      });
      alerts.success('Comunicado publicado', 'El aviso está visible en el portal y listo para WhatsApp.');
      loadAnnouncements();

      if (res.whatsappShareUrl) {
        const wantsOpen = await alerts.confirmAction(
          '¿Enviar por WhatsApp?',
          '¿Deseas abrir WhatsApp ahora con el texto formateado para compartirlo en el grupo?',
          '📲 Abrir WhatsApp'
        );
        if (wantsOpen) {
          window.open(res.whatsappShareUrl, '_blank');
        }
      }
    } catch (e: any) {
      alerts.error('Error al publicar', e?.response?.data?.error ?? 'No se pudo emitir el comunicado.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    const ok = await alerts.confirmDelete(
      '¿Eliminar este comunicado?',
      'Se removerá del historial y del portal de estudiantes.'
    );
    if (!ok) return;
    try {
      await announcementsService.delete(id);
      alerts.success('Comunicado eliminado', 'El aviso fue removido correctamente.');
      loadAnnouncements();
    } catch {
      alerts.error('Error al eliminar', 'No se pudo eliminar el comunicado.');
    }
  };

  const copyToClipboard = (ann: Announcement) => {
    const text = `📢 *COMUNICADO MEP: ${ann.title}*\n\n${ann.content}\n\n- ${ann.sentBy}`;
    navigator.clipboard.writeText(text);
    setCopiedId(ann.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsApp = (ann: Announcement) => {
    const text = encodeURIComponent(`📢 *COMUNICADO MEP: ${ann.title}*\n\n${ann.content}\n\n- ${ann.sentBy}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    const matchCourse = filterCourse === 'all' || (filterCourse === '' ? !ann.courseId : ann.courseId === filterCourse);
    const matchSearch =
      searchTerm.trim() === '' ||
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCourse && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Minimalista & Botón Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-600" />
            <span>Comunicados & Avisos</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Emisión de circulares, recordatorios y difusión directa por WhatsApp y Portal Estudiantil.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 font-bold shadow-xs text-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Redactar Comunicado</span>
        </Button>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* 2. Barra de Filtros y Búsqueda */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-700 shrink-0">Filtrar por grupo:</span>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none w-full sm:w-60 shadow-2xs"
          >
            <option value="all">📢 Todos los Grupos ({announcements.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar en comunicados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none shadow-2xs transition"
          />
        </div>
      </div>

      {/* 3. Lista de Comunicados con Diseño Coqueto */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white space-y-2">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No hay comunicados para mostrar</p>
            <p className="text-[11px] text-slate-400">
              {searchTerm ? 'No se encontraron resultados con ese criterio de búsqueda.' : 'Haz clic en "+ Redactar Comunicado" para enviar el primero.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAnnouncements.map((ann) => {
              const targetCourse = courses.find((c) => c.id === ann.courseId);
              return (
                <div
                  key={ann.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition duration-200 space-y-4"
                >
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60">
                        <Users className="w-3 h-3" />
                        <span>{targetCourse ? targetCourse.name : 'Todos los Cursos'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(ann.createdAt).toLocaleString('es-CR')}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>WhatsApp & Portal</span>
                    </div>
                  </div>

                  {/* Título y Contenido */}
                  <div className="space-y-2">
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{ann.title}</span>
                    </h2>

                    <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                      <FormattedMessage text={ann.content} />
                    </div>
                  </div>

                  {/* Footer con Acciones Coquetas */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                    <div className="text-[11px] text-slate-400">
                      Emitido por: <strong className="text-slate-600 font-semibold">{ann.sentBy || 'Docente'}</strong>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openWhatsApp(ann)}
                        className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs shadow-2xs flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-white" />
                        <span>Compartir en WhatsApp</span>
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(ann)}
                        className="text-xs font-semibold bg-white hover:bg-slate-50 border-slate-200"
                      >
                        {copiedId === ann.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1 text-slate-600" />
                            <span>Copiar Texto</span>
                          </>
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={() => onDelete(ann.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                        title="Eliminar comunicado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Modal para Redactar Comunicados con Plantillas Coquetas */}
      <Modal
        open={open}
        maxWidth="2xl"
        title="📢 Redactar Nuevo Comunicado Oficial"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="announcement-form"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? 'Publicando...' : 'Publicar y Generar WhatsApp'}
            </Button>
          </>
        }
      >
        <form id="announcement-form" onSubmit={onSubmit} className="space-y-4">
          {/* Plantillas Rápidas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Plantillas Rápidas (Haz clic para autocompletar):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="p-2 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-300 text-[11px] font-bold text-slate-700 transition shadow-2xs truncate"
                  title={tpl.title}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <Select
            label="Destinatarios (Curso / Grupo)"
            name="courseId"
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            options={[
              { value: '', label: '📢 Todos los Cursos y Estudiantes' },
              ...courses.map((c) => ({ value: c.id, label: `Curso: ${c.name}` })),
            ]}
          />

          <Input
            label="Título del Comunicado"
            placeholder="Ej. Recordatorio de Prueba Escrita de Inglés"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Mensaje a Familias y Alumnos</label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-blue-500 focus:outline-none"
              rows={6}
              placeholder="Escribe aquí el comunicado oficial. Puedes usar **negrita** para resaltar palabras clave..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
            <span className="text-[10px] text-slate-400">
              💡 Tip: Puedes usar <code className="bg-slate-100 px-1 rounded">**texto**</code> para resaltar en negrita en WhatsApp y en la app.
            </span>
          </div>

          {/* Burbuja de previsualización WhatsApp */}
          {form.content && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Vista Previa WhatsApp:</label>
              <div className="bg-[#EFEAE2] p-3 rounded-xl border border-[#DAD2C7] space-y-1">
                <div className="bg-white p-2.5 rounded-lg shadow-2xs max-w-lg space-y-1 border border-slate-100">
                  <div className="font-bold text-xs text-slate-900">
                    📢 COMUNICADO MEP: {form.title || 'Título'}
                  </div>
                  <div className="text-[11px] text-slate-800 whitespace-pre-line leading-relaxed">
                    {form.content}
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
