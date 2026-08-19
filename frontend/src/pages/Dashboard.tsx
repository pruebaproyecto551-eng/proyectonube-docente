import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { coursesService } from '../services/courses.service';
import { studentsService } from '../services/students.service';
import { justificationsService } from '../services/justifications.service';
import type { Course, Justification, Student } from '../types';
import { Modal } from '../components/Modal';
import {
  CalendarCheck,
  GraduationCap,
  Users,
  ArrowRight,
  BookOpen,
  Paperclip,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/Button';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingJustifications, setPendingJustifications] = useState<Justification[]>([]);
  const [reviewingJust, setReviewingJust] = useState<Justification | null>(null);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [processingReview, setProcessingReview] = useState<boolean>(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    coursesService.list().then(setCourses).catch(() => {});
    studentsService.list().then(setStudents).catch(() => {});
    justificationsService.list({ status: 'pending' }).then(setPendingJustifications).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!reviewingJust) return;
    setProcessingReview(true);
    try {
      await justificationsService.review(reviewingJust.id, {
        status,
        teacherComment:
          reviewComment.trim() ||
          (status === 'approved'
            ? 'Comprobante médico/oficial válido y aceptado.'
            : 'Comprobante no válido para justificación.'),
      });
      setReviewSuccessMsg(
        status === 'approved'
          ? `✅ Justificación de ${reviewingJust.studentName} APROBADA. La ausencia del ${reviewingJust.absenceDate} quedó formalmente JUSTIFICADA en el sistema.`
          : `❌ Justificación de ${reviewingJust.studentName} RECHAZADA.`
      );
      loadData();
      setTimeout(() => {
        setReviewingJust(null);
        setReviewComment('');
        setReviewSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Error al procesar la justificación');
    } finally {
      setProcessingReview(false);
    }
  };

  const totalEnrolled = students.filter((s) => s.courseId).length;

  return (
    <div className="space-y-6">
      {/* 1. Encabezado Ejecutivo y Limpio */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-xs font-semibold text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Periodo Lectivo 2026 · CINDEA MEP</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              ¡Hola, {user?.fullName || 'Docente'}! 👋
            </h1>
            <p className="text-xs md:text-sm text-slate-300">
              Panel docente institucional para la gestión académica, asistencia y calificaciones de inglés.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/attendance')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Control de Asistencia</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/grades')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-200" />
              <span>Libro de Calificaciones</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Indicadores Clave del Semestre (Métricas Ejecutivas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Métrica 1: Grupos Activos */}
        <div
          onClick={() => navigate('/courses')}
          className="cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grupos y Sedes</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">{courses.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Secciones asignadas en CINDEA</p>
        </div>

        {/* Métrica 2: Estudiantes Matriculados */}
        <div
          onClick={() => navigate('/students')}
          className="cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estudiantes Activos</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">{totalEnrolled}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Alumnos matriculados en lista oficial</p>
        </div>

        {/* Métrica 3: Justificaciones de Ausencia */}
        <div
          onClick={() => navigate('/attendance')}
          className="cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:border-amber-300 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Justificaciones</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:bg-amber-600 group-hover:text-white transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">
            {pendingJustifications.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {pendingJustifications.length === 0 ? 'Sin trámites pendientes' : 'Comprobantes por validar'}
          </p>
        </div>
      </div>

      {/* 3. Comprobantes de Ausencia Pendientes (Solo se muestra cuando hay solicitudes) */}
      {pendingJustifications.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/50 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <span>Comprobantes de Ausencia por Validar</span>
                  <span className="px-2 py-0.2 rounded-full bg-amber-200 text-amber-900 text-xs font-bold">
                    {pendingJustifications.length}
                  </span>
                </h2>
                <p className="text-[11px] text-amber-800">
                  Estudiantes han remitido comprobantes que requieren revisión para aplicar justificación reglamentaria.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/attendance')}
              className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0"
            >
              Ver en Asistencia
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingJustifications.map((j) => (
              <div
                key={j.id}
                className="bg-white rounded-xl border border-amber-200 p-4 shadow-2xs flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{j.studentName}</span>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      Falta: {j.absenceDate}
                    </span>
                  </div>
                  <div className="text-slate-500 font-medium text-[11px]">
                    Módulo: {j.courseName}
                  </div>
                  <p className="text-slate-700 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100 text-[11px]">
                    "{j.reason}"
                  </p>
                  {j.fileName && (
                    <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px]">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Adjunto: {j.fileName}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setReviewingJust(j);
                      setReviewComment('');
                      setReviewSuccessMsg(null);
                    }}
                    className="w-full text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Revisar Comprobante
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PARA REVISAR Y VALIDAR COMPROBANTE DE AUSENCIA */}
      <Modal
        open={reviewingJust !== null}
        title={`Validación de Comprobante: ${reviewingJust?.studentName || ''}`}
        onClose={() => setReviewingJust(null)}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReviewingJust(null)}
              disabled={processingReview}
            >
              Cancelar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleReview('rejected')}
                disabled={processingReview}
                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 text-xs font-bold"
              >
                <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Rechazar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleReview('approved')}
                disabled={processingReview}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {processingReview ? 'Procesando...' : 'Aprobar (Justificar Ausencia)'}
              </Button>
            </div>
          </div>
        }
      >
        {reviewingJust && (
          <div className="space-y-4 text-xs">
            {reviewSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reviewSuccessMsg}</span>
              </div>
            )}

            {/* Datos del estudiante y ausencia */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium">Estudiante:</span>
                <div className="font-bold text-slate-900">{reviewingJust.studentName}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Cédula / Identificación:</span>
                <div className="font-bold text-slate-900">{reviewingJust.studentNumber || '501230456'}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Fecha de Ausencia:</span>
                <div className="font-bold text-amber-800">{reviewingJust.absenceDate}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Módulo:</span>
                <div className="font-bold text-slate-900">{reviewingJust.courseName}</div>
              </div>
              <div className="col-span-2 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Cumplimiento Plazo MEP (8 días máx):</span>
                {(() => {
                  const diff = Math.floor(
                    (new Date().getTime() - new Date(reviewingJust.absenceDate + 'T00:00:00').getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return diff <= 8 ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                      ✓ En tiempo reglamentario ({diff} días desde la ausencia)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                      ⚠️ Plazo vencido ({diff} días desde la falta)
                    </span>
                  );
                })()}
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-1">Motivo declarado por el estudiante:</span>
              <p className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-slate-800 italic">
                "{reviewingJust.reason}"
              </p>
            </div>

            {/* Visualización del archivo / foto */}
            <div>
              <span className="font-bold text-slate-800 block mb-1">Foto o Documento Adjunto:</span>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-100 text-center max-h-72 overflow-y-auto">
                {reviewingJust.fileType?.startsWith('image/') || reviewingJust.fileData?.startsWith('data:image/') ? (
                  <img
                    src={reviewingJust.fileData}
                    alt="Comprobante"
                    className="max-w-full h-auto mx-auto rounded-lg shadow-xs"
                  />
                ) : reviewingJust.fileType === 'application/pdf' || reviewingJust.fileData?.startsWith('data:application/pdf') ? (
                  <div className="space-y-2 py-4">
                    <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                    <div className="font-bold text-slate-800">{reviewingJust.fileName || 'Comprobante_Medico.pdf'}</div>
                    <a
                      href={reviewingJust.fileData}
                      download={reviewingJust.fileName || 'Comprobante_Medico.pdf'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                    >
                      📥 Descargar y Abrir PDF
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <Paperclip className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="font-bold text-slate-700">{reviewingJust.fileName || 'Documento adjunto'}</div>
                    {reviewingJust.fileData && (
                      <a
                        href={reviewingJust.fileData}
                        download={reviewingJust.fileName || 'Documento'}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 text-white font-bold"
                      >
                        Descargar archivo
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Comentario de la docente */}
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Comentario u Observación para el Estudiante (Opcional):
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="Ej. Comprobante médico de la CCSS válido. Ausencia justificada sin rebajo de puntos."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
