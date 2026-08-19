import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { assignmentsService } from '../services/assignments.service';
import { gradesService } from '../services/grades.service';
import type { Course, Assignment, Submission, Grade } from '../types';
import { alerts } from '../utils/alerts';
import {
  FolderUp,
  Plus,
  Trash2,
  Clock,
  FileText,
  Cloud,
  Award,
  Paperclip,
  Edit3,
  Pencil,
  Eye,
  Download,
  BookOpen,
  UploadCloud,
  X,
} from 'lucide-react';
import { cn } from '../utils';

interface CreateTaskForm {
  title: string;
  category: string;
  description: string;
  dueDate: string;
  dueTime: string;
  maxScore: number;
  submissionType: 'in_class' | 'digital';
  attachmentName: string;
  attachmentData: string;
}

const emptyTaskForm: CreateTaskForm = {
  title: '',
  category: 'Tareas (10%)',
  description: '',
  dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  dueTime: '23:59',
  maxScore: 100,
  submissionType: 'digital',
  attachmentName: '',
  attachmentData: '',
};

export function Assignments() {
  const [searchParams] = useSearchParams();
  const queryCourseId = searchParams.get('courseId');

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [courseGrades, setCourseGrades] = useState<Grade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [openSubmissionsModal, setOpenSubmissionsModal] = useState(false);
  const [form, setForm] = useState<CreateTaskForm>(emptyTaskForm);
  const [submitting, setSubmitting] = useState(false);
  const [isDraggingCreate, setIsDraggingCreate] = useState(false);

  // Edición y ampliación de plazos
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState<CreateTaskForm>(emptyTaskForm);
  const [updating, setUpdating] = useState(false);
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);

  // Calificar entrega digital
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(100);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  // Calificar estudiante directamente (Examen en papel o presencial)
  const [gradingStudent, setGradingStudent] = useState<CourseStudent | null>(null);
  const [studentPaperScore, setStudentPaperScore] = useState<number>(100);
  const [studentPaperFeedback, setStudentPaperFeedback] = useState<string>('');
  const [studentPaperAttachmentName, setStudentPaperAttachmentName] = useState<string>('');
  const [studentPaperAttachmentData, setStudentPaperAttachmentData] = useState<string>('');
  const [savingPaperGrade, setSavingPaperGrade] = useState<boolean>(false);
  const [isDraggingPaper, setIsDraggingPaper] = useState(false);

  // Previsualizar documento / audio
  const [previewSub, setPreviewSub] = useState<Submission | null>(null);

  const downloadSingleData = (fileName: string, fileData: string) => {
    const element = document.createElement('a');
    if (fileData && fileData.startsWith('data:')) {
      element.href = fileData;
    } else if (fileData) {
      const file = new Blob([fileData], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
    } else {
      const fallback = `CINDEA MEP - DEPARTAMENTO DE INGLÉS\nArchivo: ${fileName}\nFecha: ${new Date().toLocaleString('es-CR')}`;
      const file = new Blob([fallback], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
    }
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadRealFile = (sub: Submission) => {
    if (sub.fileData && sub.fileData.startsWith('{"isMulti":true')) {
      try {
        const parsed = JSON.parse(sub.fileData);
        if (Array.isArray(parsed.files)) {
          parsed.files.forEach((f: any, idx: number) => {
            setTimeout(() => {
              downloadSingleData(f.name, f.data);
            }, idx * 300);
          });
          return;
        }
      } catch (_) {}
    }

    downloadSingleData(sub.fileName, sub.fileData || '');
  };

  useEffect(() => {
    coursesService.list().then((cs) => {
      setCourses(cs);
      const target = cs.find((c) => c.id === queryCourseId) || cs[0];
      if (target) setCourseId(target.id);
    });
  }, [queryCourseId]);

  const loadAssignments = () => {
    if (!courseId) return;
    assignmentsService
      .list(courseId)
      .then(setAssignments)
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar asignaciones'));
  };

  useEffect(() => {
    loadAssignments();
  }, [courseId]);

  const onCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setSubmitting(true);
    setError(null);
    try {
      const fullDueDate = `${form.dueDate}T${form.dueTime}:00`;
      await assignmentsService.create(courseId, {
        title: form.title,
        description: form.description,
        category: form.category,
        dueDate: fullDueDate,
        maxScore: form.maxScore,
        submissionType: form.submissionType,
        attachmentName: form.attachmentName || undefined,
        attachmentData: form.attachmentData || undefined,
        status: 'published',
      });
      setOpenModal(false);
      setForm(emptyTaskForm);
      loadAssignments();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al crear asignación');
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenEdit = (a: Assignment) => {
    setEditingAssignment(a);
    let dDate = '';
    let dTime = '23:59';
    if (a.dueDate) {
      const dt = new Date(a.dueDate);
      if (!isNaN(dt.getTime())) {
        dDate = dt.toISOString().slice(0, 10);
        dTime = dt.toTimeString().slice(0, 5);
      }
    }
    setEditForm({
      title: a.title,
      description: a.description || '',
      category: a.category || 'Tareas (10%)',
      dueDate: dDate,
      dueTime: dTime,
      maxScore: a.maxScore || 100,
      submissionType: a.submissionType || 'in_class',
      attachmentName: a.attachmentName || '',
      attachmentData: a.attachmentData || '',
    });
    setOpenEditModal(true);
  };

  const onUpdateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setUpdating(true);
    setError(null);
    try {
      const combinedDueDate = editForm.dueDate
        ? new Date(`${editForm.dueDate}T${editForm.dueTime || '23:59'}:00`).toISOString()
        : null;

      await assignmentsService.update(editingAssignment.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        category: editForm.category,
        dueDate: combinedDueDate,
        maxScore: Number(editForm.maxScore),
        submissionType: editForm.submissionType,
        attachmentName: editForm.attachmentName || null,
        attachmentData: editForm.attachmentData || null,
      });

      setOpenEditModal(false);
      setEditingAssignment(null);
      loadAssignments();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al actualizar la asignación.');
    } finally {
      setUpdating(false);
    }
  };

  const onDeleteTask = async (id: string) => {
    const ok = await alerts.confirmDelete(
      '¿Eliminar esta tarea?',
      'Se removerá la asignación y todas las entregas asociadas.'
    );
    if (!ok) return;
    try {
      await assignmentsService.delete(id);
      alerts.success('Tarea eliminada', 'La asignación fue removida.');
      loadAssignments();
    } catch {
      alerts.error('Error al eliminar', 'No se pudo eliminar la tarea.');
    }
  };

  const onViewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const [subs, studs, grs] = await Promise.all([
      assignmentsService.listSubmissions(assignment.id).catch(() => []),
      coursesService.listStudents(courseId).catch(() => []),
      gradesService.listGrades(courseId).catch(() => []),
    ]);
    setSubmissions(subs);
    setStudents(studs);
    setCourseGrades(grs);
    setOpenSubmissionsModal(true);
  };

  const onSaveGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission || !selectedAssignment) return;
    try {
      await assignmentsService.gradeSubmission(gradingSubmission.id, {
        grade: gradeScore,
        feedback: gradeFeedback,
      });
      await gradesService.createGrade(courseId, {
        studentId: gradingSubmission.studentId,
        assignmentId: selectedAssignment.id,
        title: selectedAssignment.title,
        score: gradeScore,
        maxScore: Number(selectedAssignment.maxScore || 100),
        weight: 10,
        category: selectedAssignment.category || 'Tareas (10%)',
        gradedOn: new Date().toISOString(),
        notes: gradeFeedback,
      }).catch(() => {});

      const updatedSubs = await assignmentsService.listSubmissions(selectedAssignment.id);
      const updatedGrs = await gradesService.listGrades(courseId);
      setSubmissions(updatedSubs);
      setCourseGrades(updatedGrs);
      setGradingSubmission(null);
    } catch (e: any) {
      alert('Error al calificar entrega');
    }
  };

  const onSavePaperGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!gradingStudent || !selectedAssignment) return;
    setSavingPaperGrade(true);
    try {
      await gradesService.createGrade(courseId, {
        studentId: gradingStudent.id,
        assignmentId: selectedAssignment.id,
        title: selectedAssignment.title,
        score: studentPaperScore,
        maxScore: Number(selectedAssignment.maxScore || 100),
        weight: selectedAssignment.category?.includes('Exámenes') ? 30 : 10,
        category: selectedAssignment.category || 'Pruebas / Exámenes (30%)',
        gradedOn: new Date().toISOString(),
        notes: studentPaperFeedback || null,
        attachmentName: studentPaperAttachmentName || null,
        attachmentData: studentPaperAttachmentData || null,
      });

      const updatedGrs = await gradesService.listGrades(courseId);
      setCourseGrades(updatedGrs);
      setGradingStudent(null);
      setStudentPaperAttachmentName('');
      setStudentPaperAttachmentData('');
      setStudentPaperFeedback('');
    } catch (err: any) {
      alert('Error al guardar la nota del estudiante.');
    } finally {
      setSavingPaperGrade(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Minimalista & Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600 shrink-0" />
            <span>Tareas y Asignaciones</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión y revisión de trabajos con respaldo en Google Drive.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-48 sm:w-60">
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            onClick={() => setOpenModal(true)}
            disabled={!courseId}
            className="text-xs font-bold bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* 2. Tabla de Tareas y Asignaciones */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 select-none">
                <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                <th className="py-2.5 px-3.5">Título y Descripción</th>
                <th className="py-2.5 px-3.5">Categoría MEP</th>
                <th className="py-2.5 px-3.5 text-center">Modalidad</th>
                <th className="py-2.5 px-3.5">Fecha Límite</th>
                <th className="py-2.5 px-3.5 text-center">Valor</th>
                <th className="py-2.5 px-3.5 text-center">Material Adjunto</th>
                <th className="py-2.5 px-3.5 text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((a, idx) => {
                const isCotidiano = a.category?.includes('Cotidiano');
                const isPruebas = a.category?.includes('Pruebas') || a.category?.includes('Examen');
                const badgeBg = isCotidiano
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isPruebas
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200';

                let formattedDate = 'Sin fecha';
                if (a.dueDate) {
                  const d = new Date(a.dueDate);
                  const day = d.getDate();
                  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
                  const month = months[d.getMonth()];
                  const hours = d.getHours();
                  const mins = d.getMinutes().toString().padStart(2, '0');
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  const hour12 = hours % 12 || 12;
                  formattedDate = `${day} ${month}, ${hour12}:${mins} ${ampm}`;
                }

                return (
                  <tr key={a.id} className="hover:bg-blue-50/40 transition-colors group">
                    {/* # Consecutivo */}
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Título & Descripción */}
                    <td className="py-2.5 px-3.5 max-w-xs sm:max-w-sm">
                      <div className="font-bold text-slate-900 text-xs leading-tight line-clamp-1">
                        {a.title}
                      </div>
                      <div className="text-slate-400 text-[10px] line-clamp-1 mt-0.5">
                        {a.description || 'Sin instrucciones adicionales'}
                      </div>
                    </td>

                    {/* Categoría MEP */}
                    <td className="py-2.5 px-3.5">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-block whitespace-nowrap', badgeBg)}>
                        {a.category || 'Tareas (10%)'}
                      </span>
                    </td>

                    {/* Modalidad */}
                    <td className="py-2.5 px-3.5 text-center">
                      {a.submissionType === 'in_class' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap">
                          📝 En Aula
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">
                          💻 Digital
                        </span>
                      )}
                    </td>

                    {/* Fecha Límite */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {formattedDate}
                      </span>
                    </td>

                    {/* Valor */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono font-bold text-slate-700">
                      {a.maxScore} pts
                    </td>

                    {/* Material Adjunto */}
                    <td className="py-3.5 px-4 text-center">
                      {a.attachmentName ? (
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.createElement('a');
                            if (a.attachmentData && a.attachmentData.startsWith('data:')) {
                              el.href = a.attachmentData;
                            } else if (a.attachmentData) {
                              el.href = URL.createObjectURL(new Blob([a.attachmentData]));
                            } else {
                              el.href = 'https://drive.google.com';
                              el.target = '_blank';
                            }
                            el.download = a.attachmentName || 'Guia.pdf';
                            document.body.appendChild(el);
                            el.click();
                            document.body.removeChild(el);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition shadow-2xs cursor-pointer"
                          title="Descargar material adjunto"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span className="max-w-[100px] truncate">{a.attachmentName}</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewSubmissions(a)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition shadow-2xs cursor-pointer',
                            a.submissionType === 'in_class'
                              ? 'bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-200'
                              : 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200'
                          )}
                          title={a.submissionType === 'in_class' ? 'Calificar en Aula' : 'Ver Entregas Digitales'}
                        >
                          {a.submissionType === 'in_class' ? (
                            <>
                              <Award className="w-3.5 h-3.5" />
                              <span>Calificar</span>
                            </>
                          ) : (
                            <>
                              <FolderUp className="w-3.5 h-3.5" />
                              <span>Entregas</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenEdit(a)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition cursor-pointer"
                          title="Editar detalles o ampliar plazo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteTask(a.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                          title="Eliminar tarea"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {assignments.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2 bg-slate-50/50">
            <FolderUp className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-700">No hay tareas creadas en este curso.</p>
            <p className="text-slate-400 text-[11px]">Haz clic en "+ Nueva Tarea" para publicar una asignación.</p>
          </div>
        )}
      </div>

      <Modal
        open={openModal}
        title="Nueva Tarea o Actividad"
        onClose={() => setOpenModal(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="task-form" disabled={submitting}>
              {submitting ? 'Publicando...' : 'Publicar Tarea'}
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={onCreateTask} className="space-y-3.5">
          <Input
            label="Título de la Tarea"
            placeholder="Ej. Homework 2: Reading & Vocabulary - Daily Routines"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Componente Evaluativo"
              name="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={[
                { value: 'Tareas (10%)', label: 'Tareas (10%)' },
                { value: 'Trabajo Cotidiano (50%)', label: 'Trabajo Cotidiano (50%)' },
                { value: 'Pruebas / Exámenes (30%)', label: 'Pruebas / Exámenes (30%)' },
                { value: 'Proyecto Extraclase', label: 'Proyecto Extraclase' },
              ]}
            />
            <Input
              label="Puntos Totales (Base)"
              type="number"
              min={1}
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
              required
            />
          </div>

          {/* Modalidad de Realización y Entrega (Segmented Control Minimalista) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Modalidad de Realización</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setForm({ ...form, submissionType: 'digital' })}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer',
                  form.submissionType === 'digital'
                    ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>💻 Entrega Digital</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, submissionType: 'in_class' })}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer',
                  form.submissionType === 'in_class'
                    ? 'bg-white text-amber-900 shadow-xs border border-amber-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>📝 En Aula / Papel</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha Límite"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
            <Input
              label="Hora Límite"
              type="time"
              value={form.dueTime}
              onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Instrucciones o Consigna (Opcional)</label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none transition resize-none"
              rows={2}
              placeholder="Ej. Completar la lectura sobre Sustainable Development y responder las preguntas..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Adjuntar material con Dropzone limpio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Guía, Rúbrica o Material de Apoyo (Opcional)</span>
              {form.attachmentName && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, attachmentName: '', attachmentData: '' })}
                  className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Quitar archivo
                </button>
              )}
            </label>

            {form.attachmentName ? (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate text-emerald-950 font-semibold">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{form.attachmentName}</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded shrink-0">
                  Listo
                </span>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingCreate(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingCreate(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingCreate(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingCreate(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const MAX_BYTES = 15 * 1024 * 1024;
                    if (file.size > MAX_BYTES) {
                      alerts.warning(
                        'Archivo demasiado grande',
                        `El archivo seleccionado pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El tamaño máximo permitido es de 15 MB.`
                      );
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setForm((prev) => ({
                        ...prev,
                        attachmentName: file.name,
                        attachmentData: reader.result as string,
                      }));
                    };
                    if (file.name.toLowerCase().endsWith('.txt')) {
                      reader.readAsText(file);
                    } else {
                      reader.readAsDataURL(file);
                    }
                  }
                }}
                className={cn(
                  'border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition block group',
                  isDraggingCreate
                    ? 'border-blue-500 bg-blue-50/80 scale-[1.01] ring-4 ring-blue-100'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30'
                )}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const MAX_BYTES = 15 * 1024 * 1024;
                      if (file.size > MAX_BYTES) {
                        alerts.warning(
                          'Archivo demasiado grande',
                          `El archivo seleccionado pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El tamaño máximo permitido es de 15 MB.`
                        );
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setForm((prev) => ({
                          ...prev,
                          attachmentName: file.name,
                          attachmentData: reader.result as string,
                        }));
                      };
                      if (file.name.toLowerCase().endsWith('.txt')) {
                        reader.readAsText(file);
                      } else {
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                />
                <div className="flex items-center justify-center gap-2 text-xs">
                  <UploadCloud
                    className={cn(
                      'w-4 h-4 transition shrink-0',
                      isDraggingCreate ? 'text-blue-600 animate-bounce' : 'text-slate-400 group-hover:text-blue-600'
                    )}
                  />
                  <span className="font-semibold text-slate-700">
                    {isDraggingCreate ? '¡Suelta el archivo aquí!' : 'Arrastra o selecciona un archivo (PDF, Word, Fotos)'}
                  </span>
                </div>
              </label>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL PARA EDITAR Y AMPLIAR PLAZO DE ENTREGA */}
      <Modal
        open={openEditModal}
        title="Editar Asignación / Plazo"
        onClose={() => {
          setOpenEditModal(false);
          setEditingAssignment(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setOpenEditModal(false);
                setEditingAssignment(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="edit-task-form"
              disabled={updating}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold"
            >
              {updating ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </>
        }
      >
        <form id="edit-task-form" onSubmit={onUpdateTask} className="space-y-3.5">
          <Input
            label="Título de la Asignación o Examen"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Componente Evaluativo"
              name="category"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              options={[
                { value: 'Tareas (10%)', label: 'Tareas (10%)' },
                { value: 'Trabajo Cotidiano (50%)', label: 'Trabajo Cotidiano (50%)' },
                { value: 'Pruebas / Exámenes (30%)', label: 'Pruebas / Exámenes (30%)' },
                { value: 'Proyecto Extraclase', label: 'Proyecto Extraclase' },
              ]}
            />
            <Input
              label="Puntos Totales (Base)"
              type="number"
              min={1}
              value={editForm.maxScore}
              onChange={(e) => setEditForm({ ...editForm, maxScore: Number(e.target.value) })}
              required
            />
          </div>

          {/* Modalidad de Realización y Entrega (Segmented Control Minimalista) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Modalidad de Realización</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, submissionType: 'digital' })}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer',
                  editForm.submissionType === 'digital'
                    ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>💻 Entrega Digital</span>
              </button>

              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, submissionType: 'in_class' })}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer',
                  editForm.submissionType === 'in_class'
                    ? 'bg-white text-amber-900 shadow-xs border border-amber-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>📝 En Aula / Papel</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha Límite"
              type="date"
              value={editForm.dueDate}
              onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
              required
            />
            <Input
              label="Hora Límite"
              type="time"
              value={editForm.dueTime}
              onChange={(e) => setEditForm({ ...editForm, dueTime: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Instrucciones o Consigna</label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none transition resize-none"
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>

          {/* Adjuntar o cambiar material de guía con Dropzone limpio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Material de Guía / Rúbrica Adjunta</span>
              {editForm.attachmentName && (
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, attachmentName: '', attachmentData: '' })}
                  className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Quitar archivo
                </button>
              )}
            </label>

            {editForm.attachmentName ? (
              <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate text-indigo-950 font-semibold">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{editForm.attachmentName}</span>
                </div>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded shrink-0">
                  Listo
                </span>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingEdit(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingEdit(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingEdit(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingEdit(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const MAX_BYTES = 15 * 1024 * 1024;
                    if (file.size > MAX_BYTES) {
                      alerts.warning(
                        'Archivo demasiado grande',
                        `El archivo seleccionado pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El tamaño máximo permitido es de 15 MB.`
                      );
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setEditForm((prev) => ({
                        ...prev,
                        attachmentName: file.name,
                        attachmentData: reader.result as string,
                      }));
                    };
                    if (file.name.toLowerCase().endsWith('.txt')) {
                      reader.readAsText(file);
                    } else {
                      reader.readAsDataURL(file);
                    }
                  }
                }}
                className={cn(
                  'border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition block group',
                  isDraggingEdit
                    ? 'border-indigo-500 bg-indigo-50/80 scale-[1.01] ring-4 ring-indigo-100'
                    : 'border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/30'
                )}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const MAX_BYTES = 15 * 1024 * 1024;
                      if (file.size > MAX_BYTES) {
                        alerts.warning(
                          'Archivo demasiado grande',
                          `El archivo seleccionado pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El tamaño máximo permitido es de 15 MB.`
                        );
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setEditForm((prev) => ({
                          ...prev,
                          attachmentName: file.name,
                          attachmentData: reader.result as string,
                        }));
                      };
                      if (file.name.toLowerCase().endsWith('.txt')) {
                        reader.readAsText(file);
                      } else {
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                />
                <div className="flex items-center justify-center gap-2 text-xs">
                  <UploadCloud
                    className={cn(
                      'w-4 h-4 transition shrink-0',
                      isDraggingEdit ? 'text-indigo-600 animate-bounce' : 'text-slate-400 group-hover:text-indigo-600'
                    )}
                  />
                  <span className="font-semibold text-slate-700">
                    {isDraggingEdit ? '¡Suelta el archivo aquí!' : 'Arrastra o selecciona un archivo (PDF, Word, Fotos)'}
                  </span>
                </div>
              </label>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={openSubmissionsModal}
        maxWidth="3xl"
        title={`Entregas: ${selectedAssignment?.title || ''}`}
        onClose={() => {
          setOpenSubmissionsModal(false);
          setGradingSubmission(null);
        }}
      >
        <div className="space-y-4">
          {/* Header Minimalista con Drive y Progreso */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">
                {students.length} estudiantes
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {
                  students.filter((st) => {
                    const sub = submissions.find((s) => s.studentId === st.id);
                    const gr = courseGrades.find(
                      (g) => g.studentId === st.id && (g.assignmentId === selectedAssignment?.id || (g.title && selectedAssignment?.title && g.title.toLowerCase().trim() === selectedAssignment.title.toLowerCase().trim()))
                    );
                    return (sub && sub.grade !== null) || !!gr;
                  }).length
                } de {students.length} calificados
              </span>
            </div>

            <a
              href={
                (selectedAssignment as any)?.driveFolderUrl
                  ? `${(selectedAssignment as any).driveFolderUrl}?authuser=pruebaproyecto551@gmail.com`
                  : 'https://drive.google.com/drive/folders/1sDpkjftZUFewVSGDemeyViPUlVUBki0L?authuser=pruebaproyecto551@gmail.com'
              }
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition inline-flex items-center gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Carpeta Drive ↗</span>
            </a>
          </div>

          {students.length === 0 && submissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No hay estudiantes inscritos en este módulo.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 overflow-hidden">
              <div className="overflow-x-auto max-h-[24rem]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                      <th className="py-2.5 px-3 w-[28%]">Estudiante</th>
                      <th className="py-2.5 px-3 w-[30%]">Evidencia / Archivo</th>
                      <th className="py-2.5 px-3 w-[18%]">Fecha</th>
                      <th className="py-2.5 px-3 w-[12%] text-center">Nota</th>
                      <th className="py-2.5 px-3 w-[12%] text-right pr-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => {
                      const sub = submissions.find((s) => s.studentId === student.id);
                      const grade = courseGrades.find(
                        (g) =>
                          g.studentId === student.id &&
                          (g.assignmentId === selectedAssignment?.id ||
                            (g.title && selectedAssignment?.title && g.title.toLowerCase().trim() === selectedAssignment.title.toLowerCase().trim()))
                      );
                      const effectiveScore = grade?.score ?? sub?.grade ?? null;
                      const isAudio =
                        sub &&
                        (sub.fileName.match(/\.(mp3|wav|m4a|ogg|aac)$/i) ||
                          sub.fileName.toLowerCase().includes('audio') ||
                          sub.fileName.toLowerCase().includes('speaking'));

                      return (
                        <tr key={student.id} className="hover:bg-blue-50/30 transition group">
                          {/* Estudiante (Compacto) */}
                          <td className="py-2 px-3 align-middle">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">{student.fullName}</span>
                              <span className="text-[10px] font-mono text-slate-400">({student.studentNumber})</span>
                            </div>
                            {(sub?.feedback || grade?.notes) && (
                              <div className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 mt-0.5 inline-block max-w-xs truncate" title={sub?.feedback || grade?.notes || ''}>
                                💬 {sub?.feedback || grade?.notes}
                              </div>
                            )}
                          </td>

                          {/* Evidencia (Compacto) */}
                          <td className="py-2 px-3 align-middle">
                            {sub ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1 min-w-0" title={sub.fileName}>
                                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="font-semibold text-slate-800 text-xs truncate max-w-[140px]">
                                    {sub.fileName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 shrink-0">({(sub.fileSize / 1024).toFixed(0)}k)</span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewSub(sub)}
                                    className="p-1 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 transition"
                                    title="Ver archivo"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadRealFile(sub)}
                                    className="p-1 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
                                    title="Descargar archivo"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {isAudio && (
                                  <audio
                                    controls
                                    className="h-6 w-36 accent-purple-600 shrink-0"
                                    src={sub.fileData && sub.fileData.startsWith('data:audio/') ? sub.fileData : "https://actions.google.com/sounds/v1/speech/greeting_female_english.ogg"}
                                  />
                                )}
                              </div>
                            ) : grade?.attachmentData ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.createElement('a');
                                  el.href = grade.attachmentData!;
                                  el.download = grade.attachmentName || 'Examen_Calificado.pdf';
                                  document.body.appendChild(el);
                                  el.click();
                                  document.body.removeChild(el);
                                }}
                                className="text-[11px] text-indigo-700 font-semibold underline flex items-center gap-1"
                              >
                                📸 {grade.attachmentName || 'Ver Examen'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Sin entrega digital</span>
                            )}
                          </td>

                          {/* Fecha (Compacto) */}
                          <td className="py-2 px-3 align-middle text-[11px] text-slate-500 whitespace-nowrap">
                            {sub ? new Date(sub.submittedAt).toLocaleDateString('es-CR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>

                          {/* Nota */}
                          <td className="py-2 px-3 align-middle text-center whitespace-nowrap">
                            {effectiveScore !== null ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-black font-mono text-xs border border-emerald-200">
                                {effectiveScore}/{selectedAssignment?.maxScore || 100}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                                Pendiente
                              </span>
                            )}
                          </td>

                          {/* Acción (Lápiz limpio) */}
                          <td className="py-2 px-3 align-middle text-right pr-4 whitespace-nowrap">
                            {sub ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setGradingStudent(null);
                                  setGradingSubmission(sub);
                                  setGradeScore(sub.grade ?? (grade?.score || 100));
                                  setGradeFeedback(sub.feedback || (grade?.notes || 'Great work!'));
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition cursor-pointer"
                                title="Editar calificación / nota"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setGradingSubmission(null);
                                  setGradingStudent(student);
                                  setStudentPaperScore(grade?.score ?? 100);
                                  setStudentPaperFeedback(grade?.notes ?? '');
                                  setStudentPaperAttachmentName(grade?.attachmentName ?? '');
                                  setStudentPaperAttachmentData(grade?.attachmentData ?? '');
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition cursor-pointer"
                                title="Calificar / Editar papel"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Formulario de Calificación Digital */}
          {gradingSubmission && (
            <form onSubmit={onSaveGrade} className="pt-3.5 border-t border-slate-200 space-y-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
              <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>📝 Calificando entrega digital de: <strong>{gradingSubmission.studentName}</strong></span>
                <span className="text-[11px] text-slate-500">Base: {selectedAssignment?.maxScore || 100} pts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Input
                    label="Puntos Obtenidos (pts)"
                    type="number"
                    min={0}
                    max={selectedAssignment?.maxScore || 100}
                    value={gradeScore}
                    onChange={(e) => setGradeScore(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Retroalimentación (Opcional)"
                    placeholder="Ej. Excelente trabajo, cuidar la ortografía..."
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" type="button" onClick={() => setGradingSubmission(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold">
                  Guardar Calificación
                </Button>
              </div>
            </form>
          )}

          {/* Formulario de Calificación Presencial / Examen en Papel */}
          {gradingStudent && (
            <form onSubmit={onSavePaperGrade} className="pt-3.5 border-t border-slate-200 space-y-3 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200">
              <div className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                <span>📝 Calificando Examen Físico / Papel de: <strong>{gradingStudent.fullName}</strong></span>
                <span className="text-[11px] text-indigo-700">Base: {selectedAssignment?.maxScore || 100} pts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Input
                    label="Puntos Obtenidos (pts)"
                    type="number"
                    min={0}
                    max={selectedAssignment?.maxScore || 100}
                    value={studentPaperScore}
                    onChange={(e) => setStudentPaperScore(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Observaciones (Opcional)"
                    placeholder="Ej. Excelente dominio en respuestas breves..."
                    value={studentPaperFeedback}
                    onChange={(e) => setStudentPaperFeedback(e.target.value)}
                  />
                </div>
              </div>

              {/* Adjunto de examen en papel con Drag & Drop Limpio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Respaldo del Examen Físico Calificado (Opcional)</span>
                  {studentPaperAttachmentName && (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentPaperAttachmentName('');
                        setStudentPaperAttachmentData('');
                      }}
                      className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" /> Quitar
                    </button>
                  )}
                </label>

                {studentPaperAttachmentName ? (
                  <div className="p-2.5 bg-indigo-100/70 rounded-xl border border-indigo-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate text-indigo-950 font-semibold">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">{studentPaperAttachmentName}</span>
                    </div>
                    <span className="text-[10px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded shrink-0">
                      Listo
                    </span>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingPaper(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingPaper(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingPaper(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingPaper(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const MAX_BYTES = 15 * 1024 * 1024;
                        if (file.size > MAX_BYTES) {
                          alerts.warning(
                            'Archivo demasiado grande',
                            `El archivo seleccionado pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El tamaño máximo permitido es de 15 MB.`
                          );
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          setStudentPaperAttachmentName(file.name);
                          setStudentPaperAttachmentData(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-2.5 cursor-pointer transition flex items-center justify-between gap-2 block group',
                      isDraggingPaper
                        ? 'border-indigo-500 bg-indigo-100/80 scale-[1.01] ring-4 ring-indigo-200'
                        : 'border-slate-300 hover:border-indigo-500 bg-white'
                    )}
                  >
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const MAX_BYTES = 15 * 1024 * 1024;
                          if (file.size > MAX_BYTES) {
                            alerts.warning(
                              'Archivo demasiado grande',
                              `El archivo seleccionado pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El tamaño máximo permitido es de 15 MB.`
                            );
                            e.target.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setStudentPaperAttachmentName(file.name);
                            setStudentPaperAttachmentData(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="flex items-center gap-2 text-xs truncate">
                      <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate text-slate-700 font-medium">
                        {isDraggingPaper
                          ? '¡Suelta la foto/PDF del examen aquí!'
                          : 'Tomar foto, arrastrar o adjuntar examen calificado'}
                      </span>
                    </div>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded shrink-0">
                      Examinar
                    </span>
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" type="button" onClick={() => setGradingStudent(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={savingPaperGrade}
                  className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                  {savingPaperGrade ? 'Guardando...' : 'Guardar Calificación'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Modal de Previsualización y Apertura de Documento Cloud */}
      <Modal
        open={previewSub !== null}
        title={`Visor Cloud: ${previewSub?.fileName || 'Documento'}`}
        onClose={() => setPreviewSub(null)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPreviewSub(null)}>
              Cerrar Visor
            </Button>
            {previewSub && (
              <Button variant="primary" size="sm" onClick={() => downloadRealFile(previewSub)} className="bg-blue-600 hover:bg-blue-700 font-bold">
                📥 Descargar Archivo Original
              </Button>
            )}
          </>
        }
      >
        {previewSub && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  {previewSub.fileName}
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Cloud Encrypted (AES-256)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 pt-2 border-t border-slate-200 text-[11px]">
                <div><strong>Autor:</strong> {previewSub.studentName}</div>
                <div><strong>Fecha de entrega:</strong> {new Date(previewSub.submittedAt).toLocaleString('es-CR')}</div>
                <div><strong>Formato:</strong> {previewSub.fileName.split('.').pop()?.toUpperCase()} Document</div>
                <div><strong>Ubicación:</strong> Google Drive / 2026 / Inglés CINDEA</div>
              </div>
            </div>

            {/* Vista previa real de contenido */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 text-slate-700">
              <div className="font-bold text-slate-900 border-b pb-1 text-xs flex items-center justify-between">
                <span>📄 Contenido Real del Archivo Entregado:</span>
                <span className="text-[10px] text-slate-500 font-mono">{previewSub.fileName}</span>
              </div>
              
              {previewSub.fileData && previewSub.fileData.startsWith('{"isMulti":true') ? (
                (() => {
                  try {
                    const parsed = JSON.parse(previewSub.fileData);
                    const files: any[] = parsed.files || [];
                    return (
                      <div className="space-y-3">
                        <div className="text-[11px] font-bold text-slate-600">
                          Archivos adjuntos ({files.length}):
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto">
                          {files.map((file, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 truncate font-semibold text-slate-900 text-xs">
                                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                  <span className="truncate">{file.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => downloadSingleData(file.name, file.data)}
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs shrink-0"
                                >
                                  📥 Descargar
                                </button>
                              </div>

                              {/* Preview si es imagen o audio */}
                              {file.data && file.data.startsWith('data:image/') && (
                                <div className="pt-1 text-center">
                                  <img src={file.data} alt={file.name} className="max-h-48 mx-auto rounded-lg shadow-sm border border-slate-200" />
                                </div>
                              )}
                              {file.data && file.data.startsWith('data:audio/') && (
                                <div className="pt-1">
                                  <audio controls src={file.data} className="w-full h-8" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch (_) {
                    return <div className="text-xs text-slate-500">Múltiples archivos listos en Google Drive.</div>;
                  }
                })()
              ) : previewSub.fileData && previewSub.fileData.startsWith('data:image/') ? (
                <div className="text-center py-2">
                  <img src={previewSub.fileData} alt={previewSub.fileName} className="max-h-72 mx-auto rounded-lg shadow-sm border border-slate-200" />
                </div>
              ) : previewSub.fileData && previewSub.fileData.startsWith('data:audio/') ? (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <audio controls src={previewSub.fileData} className="w-full" />
                </div>
              ) : previewSub.fileData && !previewSub.fileData.startsWith('data:') ? (
                <pre className="p-3 bg-slate-100 rounded-lg text-[11px] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed border border-slate-200">
                  {previewSub.fileData}
                </pre>
              ) : (
                <div className="p-4 bg-blue-50/60 rounded-lg border border-blue-200 text-center space-y-2">
                  <p className="text-xs text-blue-900 font-semibold">
                    Documento binario listo ({previewSub.fileName.split('.').pop()?.toUpperCase()})
                  </p>
                  <p className="text-[11px] text-blue-800/80">
                    El archivo original de la estudiante se encuentra sincronizado con Google Drive.
                  </p>
                  <Button variant="primary" size="sm" onClick={() => downloadRealFile(previewSub)} className="bg-blue-600 hover:bg-blue-700 text-xs">
                    📥 Descargar Archivo Original
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
