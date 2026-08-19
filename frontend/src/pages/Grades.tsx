import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { gradesService } from '../services/grades.service';
import { attendanceService } from '../services/attendance.service';
import { justificationsService } from '../services/justifications.service';
import { useAuth } from '../auth/AuthProvider';
import type { Course, Grade, AttendanceSummaryItem, Justification } from '../types';
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Paperclip,
  FileText,
  Award,
  GraduationCap,
  Users,
  CheckCheck,
  BarChart3,
  UploadCloud,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '../utils';

const MEP_CATEGORIES = [
  { value: 'Trabajo Cotidiano (50%)', label: 'Trabajo Cotidiano (50%)', weight: 50 },
  { value: 'Pruebas / Exámenes (30%)', label: 'Pruebas / Exámenes (30%)', weight: 30 },
  { value: 'Tareas (10%)', label: 'Tareas (10%)', weight: 10 },
  { value: 'Proyecto / Extraclase', label: 'Proyecto / Extraclase', weight: 10 },
];

interface FormState {
  studentId: string;
  title: string;
  category: string;
  score: number;
  maxScore: number;
  weight: number;
  gradedOn: string;
  notes: string;
  attachmentName?: string;
  attachmentData?: string;
}

const emptyForm: FormState = {
  studentId: '',
  title: '',
  category: 'Trabajo Cotidiano (50%)',
  score: 100,
  maxScore: 100,
  weight: 50,
  gradedOn: new Date().toISOString().slice(0, 10),
  notes: '',
  attachmentName: '',
  attachmentData: '',
};

export function Grades() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryCourseId = searchParams.get('courseId');

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, AttendanceSummaryItem>>({});
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [selectedJustToReview, setSelectedJustToReview] = useState<Justification | null>(null);
  const [justReviewComment, setJustReviewComment] = useState<string>('');
  const [processingReview, setProcessingReview] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'consolidated' | 'all'>('consolidated');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [isDraggingIndividual, setIsDraggingIndividual] = useState(false);

  // Calificación masiva grupal de exámenes (presencial o papel)
  const [openGroupModal, setOpenGroupModal] = useState<boolean>(false);
  const [groupTitle, setGroupTitle] = useState<string>('I Examen Parcial de Inglés');
  const [groupCategory, setGroupCategory] = useState<string>('Pruebas / Exámenes (30%)');
  const [groupMaxScore, setGroupMaxScore] = useState<number>(100);
  const [groupGradedOn, setGroupGradedOn] = useState<string>(new Date().toISOString().slice(0, 10));
  const [groupEntries, setGroupEntries] = useState<
    Record<string, { score: number; notes: string; attachmentName?: string; attachmentData?: string }>
  >({});
  const [savingGroup, setSavingGroup] = useState<boolean>(false);
  const [groupSuccess, setGroupSuccess] = useState<string | null>(null);

  useEffect(() => {
    coursesService.list().then((cs) => {
      setCourses(cs);
      const target = cs.find((c) => c.id === queryCourseId) || cs[0];
      if (target) setCourseId(target.id);
    });
  }, [queryCourseId]);

  const loadData = () => {
    if (!courseId) return;
    Promise.all([
      coursesService.listStudents(courseId),
      gradesService.listGrades(courseId),
      attendanceService.getSummary(courseId).catch(() => ({})),
      justificationsService.list({ courseId }).catch(() => []),
    ])
      .then(([s, g, sum, justs]) => {
        setStudents(s);
        setGrades(g);
        setAttendanceSummary(sum);
        setJustifications(justs);
      })
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar calificaciones'));
  };

  const handleReviewJustification = async (status: 'approved' | 'rejected') => {
    if (!selectedJustToReview) return;
    setProcessingReview(true);
    setError(null);
    try {
      await justificationsService.review(selectedJustToReview.id, {
        status,
        teacherComment: justReviewComment.trim() || (status === 'approved' ? 'Comprobante médico/oficial válido y aceptado.' : 'Comprobante rechazado.'),
      });
      setSelectedJustToReview(null);
      setJustReviewComment('');
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al procesar la justificación');
    } finally {
      setProcessingReview(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const printGradesReport = () => {
    const sheet = document.getElementById('official-mep-sheet-grades');
    if (!sheet) return;

    // Usar iframe oculto para evitar ventanas about:blank
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>EduNube - Reporte de Calificaciones</title>
          <style>
            @page {
              size: letter landscape;
              margin: 10mm 14mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              font-size: 11px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .brand-subtitle {
              font-size: 12px;
              font-weight: 600;
              color: #475569;
              margin-top: 2px;
            }
            .header-badge {
              display: inline-block;
              background: #f1f5f9;
              color: #0f172a;
              font-weight: 700;
              font-size: 11px;
              padding: 5px 12px;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 24px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 16px;
              margin-bottom: 14px;
            }
            .meta-row {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 11px;
            }
            .meta-label {
              font-weight: 700;
              color: #334155;
              min-width: 90px;
            }
            .meta-val {
              color: #0f172a;
              font-weight: 600;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            .report-table th {
              background-color: #f1f5f9 !important;
              border: 1px solid #475569;
              padding: 7px 8px;
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              text-align: center;
            }
            .report-table td {
              border: 1px solid #475569;
              padding: 6px 8px;
              font-size: 11px;
              color: #0f172a;
            }
            .report-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .criteria-note {
              font-size: 10px;
              color: #64748b;
              margin-top: 6px;
              margin-bottom: 18px;
            }
            .report-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid #cbd5e1;
              padding-top: 10px;
              margin-top: 15px;
              font-size: 11px;
              color: #64748b;
            }
            .page-box {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
              padding: 3px 8px;
              border-radius: 4px;
              border: 1px solid #cbd5e1;
              font-family: ui-monospace, monospace;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          ${sheet.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setSubmitting(true);
    setError(null);
    try {
      await gradesService.createGrade(courseId, {
        studentId: form.studentId,
        title: form.title,
        category: form.category,
        score: Number(form.score),
        maxScore: Number(form.maxScore),
        weight: Number(form.weight),
        gradedOn: form.gradedOn,
        assignmentId: null,
        notes: form.notes || null,
        attachmentName: form.attachmentName || null,
        attachmentData: form.attachmentData || null,
      });
      setOpen(false);
      setForm(emptyForm);
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al registrar nota');
    } finally {
      setSubmitting(false);
    }
  };

  const onSaveGroupGrades = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseId || !groupTitle.trim()) return;
    setSavingGroup(true);
    setError(null);
    try {
      const cat = MEP_CATEGORIES.find((c) => c.value === groupCategory);
      for (const student of students) {
        const entry = groupEntries[student.id] || { score: 100, notes: '' };
        await gradesService.createGrade(courseId, {
          studentId: student.id,
          title: groupTitle.trim(),
          category: groupCategory,
          score: Number(entry.score ?? 100),
          maxScore: Number(groupMaxScore),
          weight: cat?.weight ?? 30,
          gradedOn: groupGradedOn,
          assignmentId: null,
          notes: entry.notes || null,
          attachmentName: entry.attachmentName || null,
          attachmentData: entry.attachmentData || null,
        });
      }
      setGroupSuccess(`¡Se registraron y respaldaron las notas de los ${students.length} estudiantes exitosamente!`);
      setTimeout(() => {
        setOpenGroupModal(false);
        setGroupSuccess(null);
        loadData();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al registrar calificaciones grupales');
    } finally {
      setSavingGroup(false);
    }
  };

  const onDelete = async (gradeId: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta calificación?')) return;
    await gradesService.deleteGrade(gradeId);
    loadData();
  };

  const getStudentSummary = (studentId: string) => {
    const stGrades = grades.filter((g) => g.studentId === studentId);
    
    const cotidianoGrades = stGrades.filter((g) => g.category?.includes('Cotidiano'));
    const cotidianoAvg = cotidianoGrades.length > 0
      ? cotidianoGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / cotidianoGrades.length
      : 0;
    const cotidianoPts = (cotidianoAvg * 0.5);

    const pruebasGrades = stGrades.filter((g) => g.category?.includes('Pruebas') || g.category?.includes('Exámenes'));
    const pruebasAvg = pruebasGrades.length > 0
      ? pruebasGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / pruebasGrades.length
      : 0;
    const pruebasPts = (pruebasAvg * 0.3);

    const tareasGrades = stGrades.filter((g) => g.category?.includes('Tareas'));
    const tareasAvg = tareasGrades.length > 0
      ? tareasGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / tareasGrades.length
      : 0;
    const tareasPts = (tareasAvg * 0.1);

    const attScore = attendanceSummary[studentId]?.calculatedAttendanceScore ?? 100;
    const asistenciaPts = (attScore * 0.1);

    const hasAnyGrade = stGrades.length > 0;
    const finalGrade = hasAnyGrade 
      ? Number((cotidianoPts + pruebasPts + tareasPts + asistenciaPts).toFixed(1))
      : 0;

    // Normativa Oficial MEP:
    // Tercer Ciclo (7°, 8°, 9° / Módulos I, II, III): Pasa con 65 (Convocatoria >= 55)
    // Educación Diversificada (10°, 11°, 12° / Módulos IV, V, VI): Pasa con 70 (Convocatoria >= 60)
    const courseObj = courses.find((c) => c.id === courseId);
    const isDiversificada =
      courseObj?.name?.includes('10') ||
      courseObj?.name?.includes('11') ||
      courseObj?.name?.includes('12') ||
      courseObj?.name?.includes('IV') ||
      courseObj?.name?.includes('V') ||
      courseObj?.name?.includes('VI') ||
      courseObj?.name?.includes('Bachillerato') ||
      courseObj?.code?.includes('10') ||
      courseObj?.code?.includes('11');

    const minPassing = isDiversificada ? 70 : 65;
    const minConvocatoria = isDiversificada ? 60 : 55;

    const status = !hasAnyGrade
      ? 'EN CURSO'
      : finalGrade >= minPassing
      ? 'APROBADO'
      : finalGrade >= minConvocatoria
      ? 'CONVOCATORIA'
      : 'REPROBADO';

    return {
      cotidianoAvg: Number(cotidianoAvg.toFixed(1)),
      pruebasAvg: Number(pruebasAvg.toFixed(1)),
      tareasAvg: Number(tareasAvg.toFixed(1)),
      asistenciaAvg: Number(attScore.toFixed(1)),
      finalGrade,
      minPassing,
      status,
      hasAnyGrade,
    };
  };

  const [selectedPeriod, setSelectedPeriod] = useState<'I' | 'II'>('I');
  const [openPreviewModal, setOpenPreviewModal] = useState(false);

  function sanitizeFilename(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  const exportGradesExcel = () => {
    if (!students || students.length === 0) return;
    const courseName = courses.find((c) => c.id === courseId)?.name || 'Curso';
    const cleanCourseName = sanitizeFilename(courseName);

    const rows: (string | number)[][] = [
      ['EDUNUBE DOCENTE — ACTA OFICIAL DE CALIFICACIONES MEP'],
      ['Nivel / Grupo:', courseName, '', 'Periodo:', `Periodo ${selectedPeriod} (Año Lectivo 2026)`],
      ['Docente:', user?.fullName ? `Prof. ${user.fullName}` : 'Docente de Inglés', '', 'Fecha de Emisión:', new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })],
      [],
      [
        'N°',
        'Cédula / DIMEX',
        'Nombre Completo del Estudiante',
        'Cotidiano (50%)',
        'Pruebas (30%)',
        'Tareas (10%)',
        'Asistencia MEP (10%)',
        'Nota Final (100%)',
        'Condición Final',
      ],
    ];

    students.forEach((s, idx) => {
      const data = getStudentSummary(s.id);
      rows.push([
        idx + 1,
        s.studentNumber || '—',
        s.fullName,
        data.cotidianoAvg,
        data.pruebasAvg,
        data.tareasAvg,
        data.asistenciaAvg,
        data.finalGrade,
        data.status,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 36 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Notas Periodo ${selectedPeriod}`);
    XLSX.writeFile(wb, `Boleta_MEP_Periodo_${selectedPeriod}_${cleanCourseName}.xlsx`);
  };

  const studentSummaries = students.map((s) => getStudentSummary(s.id));
  const classAvg =
    studentSummaries.length > 0
      ? (
          studentSummaries.reduce((acc, curr) => acc + (curr.finalGrade || 0), 0) /
          studentSummaries.length
        ).toFixed(1)
      : '0.0';
  const approvedCount = studentSummaries.filter((s) => (s.finalGrade || 0) >= 65).length;
  const passingRate =
    studentSummaries.length > 0
      ? Math.round((approvedCount / studentSummaries.length) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* 1. Header Minimalista & Botones Coquetos */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600 shrink-0" />
            <span>Calificaciones MEP</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ponderación oficial: Cotidiano (50%) · Pruebas (30%) · Tareas (10%) · Asistencia SICIN (10%)
          </p>
        </div>

        {/* Botones de Acción Agrupados y Ordenados */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const initial: Record<string, any> = {};
              students.forEach((s) => {
                initial[s.id] = { score: 100, notes: '', attachmentName: '', attachmentData: '' };
              });
              setGroupTitle('Trabajo Cotidiano - Práctica en Clase / Rúbrica');
              setGroupCategory('Trabajo Cotidiano (50%)');
              setGroupEntries(initial);
              setOpenGroupModal(true);
            }}
            disabled={students.length === 0}
            className="text-[11px] sm:text-xs font-bold border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 shadow-2xs cursor-pointer justify-center"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
            <span className="truncate">Cotidiano (50%)</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const initial: Record<string, any> = {};
              students.forEach((s) => {
                initial[s.id] = { score: 100, notes: '', attachmentName: '', attachmentData: '' };
              });
              setGroupTitle('I Examen Parcial de Inglés');
              setGroupCategory('Pruebas / Exámenes (30%)');
              setGroupEntries(initial);
              setOpenGroupModal(true);
            }}
            disabled={students.length === 0}
            className="text-[11px] sm:text-xs font-bold border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 shadow-2xs cursor-pointer justify-center"
          >
            <FileText className="w-3.5 h-3.5 mr-1 text-indigo-600 shrink-0" />
            <span className="truncate">Calificar Examen</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOpenPreviewModal(true)}
            disabled={students.length === 0}
            className="text-[11px] sm:text-xs font-semibold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs justify-center"
          >
            <FileText className="w-3.5 h-3.5 mr-1 text-blue-600 shrink-0" />
            <span>Acta PDF</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={exportGradesExcel}
            disabled={students.length === 0}
            className="text-[11px] sm:text-xs font-semibold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs justify-center"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
            <span className="truncate">Excel (.xlsx)</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setOpen(true)}
            disabled={!courseId}
            className="col-span-2 sm:col-span-1 text-[11px] sm:text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer justify-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>+ Nota Individual</span>
          </Button>
        </div>
      </div>

      {/* 2. Barra de Filtro Compacta y Métricas Rápidas */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap shrink-0">Grupo:</span>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none truncate"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap shrink-0">Periodo:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'I' | 'II')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="I">I Periodo (2026)</option>
              <option value="II">II Periodo (2026)</option>
            </select>
          </div>
        </div>

        {/* Resumen del Grupo en Píldoras */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full md:w-auto">
          <span className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-[11px] sm:text-xs font-bold text-center">
            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{students.length} alumnos</span>
          </span>

          <span className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-[11px] sm:text-xs font-bold border border-blue-100 text-center">
            <BarChart3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Prom: {classAvg}</span>
          </span>

          <span className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] sm:text-xs font-bold border border-emerald-100 text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{passingRate}% Aprob.</span>
          </span>
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* 3. Pestañas Limpias */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewMode('consolidated')}
          className={cn(
            'px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer',
            viewMode === 'consolidated'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Consolidado Ponderado MEP (Periodo {selectedPeriod})</span>
        </button>

        <button
          onClick={() => setViewMode('all')}
          className={cn(
            'px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer',
            viewMode === 'all'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Detalle de Notas ({grades.length})</span>
        </button>
      </div>

      {/* 4. Tabla de Consolidado Ponderado */}
      {viewMode === 'consolidated' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
            <div className="text-[11px]">
              <strong className="text-slate-700">Regla MEP:</strong> Calificación mínima de 65 (o 70 en diversificada).
            </div>
            <div className="flex items-center gap-3 font-semibold text-[11px]">
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Aprobado (≥65)
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <AlertCircle className="w-3 h-3" /> Convocatoria (60-64)
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <XCircle className="w-3 h-3" /> Reprobado (&lt;60)
              </span>
            </div>
          </div>

          <Table
            rows={students}
            rowKey={(s) => s.id}
            emptyMessage="Sin alumnos registrados en este curso."
            columns={[
              {
                key: 'name',
                header: 'Estudiante',
                render: (s) => (
                  <div className="flex items-center gap-3 py-0.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {s.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">{s.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.studentNumber}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'cotidiano',
                header: 'Cotidiano (50%)',
                render: (s) => {
                  const data = getStudentSummary(s.id);
                  const val = data.cotidianoAvg || 0;
                  return (
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-xs text-slate-800">{val} pts</span>
                      <div className="text-[10px] text-slate-400 font-mono">({(val * 0.5).toFixed(1)}% / 50%)</div>
                    </div>
                  );
                },
              },
              {
                key: 'pruebas',
                header: 'Pruebas (30%)',
                render: (s) => {
                  const data = getStudentSummary(s.id);
                  const val = data.pruebasAvg || 0;
                  return (
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-xs text-slate-800">{val} pts</span>
                      <div className="text-[10px] text-slate-400 font-mono">({(val * 0.3).toFixed(1)}% / 30%)</div>
                    </div>
                  );
                },
              },
              {
                key: 'tareas',
                header: 'Tareas (10%)',
                render: (s) => {
                  const data = getStudentSummary(s.id);
                  const val = data.tareasAvg || 0;
                  return (
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-xs text-slate-800">{val} pts</span>
                      <div className="text-[10px] text-slate-400 font-mono">({(val * 0.1).toFixed(1)}% / 10%)</div>
                    </div>
                  );
                },
              },
              {
                key: 'asistencia',
                header: 'Asistencia SICIN (10%)',
                render: (s) => {
                  const data = getStudentSummary(s.id);
                  const val = data.asistenciaAvg || 0;
                  const studentJusts = justifications.filter((j) => j.studentId === s.id);
                  const pendingJust = studentJusts.find((j) => j.status === 'pending');
                  const approvedJust = studentJusts.find((j) => j.status === 'approved');

                  return (
                    <div className="space-y-1">
                      <div className="font-mono font-bold text-xs text-blue-700">{val} pts</div>
                      {pendingJust && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJustToReview(pendingJust);
                            setJustReviewComment('');
                          }}
                          className="block text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg border border-amber-300 transition text-left cursor-pointer shadow-2xs"
                          title="Haga clic para ver el comprobante y validarlo"
                        >
                          ⚠️ Comprobante por validar
                        </button>
                      )}
                      {!pendingJust && approvedJust && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJustToReview(approvedJust);
                            setJustReviewComment(approvedJust.teacherComment || '');
                          }}
                          className="block text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition text-left cursor-pointer"
                          title="Comprobante aprobado"
                        >
                          ✓ Justificante Aprobado
                        </button>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'promedioFinal',
                header: 'Promedio Ponderado',
                render: (s) => {
                  const data = getStudentSummary(s.id);
                  const num = data.finalGrade || 0;
                  return (
                    <span
                      className={cn(
                        'inline-block text-xs sm:text-sm font-black font-mono px-3 py-1 rounded-xl border shadow-2xs',
                        num >= 65
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : num >= 60
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      )}
                    >
                      {data.finalGrade}
                    </span>
                  );
                },
              },
              {
                key: 'status',
                header: 'Condición Final',
                render: (s) => {
                  const data = getStudentSummary(s.id);
                  if (data.status === 'APROBADO') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Aprobado</span>
                      </span>
                    );
                  } else if (data.status === 'CONVOCATORIA') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Convocatoria</span>
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Reprobado</span>
                    </span>
                  );
                },
              },
            ]}
          />
        </div>
      )}

      {viewMode === 'all' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <Table
            dense={true}
            rows={grades}
            rowKey={(g) => g.id}
            emptyMessage="No hay calificaciones registradas."
            columns={[
              {
                key: 'title',
                header: 'Actividad Evaluada',
                render: (g) => (
                  <div className="py-0.5">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span>{g.title}</span>
                      {g.attachmentData && (
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.createElement('a');
                            el.href = g.attachmentData!;
                            el.download = g.attachmentName || 'Examen_Calificado.pdf';
                            document.body.appendChild(el);
                            el.click();
                            document.body.removeChild(el);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-[10px] hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                          title="Abrir respaldo de examen calificado"
                        >
                          <Paperclip className="w-3 h-3 text-indigo-600" />
                          Respaldo
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-blue-600 font-medium">{g.category || 'Evaluación'}</div>
                  </div>
                ),
              },
              {
                key: 'student',
                header: 'Alumno',
                render: (g) => {
                  const student = students.find((s) => s.id === g.studentId);
                  const name = student?.fullName ?? g.studentId;
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {name.charAt(0)}
                      </div>
                      <span className="font-bold text-xs text-slate-800">{name}</span>
                    </div>
                  );
                },
              },
              {
                key: 'score',
                header: 'Calificación',
                render: (g) => (
                  <span className="inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-900 border border-slate-200">
                    {g.score} / {g.maxScore}
                  </span>
                ),
              },
              {
                key: 'date',
                header: 'Fecha',
                render: (g) => {
                  try {
                    const d = new Date(g.gradedOn);
                    if (isNaN(d.getTime())) return <span className="text-xs text-slate-500">{g.gradedOn || '—'}</span>;
                    return (
                      <span className="text-xs text-slate-600 font-medium">
                        {d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    );
                  } catch {
                    return <span className="text-xs text-slate-500">{g.gradedOn || '—'}</span>;
                  }
                },
              },
              {
                key: 'notes',
                header: 'Observaciones',
                render: (g) => (
                  <span className="text-xs text-slate-500 max-w-xs truncate block" title={g.notes || ''}>
                    {g.notes || '—'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (g) => (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(g.id)}
                    className="p-1.5 h-auto text-xs rounded-lg cursor-pointer shadow-2xs"
                    title="Eliminar registro de nota"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                ),
              },
            ]}
          />
        </div>
      )}

      <Modal
        open={open}
        title="Registrar Calificación Individual"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="grade-form" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar Calificación'}
            </Button>
          </>
        }
      >
        <form id="grade-form" onSubmit={onCreate} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Estudiante"
              name="studentId"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              options={[
                { value: '', label: 'Seleccionar estudiante...' },
                ...students.map((s) => ({ value: s.id, label: s.fullName })),
              ]}
              required
            />

            <Select
              label="Componente Evaluativo MEP"
              name="category"
              value={form.category}
              onChange={(e) => {
                const cat = MEP_CATEGORIES.find((c) => c.value === e.target.value);
                setForm({
                  ...form,
                  category: e.target.value,
                  weight: cat?.weight ?? 50,
                });
              }}
              options={MEP_CATEGORIES}
              required
            />
          </div>

          <Input
            label="Título o Descripción de la Evaluación"
            placeholder="Ej. I Examen Parcial de Inglés - Grammar & Reading"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Puntos Obtenidos"
              type="number"
              step="0.1"
              min={0}
              value={form.score}
              onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
              required
            />
            <Input
              label="Puntos Totales (Base)"
              type="number"
              step="0.1"
              min={1}
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
              required
            />
            <Input
              label="Fecha"
              type="date"
              value={form.gradedOn}
              onChange={(e) => setForm({ ...form, gradedOn: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Observaciones o Retroalimentación (Opcional)</label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none transition resize-none"
              rows={2}
              placeholder="Ej. Excelente pronunciación y comprensión lectora..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* Respaldo del Examen en Papel (Foto o PDF) con Drag & Drop Limpio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Respaldo del Examen Físico / Rúbrica (Opcional)</span>
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
                  setIsDraggingIndividual(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingIndividual(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingIndividual(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingIndividual(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setForm((prev) => ({
                        ...prev,
                        attachmentName: file.name,
                        attachmentData: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className={cn(
                  'border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition block group',
                  isDraggingIndividual
                    ? 'border-blue-500 bg-blue-50/80 scale-[1.01] ring-4 ring-blue-100'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30'
                )}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setForm((prev) => ({
                          ...prev,
                          attachmentName: file.name,
                          attachmentData: reader.result as string,
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div className="flex items-center justify-center gap-2 text-xs">
                  <UploadCloud
                    className={cn(
                      'w-4 h-4 transition shrink-0',
                      isDraggingIndividual ? 'text-blue-600 animate-bounce' : 'text-slate-400 group-hover:text-blue-600'
                    )}
                  />
                  <span className="font-semibold text-slate-700">
                    {isDraggingIndividual ? '¡Suelta el archivo aquí!' : 'Tomar foto o arrastrar examen calificado (PDF, JPG, PNG)'}
                  </span>
                </div>
              </label>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL DE CALIFICACIÓN GRUPAL DE EXÁMENES (EN PAPEL O PRESENCIALES) */}
      <Modal
        open={openGroupModal}
        title="Calificar Examen o Actividad Grupal"
        onClose={() => setOpenGroupModal(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpenGroupModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="group-grades-form"
              disabled={savingGroup}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold"
            >
              {savingGroup ? 'Guardando...' : `Guardar Notas (${students.length} Estudiantes)`}
            </Button>
          </>
        }
      >
        <form id="group-grades-form" onSubmit={onSaveGroupGrades} className="space-y-3.5">
          {groupSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{groupSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre del Examen o Actividad"
              placeholder="Ej. I Examen Parcial de Inglés - Reading & Grammar"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              required
            />
            <Select
              label="Componente Evaluativo MEP"
              name="groupCategory"
              value={groupCategory}
              onChange={(e) => setGroupCategory(e.target.value)}
              options={MEP_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Puntos Base Totales"
              type="number"
              min={1}
              value={groupMaxScore}
              onChange={(e) => setGroupMaxScore(Number(e.target.value))}
              required
            />
            <Input
              label="Fecha de Calificación"
              type="date"
              value={groupGradedOn}
              onChange={(e) => setGroupGradedOn(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Lista de Estudiantes del Grupo ({students.length})</span>
              <span className="text-[11px] text-slate-400 font-normal">Digita la nota de cada alumno:</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto space-y-2 pr-1">
              {students.map((student, idx) => {
                const entry = groupEntries[student.id] || { score: 100, notes: '', attachmentName: '', attachmentData: '' };
                return (
                  <div key={student.id} className="pt-2.5 pb-1 space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {idx + 1}. {student.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {student.studentNumber}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-semibold text-slate-600">Pts:</span>
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          max={groupMaxScore}
                          value={entry.score}
                          onChange={(e) =>
                            setGroupEntries((prev) => ({
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                score: Number(e.target.value),
                                notes: prev[student.id]?.notes || '',
                              },
                            }))
                          }
                          className="w-20 rounded-lg border border-slate-300 bg-white p-1.5 text-center text-xs font-mono font-bold focus:border-indigo-500 focus:outline-none"
                          required
                        />
                        <span className="text-xs font-mono text-slate-400">/ {groupMaxScore}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                      <input
                        type="text"
                        placeholder="Observaciones (opcional)..."
                        value={entry.notes || ''}
                        onChange={(e) =>
                          setGroupEntries((prev) => ({
                            ...prev,
                            [student.id]: {
                              ...prev[student.id],
                              score: prev[student.id]?.score ?? 100,
                              notes: e.target.value,
                            },
                          }))
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />

                      {/* Adjunto de examen en papel de ese estudiante */}
                      <label className="border border-dashed border-slate-300 hover:border-indigo-500 rounded-lg px-2.5 py-1 bg-white cursor-pointer transition flex items-center justify-between gap-1 text-xs">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setGroupEntries((prev) => ({
                                  ...prev,
                                  [student.id]: {
                                    ...prev[student.id],
                                    score: prev[student.id]?.score ?? 100,
                                    notes: prev[student.id]?.notes || '',
                                    attachmentName: file.name,
                                    attachmentData: reader.result as string,
                                  },
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <span className="truncate text-slate-600 text-[11px]">
                          {entry.attachmentName ? `📎 ${entry.attachmentName}` : '📸 Foto/PDF examen'}
                        </span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded shrink-0">
                          {entry.attachmentName ? 'Listo' : 'Adjuntar'}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL Y VISTA OFICIAL DE ACTA DE CALIFICACIONES MEP */}
      <Modal
        open={openPreviewModal}
        title="📄 Acta Oficial de Calificaciones MEP / CINDEA"
        onClose={() => setOpenPreviewModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenPreviewModal(false)}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={printGradesReport}
              className="bg-blue-800 hover:bg-blue-900 font-bold shadow-xs"
            >
              🖨️ Imprimir / Guardar como PDF
            </Button>
          </>
        }
      >
        <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-xl space-y-4 max-h-[75vh] overflow-y-auto">
          {/* HOJA OFICIAL MEP */}
          <div
            id="official-mep-sheet-grades"
            className="report-wrap bg-white p-6 md:p-8 border border-slate-300 rounded shadow-xs text-slate-900 font-sans"
          >
            {/* Encabezado Limpio */}
            <div className="report-header">
              <div>
                <div className="brand-title">EduNube Docente</div>
                <div className="brand-subtitle">Reporte de Calificaciones y Rendimiento Académico</div>
              </div>
              <div>
                <span className="header-badge">
                  Periodo {selectedPeriod} • 2026
                </span>
              </div>
            </div>

            {/* Recuadro de Metadatos */}
            <div className="meta-grid">
              <div className="meta-row">
                <span className="meta-label">Docente:</span>
                <span className="meta-val">{user?.fullName ? `Prof. ${user.fullName}` : 'Docente de Inglés'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Periodo:</span>
                <span className="meta-val">Periodo {selectedPeriod} (Curso 2026)</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Grupo / Nivel:</span>
                <span className="meta-val">{courses.find((c) => c.id === courseId)?.name || 'Inglés 10° Año'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Fecha de Emisión:</span>
                <span className="meta-val">{new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Tabla Formal */}
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>N°</th>
                  <th style={{ width: '90px' }} className="text-left">Cédula</th>
                  <th className="text-left">Nombre Completo del Estudiante</th>
                  <th style={{ width: '100px' }}>Cotidiano (50%)</th>
                  <th style={{ width: '90px' }}>Pruebas (30%)</th>
                  <th style={{ width: '80px' }}>Tareas (10%)</th>
                  <th style={{ width: '90px' }}>Asist. (10%)</th>
                  <th style={{ width: '75px' }}>Nota Final</th>
                  <th style={{ width: '95px' }}>Condición</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const data = getStudentSummary(s.id);
                  return (
                    <tr key={s.id}>
                      <td className="text-center font-mono">{idx + 1}</td>
                      <td className="font-mono">{s.studentNumber}</td>
                      <td className="font-bold">{s.fullName}</td>
                      <td className="text-center font-mono">{data.cotidianoAvg}</td>
                      <td className="text-center font-mono">{data.pruebasAvg}</td>
                      <td className="text-center font-mono">{data.tareasAvg}</td>
                      <td className="text-center font-mono font-bold" style={{ color: '#1e40af' }}>{data.asistenciaAvg}</td>
                      <td className="text-center font-mono font-bold" style={{ fontSize: '12px' }}>{data.finalGrade}</td>
                      <td className="text-center font-bold">
                        {data.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Criterio de Aprobación */}
            <div className="criteria-note">
              * Nota mínima de aprobación: 65 en III Ciclo y Educación de Adultos / 70 en Educación Diversificada (Reglamento de Evaluación de los Aprendizajes MEP).
            </div>

            {/* Pie de página con paginación */}
            <div className="report-footer">
              <span>EduNube Docente • Reporte de Calificaciones</span>
              <span>Generado por: <strong>{user?.fullName ? `Prof. ${user.fullName}` : 'Docente de Inglés'}</strong></span>
              <span className="page-box">
                Página 1 / 1
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL PARA REVISAR Y VALIDAR COMPROBANTE DE AUSENCIA DESDE CALIFICACIONES */}
      <Modal
        open={selectedJustToReview !== null}
        title={`Validación de Comprobante: ${selectedJustToReview?.studentName || ''}`}
        onClose={() => setSelectedJustToReview(null)}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedJustToReview(null)}
              disabled={processingReview}
            >
              Cancelar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleReviewJustification('rejected')}
                disabled={processingReview}
                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 text-xs font-bold"
              >
                <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Rechazar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleReviewJustification('approved')}
                disabled={processingReview}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {processingReview ? 'Procesando...' : 'Aprobar (Marcar Justificada)'}
              </Button>
            </div>
          </div>
        }
      >
        {selectedJustToReview && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium">Estudiante:</span>
                <div className="font-bold text-slate-900">{selectedJustToReview.studentName}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Cédula:</span>
                <div className="font-bold text-slate-900">{selectedJustToReview.studentNumber || '501230456'}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Fecha de Ausencia:</span>
                <div className="font-bold text-amber-800">{selectedJustToReview.absenceDate}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Módulo:</span>
                <div className="font-bold text-slate-900">{selectedJustToReview.courseName}</div>
              </div>
              <div className="col-span-2 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Cumplimiento Plazo MEP (8 días máx):</span>
                {(() => {
                  const diff = Math.floor(
                    (new Date().getTime() - new Date(selectedJustToReview.absenceDate + 'T00:00:00').getTime()) /
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
                "{selectedJustToReview.reason}"
              </p>
            </div>

            {/* Documento adjunto / Foto */}
            <div>
              <span className="font-bold text-slate-800 block mb-1">Foto o Documento Adjunto:</span>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-100 text-center max-h-72 overflow-y-auto">
                {selectedJustToReview.fileType?.startsWith('image/') || selectedJustToReview.fileData?.startsWith('data:image/') ? (
                  <img
                    src={selectedJustToReview.fileData}
                    alt="Comprobante"
                    className="max-w-full h-auto mx-auto rounded-lg shadow-xs"
                  />
                ) : selectedJustToReview.fileType === 'application/pdf' || selectedJustToReview.fileData?.startsWith('data:application/pdf') ? (
                  <div className="space-y-2 py-4">
                    <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                    <div className="font-bold text-slate-800">{selectedJustToReview.fileName || 'Comprobante_Medico.pdf'}</div>
                    <a
                      href={selectedJustToReview.fileData}
                      download={selectedJustToReview.fileName || 'Comprobante_Medico.pdf'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                    >
                      📥 Descargar y Abrir PDF
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <Paperclip className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="font-bold text-slate-700">{selectedJustToReview.fileName || 'Documento adjunto'}</div>
                    {selectedJustToReview.fileData && (
                      <a
                        href={selectedJustToReview.fileData}
                        download={selectedJustToReview.fileName || 'Documento'}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 text-white font-bold"
                      >
                        Descargar archivo
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Comentario u Observación para el Estudiante (Opcional):
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="Ej. Comprobante CCSS aceptado. Se actualiza la nota de asistencia."
                value={justReviewComment}
                onChange={(e) => setJustReviewComment(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
