import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { studentsService } from '../services/students.service';
import type { Course, Student } from '../types';
import { alerts } from '../utils/alerts';
import { cn } from '../utils';
import {
  Plus,
  CalendarCheck,
  GraduationCap,
  Users,
  Trash2,
  CheckCircle2,
  Building2,
  LayoutGrid,
  List,
  Clock,
} from 'lucide-react';

interface FormState {
  name: string;
  code: string;
  description: string;
  color: string;
}

const emptyForm: FormState = { name: '', code: '', description: '', color: '#2563eb' };

export function Courses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseStudentCounts, setCourseStudentCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState<CourseStudent[]>([]);
  const [available, setAvailable] = useState<Student[]>([]);

  const load = async () => {
    try {
      const cs = await coursesService.list();
      setCourses(cs);

      // Cargar conteo de estudiantes por grupo
      const counts: Record<string, number> = {};
      await Promise.all(
        cs.map(async (c) => {
          try {
            const list = await coursesService.listStudents(c.id);
            counts[c.id] = list.length;
          } catch {
            counts[c.id] = 0;
          }
        })
      );
      setCourseStudentCounts(counts);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al cargar grupos');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await coursesService.create({
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        color: form.color,
      });
      setOpen(false);
      setForm(emptyForm);
      setSuccessMsg('¡Nuevo grupo / sede creado con éxito en la nube!');
      load();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al crear el grupo');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string, name: string) => {
    const ok = await alerts.confirmDelete(
      `¿Eliminar grupo "${name}"?`,
      'Se desvincularán sus listas de estudiantes y actas asociadas.'
    );
    if (!ok) return;
    try {
      await coursesService.remove(id);
      alerts.success('Grupo eliminado', `El grupo "${name}" fue eliminado correctamente.`);
      load();
    } catch (e: any) {
      alerts.error('Error al eliminar', e?.response?.data?.error ?? 'Error al eliminar el grupo');
    }
  };

  const isSameLevel = (course: Course, studentGradeLevel?: string | null): boolean => {
    if (!studentGradeLevel) return false;
    const courseStr = `${course.name} ${course.code || ''} ${course.description || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const studStr = studentGradeLevel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 11° Año / Bachillerato
    const courseIs11 = courseStr.includes('11') || courseStr.includes('bachillerato') || courseStr.includes('modulo v') || courseStr.includes('modulo 5');
    const studIs11 = studStr.includes('11') || studStr.includes('bachillerato') || studStr.includes('modulo v') || studStr.includes('modulo 5');
    if (courseIs11 || studIs11) return courseIs11 && studIs11;

    // 10° Año / Diversificada / Modulo IV
    const courseIs10 = courseStr.includes('10') || courseStr.includes('modulo iv') || courseStr.includes('modulo 4') || courseStr.includes('diversificada');
    const studIs10 = studStr.includes('10') || studStr.includes('modulo iv') || studStr.includes('modulo 4') || studStr.includes('diversificada');
    if (courseIs10 || studIs10) return courseIs10 && studIs10;

    // 9° Año / Modulo III
    const courseIs9 = courseStr.includes('9') || courseStr.includes('modulo iii') || courseStr.includes('modulo 3') || courseStr.includes('tercer ciclo');
    const studIs9 = studStr.includes('9') || studStr.includes('modulo iii') || studStr.includes('modulo 3') || studStr.includes('tercer ciclo');
    if (courseIs9 || studIs9) return courseIs9 && studIs9;

    // 7° y 8° Año / Modulo I / Modulo II / Basico
    const courseIs78 = courseStr.includes('7') || courseStr.includes('8') || courseStr.includes('modulo i') || courseStr.includes('modulo ii') || courseStr.includes('basico');
    const studIs78 = studStr.includes('7') || studStr.includes('8') || studStr.includes('modulo i') || studStr.includes('modulo ii') || studStr.includes('basico');
    if (courseIs78 || studIs78) return courseIs78 && studIs78;

    return false;
  };

  const openEnroll = async (course: Course) => {
    setEnrollCourse(course);
    setError(null);
    try {
      const [enrolledList, allStudents] = await Promise.all([
        coursesService.listStudents(course.id),
        studentsService.list(),
      ]);
      setEnrolled(enrolledList);
      
      // Filtrar ÚNICAMENTE estudiantes del MISMO NIVEL académico que NO tengan grupo asignado actualmente
      const unassignedStudents = allStudents.filter((s) => !s.courseId);
      const sameLevelOnly = unassignedStudents.filter((s) => isSameLevel(course, s.gradeLevel));
      setAvailable(sameLevelOnly);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al cargar lista de alumnos');
    }
  };

  const enroll = async (studentId: string) => {
    if (!enrollCourse) return;
    await coursesService.enroll(enrollCourse.id, studentId);
    openEnroll(enrollCourse);
    load();
  };

  const unenroll = async (studentId: string) => {
    if (!enrollCourse) return;
    await coursesService.unenroll(enrollCourse.id, studentId);
    openEnroll(enrollCourse);
    load();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Minimalista & Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600 shrink-0" />
            <span>Grupos & Secciones</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total activos: <strong className="text-slate-800 font-semibold">{courses.length} grupos</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Selector de Vista */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
              title="Vista de Tarjetas Coquetas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer',
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
              title="Vista de Tabla Compacta"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>

          <Button
            onClick={() => setOpen(true)}
            className="font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl shadow-xs shrink-0 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Grupo</span>
          </Button>
        </div>
      </div>

      {/* Notificaciones */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* 2. VISTA DE TARJETAS COQUETAS (GRID) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const studentCount = courseStudentCounts[course.id] ?? 0;
            return (
              <div
                key={course.id}
                className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Franja de Acento de Color */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: course.color || '#2563EB' }}
                />

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {/* Encabezado de la Tarjeta */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center font-mono font-extrabold text-[11px] bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-md border border-blue-200/80">
                        {course.code || 'ING'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEnroll(course)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 text-[11px] font-bold transition cursor-pointer"
                        title="Gestionar matrícula de alumnos de este grupo"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>{studentCount} {studentCount === 1 ? 'alumno' : 'alumnos'}</span>
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                      {course.name}
                    </h3>

                    {course.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 flex items-start gap-1">
                        <Clock className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                        <span>{course.description}</span>
                      </p>
                    )}
                  </div>

                  {/* Acciones Rápidas Coquetas */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1.5 flex-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/attendance?courseId=${course.id}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200/80 font-bold text-xs transition cursor-pointer shadow-2xs"
                        title="Pasar Lista de Asistencia"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Lista</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/grades?courseId=${course.id}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200/80 font-bold text-xs transition cursor-pointer shadow-2xs"
                        title="Ver Calificaciones MEP"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Notas</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDelete(course.id, course.name)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer shrink-0"
                      title="Eliminar grupo"
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

      {/* 3. VISTA DE TABLA COMPACTA */}
      {viewMode === 'table' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 select-none">
                  <th className="py-3 px-4 w-10 text-center">#</th>
                  <th className="py-3 px-4 w-28">Código</th>
                  <th className="py-3 px-4">Grupo / Sede</th>
                  <th className="py-3 px-4">Descripción / Horario</th>
                  <th className="py-3 px-4 text-center">Matrícula</th>
                  <th className="py-3 px-4 text-right pr-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((course, idx) => {
                  const studentCount = courseStudentCounts[course.id] ?? 0;
                  return (
                    <tr key={course.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center font-mono font-bold text-xs bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                          {course.code || 'ING'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: course.color || '#2563EB' }}
                          />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {course.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {course.description || 'Grupo oficial matriculado en CINDEA'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openEnroll(course)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                          title="Administrar alumnos"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>{studentCount}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/attendance?courseId=${course.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-bold text-xs transition shadow-2xs cursor-pointer"
                            title="Pasar Lista de Asistencia"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>Lista</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/grades?courseId=${course.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-bold text-xs transition shadow-2xs cursor-pointer"
                            title="Ver Calificaciones MEP"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Notas</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDelete(course.id, course.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                            title="Eliminar grupo"
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
        </div>
      )}

      {/* 3. Modal: Crear Nuevo Grupo / Sede */}
      <Modal
        open={open}
        title="Registrar Nuevo Grupo / Sede CINDEA"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="course-form"
              disabled={submitting}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {submitting ? 'Guardando en la Nube...' : 'Guardar Grupo'}
            </Button>
          </div>
        }
      >
        <form id="course-form" onSubmit={onCreate} className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span>Ejemplo para múltiples sedes:</span>
            </p>
            <p className="text-[11px] text-blue-900/80">
              Si te asignan lecciones en otra sede, puedes llamarlo: <strong>Inglés 10° Año - Satélite Bebedero</strong> con código <strong>ING-10-BEBEDERO</strong>.
            </p>
          </div>

          <Input
            label="Nombre Completo del Grupo / Nivel"
            placeholder="Ej. Inglés 10° Año (Módulo IV) - Satélite Bebedero"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Input
            label="Código Identificador Único"
            placeholder="Ej. ING-10-BEBEDERO o ING-11-CENTRAL"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
            required
          />

          <Textarea
            label="Detalles de Horario y Sede (Opcional)"
            placeholder="Ej. Sede Satelital Bebedero • Horario: Jueves 6:00 PM a 9:00 PM"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
        </form>
      </Modal>

      {/* 4. Modal: Administrar Alumnos del Grupo */}
      <Modal
        open={!!enrollCourse}
        title={`Matrícula de Alumnos · ${enrollCourse?.name ?? ''}`}
        onClose={() => setEnrollCourse(null)}
      >
        <div className="space-y-4 text-xs">
          <div>
            <h3 className="mb-2 font-bold text-slate-800 flex items-center justify-between">
              <span>Alumnos Matriculados en este Grupo</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                {enrolled.length} alumnos
              </span>
            </h3>
            {enrolled.length === 0 ? (
              <p className="text-slate-400 p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Aún no hay estudiantes asignados a esta sede/grupo.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {enrolled.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{s.fullName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.studentNumber || s.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => unenroll(s.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition"
                    >
                      Desvincular
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="mb-2 font-bold text-slate-800 flex items-center justify-between">
              <span>Estudiantes de este Nivel Sin Asignar</span>
              {available.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                  {available.length} disponibles
                </span>
              )}
            </h3>
            {available.length === 0 ? (
              <p className="text-slate-400 p-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-[11px]">
                ✓ No hay estudiantes pendientes de asignar para este nivel académico.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {available.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200 shadow-2xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{s.fullName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.studentNumber || s.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => enroll(s.id)}
                      className="text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                    >
                      Asignar a este Grupo
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
