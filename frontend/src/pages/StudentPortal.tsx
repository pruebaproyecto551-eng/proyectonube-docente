import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { coursesService } from '../services/courses.service';
import { studentsService } from '../services/students.service';
import { assignmentsService } from '../services/assignments.service';
import { gradesService } from '../services/grades.service';
import { attendanceService } from '../services/attendance.service';
import { announcementsService } from '../services/announcements.service';
import { aiService } from '../services/ai.service';
import { justificationsService } from '../services/justifications.service';
import type { Course, Assignment, Grade, Announcement, AttendanceSummaryItem, Justification, Submission } from '../types';
import {
  Home,
  FileEdit,
  FolderCheck,
  GraduationCap,
  Sparkles,
  Bot,
  Clock,
  CheckCircle2,
  FolderUp,
  FileText,
  MessageCircle,
  LogOut,
  ChevronRight,
  Languages,
  Send,
  Paperclip,
  UploadCloud,
  Eye,
  Camera,
  AlertTriangle,
  Clock3,
  XCircle,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  Contrast,
  Loader2,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '../utils';
import { alerts } from '../utils/alerts';
import { FormattedMessage } from '../components/FormattedMessage';

export interface AttachedFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatCleanDate(dateStr?: string | null): string {
  if (!dateStr) return 'Sin fecha límite';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('es-CR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return dateStr;
  }
}

const processFiles = async (
  fileList: FileList | File[],
  currentList: AttachedFileItem[]
): Promise<AttachedFileItem[]> => {
  const updated: AttachedFileItem[] = [...currentList];
  const filesArray = Array.from(fileList);

  for (const file of filesArray) {
    const MAX_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      alerts.warning(
        'Archivo demasiado grande',
        `El archivo "${file.name}" pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El tamaño máximo por archivo es de 15 MB.`
      );
      continue;
    }

    if (updated.some((item) => item.name === file.name && item.size === file.size)) {
      continue;
    }

    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      if (file.name.toLowerCase().endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });

    updated.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      data,
    });
  }

  return updated;
};

// Estudiante Demo por defecto en CINDEA
interface StudentProfile {
  id: string;
  name: string;
  carnet: string;
  age: number;
  isMinor: boolean;
  guardianName: string;
  moduleName: string;
}

const DEMO_STUDENTS: StudentProfile[] = [
  {
    id: 'f9ce132a-c22a-41b4-98a1-bdf45c14fd39',
    name: 'Pamela Leiva',
    carnet: '501230456',
    age: 21,
    isMinor: false,
    guardianName: 'Familia Leiva (Contacto Principal)',
    moduleName: 'Inglés CINDEA (10° y 11° Año)',
  },
];

const STUDENT_PROFILE_KEY = 'student_portal_profile';
const STUDENT_COURSE_KEY = 'student_selected_course';

function getInitialStudentProfile(authUser: any): StudentProfile {
  try {
    const cached = localStorage.getItem(STUDENT_PROFILE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.id) return parsed;
    }
  } catch {}

  if (authUser) {
    return {
      id: authUser.id,
      name: authUser.fullName || 'Estudiante CINDEA',
      carnet: (authUser.email && !authUser.email.includes('@') ? authUser.email : authUser.email?.split('@')[0]) || '501230456',
      age: 20,
      isMinor: false,
      guardianName: 'Contacto Principal',
      moduleName: 'Inglés CINDEA',
    };
  }

  return DEMO_STUDENTS[0];
}

export function StudentPortal() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assignments' | 'grades' | 'tutor' | 'justifications'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('student_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('student_sidebar_collapsed', String(next));
      return next;
    });
  };
  
  // Perfil del estudiante activo con persistencia inmediata
  const [currentStudent, setCurrentStudent] = useState<StudentProfile>(() => getInitialStudentProfile(user));

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    return localStorage.getItem(STUDENT_COURSE_KEY) || '';
  });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [myGrades, setMyGrades] = useState<Grade[]>([]);
  const [myAttendanceSummary, setMyAttendanceSummary] = useState<AttendanceSummaryItem | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Justificaciones de Ausencia
  const [myJustifications, setMyJustifications] = useState<Justification[]>([]);
  const [justAbsenceDate, setJustAbsenceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [justReason, setJustReason] = useState<string>('');
  const [justFiles, setJustFiles] = useState<AttachedFileItem[]>([]);
  const [justSubmitting, setJustSubmitting] = useState<boolean>(false);
  const [justSuccess, setJustSuccess] = useState<string | null>(null);
  const [justError, setJustError] = useState<string | null>(null);
  const [selectedJustificationDoc, setSelectedJustificationDoc] = useState<Justification | null>(null);

  useEffect(() => {
    if (user) {
      // Sincronizar inmediatamente datos básicos del usuario
      const fallbackProfile: StudentProfile = {
        id: user.id,
        name: user.fullName || 'Estudiante CINDEA',
        carnet: (user.email && !user.email.includes('@') ? user.email : user.email?.split('@')[0]) || '501230456',
        age: 20,
        isMinor: false,
        guardianName: 'Contacto Principal',
        moduleName: 'Inglés CINDEA',
      };

      // Buscar información detallada del estudiante en la base de datos
      studentsService.list().then((allStudents) => {
        const found = allStudents.find(
          (s) =>
            s.userId === user.id ||
            s.id === user.id ||
            (s.fullName && user.fullName && s.fullName.toLowerCase().trim() === user.fullName.toLowerCase().trim()) ||
            (s.studentNumber && user.email && s.studentNumber === user.email)
        );

        if (found) {
          const profile: StudentProfile = {
            id: found.id,
            name: found.fullName || user.fullName || 'Estudiante',
            carnet: found.studentNumber || user.email || 'Sin cédula',
            age: 20,
            isMinor: false,
            guardianName: found.guardianName || 'Contacto Principal',
            moduleName: found.gradeLevel || 'Inglés CINDEA',
          };
          setCurrentStudent(profile);
          try {
            localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(profile));
          } catch {}
          if (found.courseId) {
            setSelectedCourseId(found.courseId);
            try {
              localStorage.setItem(STUDENT_COURSE_KEY, found.courseId);
            } catch {}
          }
        } else {
          setCurrentStudent((prev) => {
            const next = prev.id && prev.id !== DEMO_STUDENTS[0].id ? prev : fallbackProfile;
            try {
              localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }).catch(() => {
        setCurrentStudent((prev) => {
          const next = prev.id && prev.id !== DEMO_STUDENTS[0].id ? prev : fallbackProfile;
          try {
            localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      });
    }
  }, [user]);

  // Configuración de Tema / Modo Nocturno de Descanso Visual CINDEA
  const [theme, setTheme] = useState<'light' | 'dark' | 'contrast'>(() => {
    return (localStorage.getItem('app_theme') as any) || 'light';
  });

  useEffect(() => {
    document.documentElement.classList.remove('dark-theme', 'high-contrast');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else if (theme === 'contrast') {
      document.documentElement.classList.add('high-contrast');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Actualizar título de la pestaña del navegador según la sección activa del estudiante
  useEffect(() => {
    const tabTitles: Record<string, string> = {
      overview: 'Inicio · Portal Estudiantil',
      assignments: 'Tareas · Portal Estudiantil',
      grades: 'Calificaciones · Portal Estudiantil',
      attendance: 'Asistencia · Portal Estudiantil',
      tutor: 'Tutor IA · Portal Estudiantil',
      announcements: 'Comunicados · Portal Estudiantil',
      justifications: 'Justificaciones · Portal Estudiantil',
    };
    document.title = tabTitles[activeTab] || 'Portal Estudiantil · CINDEA MEP Cloud';
  }, [activeTab]);

  // Subida de tarea (Soporta múltiples archivos: fotos, PDF, Word, audios)
  const [selectedTask, setSelectedTask] = useState<Assignment | null>(null);
  const [uploadFiles, setUploadFiles] = useState<AttachedFileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadPhase, setUploadPhase] = useState<string>('');
  const [showConfirmSummary, setShowConfirmSummary] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDraggingSubmission, setIsDraggingSubmission] = useState(false);
  const [isDraggingJust, setIsDraggingJust] = useState(false);

  // Tutor IA
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [copiedTutorIdx, setCopiedTutorIdx] = useState<number | null>(null);
  const [tutorChat, setTutorChat] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your CINDEA English AI Tutor. You can ask me questions about English grammar, vocabulary, pronunciation, or check your homework sentences in English or Spanish! 🇬🇧✨',
    },
  ]);
  const [tutorLoading, setTutorLoading] = useState(false);

  useEffect(() => {
    coursesService.list().then((cs) => {
      setCourses(cs);
      if (cs[0] && !selectedCourseId) setSelectedCourseId(cs[0].id);
    });
    announcementsService.list().then(setAnnouncements).catch(() => {});
  }, []);

  const loadStudentData = () => {
    if (!selectedCourseId) return;
    assignmentsService.list(selectedCourseId).then(setAssignments).catch(() => {});
    
    // Cargar entregas del estudiante para marcar tareas entregadas
    assignmentsService.listStudentSubmissions(currentStudent.id).then(setSubmissions).catch(() => {});

    // Cargar calificaciones y filtrar EXCLUSIVAMENTE las del estudiante activo
    gradesService.listGrades(selectedCourseId).then((allGrades) => {
      const studentOnly = allGrades.filter((g) => g.studentId === currentStudent.id);
      setMyGrades(studentOnly);
    }).catch(() => {});

    // Resumen de asistencia del estudiante
    attendanceService.getSummary(selectedCourseId).then((sum) => {
      if (sum[currentStudent.id]) {
        setMyAttendanceSummary(sum[currentStudent.id]);
      } else {
        setMyAttendanceSummary(null);
      }
    }).catch(() => {});

    // Cargar justificaciones del estudiante
    justificationsService.list({ studentId: currentStudent.id }).then(setMyJustifications).catch(() => {});
  };

  const getAbsenceDateBounds = () => {
    const now = new Date();
    const max = now.toISOString().slice(0, 10);
    const minDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const min = minDate.toISOString().slice(0, 10);
    return { min, max };
  };

  const handleSendJustification = async (e: FormEvent) => {
    e.preventDefault();
    if (!justReason.trim()) {
      setJustError('Por favor escribe el motivo o explicación de la ausencia.');
      return;
    }

    const selectedDate = new Date(justAbsenceDate + 'T00:00:00');
    const now = new Date();
    const diffTime = now.getTime() - selectedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 8) {
      setJustError(
        `⚠️ Plazo reglamentario MEP vencido: Han transcurrido ${diffDays} días desde la fecha de la falta (${justAbsenceDate}). La normativa del MEP estipula un plazo máximo de 8 días para presentar justificaciones.`
      );
      return;
    }

    if (diffDays < 0) {
      setJustError('⚠️ La fecha de ausencia no puede ser una fecha futura.');
      return;
    }

    setJustSubmitting(true);
    setJustError(null);
    setJustSuccess(null);

    const activeCourse = courses.find((c) => c.id === selectedCourseId);

    try {
      const isMulti = justFiles.length > 1;
      const combinedName = justFiles.length > 0
        ? isMulti
          ? `${justFiles.length} comprobantes: ${justFiles.map((f) => f.name).join(', ')}`
          : justFiles[0].name
        : undefined;
      const combinedType = justFiles.length > 0
        ? isMulti
          ? 'application/json+multi'
          : justFiles[0].type
        : undefined;
      const fileDataPayload = justFiles.length > 0
        ? isMulti
          ? JSON.stringify({
              isMulti: true,
              totalFiles: justFiles.length,
              files: justFiles.map((f) => ({
                name: f.name,
                size: f.size,
                type: f.type,
                data: f.data,
              })),
            })
          : justFiles[0].data
        : undefined;

      await justificationsService.create({
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        studentNumber: currentStudent.carnet,
        courseId: selectedCourseId || '55555555-5555-4555-a555-555555555551',
        courseName: activeCourse?.name || 'Inglés CINDEA',
        absenceDate: justAbsenceDate,
        reason: justReason.trim(),
        fileName: combinedName,
        fileType: combinedType,
        fileData: fileDataPayload,
      });

      setJustSuccess('¡Comprobante(s) enviado(s) exitosamente! La docente recibirá la notificación en su panel para validarlo.');
      setJustReason('');
      setJustFiles([]);
      
      // Recargar lista
      justificationsService.list({ studentId: currentStudent.id }).then(setMyJustifications).catch(() => {});
      setTimeout(() => setJustSuccess(null), 5000);
    } catch (err: any) {
      setJustError(err?.response?.data?.error || 'Error al enviar la justificación. Intente de nuevo.');
    } finally {
      setJustSubmitting(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [selectedCourseId, currentStudent]);

  // Cálculo privado de nota final ponderada MEP para el estudiante
  const calculateMyFinalGrade = () => {
    const hasAnyGrade = myGrades.length > 0;
    const cotidianoGrades = myGrades.filter((g) => g.category?.includes('Cotidiano'));
    const cotidianoAvg = cotidianoGrades.length > 0
      ? cotidianoGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / cotidianoGrades.length
      : 0;

    const pruebasGrades = myGrades.filter((g) => g.category?.includes('Pruebas') || g.category?.includes('Exámenes'));
    const pruebasAvg = pruebasGrades.length > 0
      ? pruebasGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / pruebasGrades.length
      : 0;

    const tareasGrades = myGrades.filter((g) => g.category?.includes('Tareas'));
    const tareasAvg = tareasGrades.length > 0
      ? tareasGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / tareasGrades.length
      : 0;

    const asistenciaScore = myAttendanceSummary?.calculatedAttendanceScore ?? 100;
    const totalScore = hasAnyGrade
      ? Math.round(cotidianoAvg * 0.5 + pruebasAvg * 0.3 + tareasAvg * 0.1 + (asistenciaScore * 0.1))
      : 0;

    const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
    const courseName = activeCourse?.name || '';
    const isDiversificada =
      courseName.includes('10') ||
      courseName.includes('11') ||
      courseName.includes('12') ||
      courseName.includes('IV') ||
      courseName.includes('V') ||
      courseName.includes('VI') ||
      courseName.includes('Bachillerato');

    const minPassing = isDiversificada ? 70 : 65;
    const minConvocatoria = isDiversificada ? 60 : 55;

    const status = !hasAnyGrade
      ? 'EN CURSO'
      : totalScore >= minPassing
      ? 'APROBADO'
      : totalScore >= minConvocatoria
      ? 'CONVOCATORIA'
      : 'REPROBADO';

    return {
      cotidianoAvg: Math.round(cotidianoAvg),
      pruebasAvg: Math.round(pruebasAvg),
      tareasAvg: Math.round(tareasAvg),
      asistenciaScore: Math.round(asistenciaScore),
      totalScore,
      minPassing,
      status,
      hasAnyGrade,
    };
  };

  const myGradeSummary = calculateMyFinalGrade();

  const handleUploadAssignment = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTask || uploadFiles.length === 0) {
      alerts.warning('Falta archivo', 'Por favor selecciona o arrastra al menos un archivo antes de confirmar la entrega.');
      return;
    }
    setUploading(true);
    setUploadProgress(20);
    setUploadPhase('Preparando archivo(s) para sincronización...');
    setUploadSuccess(null);

    const progressTimer1 = setTimeout(() => {
      setUploadProgress(55);
      setUploadPhase('Sincronizando con carpeta oficial en Google Drive...');
    }, 450);

    const progressTimer2 = setTimeout(() => {
      setUploadProgress(85);
      setUploadPhase('Encriptando entrega y registrando comprobante en la nube...');
    }, 950);

    try {
      const isMulti = uploadFiles.length > 1;
      const combinedName = isMulti
        ? `${uploadFiles.length} archivos: ${uploadFiles.map((f) => f.name).join(', ')}`
        : uploadFiles[0].name;
      const combinedSize = uploadFiles.reduce((acc, f) => acc + f.size, 0);
      const fileDataPayload = isMulti
        ? JSON.stringify({
            isMulti: true,
            totalFiles: uploadFiles.length,
            files: uploadFiles.map((f) => ({
              name: f.name,
              size: f.size,
              type: f.type,
              data: f.data,
            })),
          })
        : uploadFiles[0].data;

      await assignmentsService.submitAssignment({
        assignmentId: selectedTask.id,
        studentId: currentStudent.id,
        fileName: combinedName,
        fileSize: combinedSize,
        fileData: fileDataPayload,
      });

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      setUploadProgress(100);
      setUploadPhase('¡Entrega guardada con éxito en Google Drive!');

      setUploadSuccess(
        isMulti
          ? `¡Tus ${uploadFiles.length} archivos se han entregado y guardado en Google Drive con éxito!`
          : `¡Tu trabajo "${uploadFiles[0].name}" se ha entregado y guardado en Google Drive con éxito!`
      );
      setTimeout(() => {
        setSelectedTask(null);
        setUploadFiles([]);
        setShowConfirmSummary(false);
        setUploadSuccess(null);
        setUploading(false);
        setUploadProgress(0);
        setUploadPhase('');
        loadStudentData();
      }, 2200);
    } catch (_) {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      alerts.error('Error', 'Error al enviar la tarea a Google Drive. Por favor intenta de nuevo.');
      setUploading(false);
      setUploadProgress(0);
      setUploadPhase('');
    }
  };

  const handleAskTutor = async (e: FormEvent) => {
    e.preventDefault();
    if (!tutorQuestion.trim() || tutorLoading) return;
    const q = tutorQuestion;
    setTutorQuestion('');
    setTutorChat((prev) => [...prev, { sender: 'user', text: q }]);
    setTutorLoading(true);

    try {
      const currentCourse = courses.find((c) => c.id === selectedCourseId);
      const res = await aiService.askTutor({
        subject: currentCourse?.name || 'Inglés CINDEA',
        question: q,
        studentGradeLevel: currentStudent?.moduleName || 'Módulo 52',
      });
      setTutorChat((prev) => [...prev, { sender: 'ai', text: res.answer }]);
    } catch (err: any) {
      console.error('Tutor error:', err);
      const msg = err?.response?.data?.error || 'Lo siento, no pude procesar tu pregunta en este momento. Por favor intenta de nuevo.';
      setTutorChat((prev) => [
        ...prev,
        { sender: 'ai', text: msg },
      ]);
    } finally {
      setTutorLoading(false);
    }
  };

  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <div className="flex flex-1 min-h-screen">
        {/* ========================================================= */}
        {/* SIDEBAR DESKTOP PLEGABLE / COLAPSABLE                     */}
        {/* ========================================================= */}
        <aside
          className={cn(
            'hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out select-none sticky top-0 h-screen z-30 shrink-0',
            sidebarCollapsed ? 'w-20' : 'w-64'
          )}
        >
          {/* Header de la Sidebar */}
          <div
            className={cn(
              'border-b border-slate-100 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center min-h-[73px] shrink-0 transition-all duration-200',
              sidebarCollapsed ? 'justify-center p-3' : 'justify-between p-4'
            )}
          >
            {sidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Desplegar menú lateral"
                className="h-10 w-10 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white flex items-center justify-center shadow-inner transition hover:scale-105"
              >
                <PanelLeftOpen className="w-5 h-5 text-amber-300" />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-blue-600/80 text-white flex items-center justify-center shadow-inner font-bold shrink-0">
                    <Languages className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold tracking-tight truncate">CINDEA MEP Cloud</div>
                    <div className="text-[11px] text-blue-200 truncate">Portal Estudiantil</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  title="Plegar menú lateral"
                  className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800/60 transition"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Navegación Simple y Amigable */}
          <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
            {!sidebarCollapsed && (
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menú Principal
              </div>
            )}

            {/* Inicio */}
            <button
              onClick={() => setActiveTab('dashboard')}
              title="Inicio"
              className={cn(
                'w-full flex items-center rounded-xl py-3 text-sm font-semibold transition-all group',
                sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5',
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Home
                className={cn(
                  'w-4 h-4 transition shrink-0',
                  activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                )}
              />
              {!sidebarCollapsed && <span>Inicio</span>}
            </button>

            {/* Tareas */}
            <button
              onClick={() => setActiveTab('assignments')}
              title="Tareas y Entregas"
              className={cn(
                'w-full flex items-center rounded-xl py-3 text-sm font-semibold transition-all group',
                sidebarCollapsed ? 'justify-center px-0 relative' : 'justify-between px-3.5',
                activeTab === 'assignments'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <FolderCheck
                  className={cn(
                    'w-4 h-4 transition shrink-0',
                    activeTab === 'assignments' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                  )}
                />
                {!sidebarCollapsed && <span>Tareas y Entregas</span>}
              </div>
              {assignments.length > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    sidebarCollapsed && 'absolute top-1 right-2 px-1.5 py-0.2',
                    activeTab === 'assignments' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {assignments.length}
                </span>
              )}
            </button>

            {/* Calificaciones */}
            <button
              onClick={() => setActiveTab('grades')}
              title="Calificaciones MEP"
              className={cn(
                'w-full flex items-center rounded-xl py-3 text-sm font-semibold transition-all group',
                sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5',
                activeTab === 'grades'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <GraduationCap
                className={cn(
                  'w-4 h-4 transition shrink-0',
                  activeTab === 'grades' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                )}
              />
              {!sidebarCollapsed && <span>Calificaciones MEP</span>}
            </button>

            {/* Comprobantes */}
            <button
              onClick={() => setActiveTab('justifications')}
              title="Comprobantes de Ausencia"
              className={cn(
                'w-full flex items-center rounded-xl py-3 text-sm font-semibold transition-all group',
                sidebarCollapsed ? 'justify-center px-0 relative' : 'justify-between px-3.5',
                activeTab === 'justifications'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <Paperclip
                  className={cn(
                    'w-4 h-4 transition shrink-0',
                    activeTab === 'justifications' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                  )}
                />
                {!sidebarCollapsed && <span>Comprobantes</span>}
              </div>
              {myJustifications.length > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    sidebarCollapsed && 'absolute top-1 right-2 px-1.5 py-0.2',
                    activeTab === 'justifications' ? 'bg-blue-500 text-white' : 'bg-amber-100 text-amber-800'
                  )}
                >
                  {myJustifications.length}
                </span>
              )}
            </button>

            {/* Tutor IA */}
            <button
              onClick={() => setActiveTab('tutor')}
              title="English AI Tutor"
              className={cn(
                'w-full flex items-center rounded-xl py-3 text-sm font-semibold transition-all group',
                sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5',
                activeTab === 'tutor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Sparkles
                className={cn(
                  'w-4 h-4 transition shrink-0',
                  activeTab === 'tutor' ? 'text-amber-300' : 'text-slate-400 group-hover:text-blue-600'
                )}
              />
              {!sidebarCollapsed && <span>English AI Tutor</span>}
            </button>
          </nav>

          {/* Perfil del Estudiante en el Footer de la Sidebar */}
          <div className="border-t border-slate-100 p-3 bg-slate-50/70">
            <div className={cn('flex items-center gap-3 min-w-0', sidebarCollapsed ? 'justify-center' : '')}>
              <div className="h-9 w-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {currentStudent.name.charAt(0)}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentStudent.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Cédula: {currentStudent.carnet}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Contenedor Principal */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 sticky top-0 z-20 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <span className="md:hidden font-bold text-blue-900 text-base">Portal Estudiantil</span>
                <div className="hidden sm:block text-xs font-medium text-slate-500">
                  Centro Integrado de Educación de Adultos (CINDEA) · MEP
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Selector de Modo Visual / Descanso Nocturno CINDEA */}
              <div className="flex items-center bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  title="Modo Claro (Diurno)"
                  className={cn(
                    'px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition text-[11px]',
                    theme === 'light'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Día</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  title="Modo Nocturno / Descanso Visual CINDEA"
                  className={cn(
                    'px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition text-[11px]',
                    theme === 'dark'
                      ? 'bg-slate-800 text-amber-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Noche</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('contrast')}
                  title="Alto Contraste (Accesibilidad)"
                  className={cn(
                    'px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition text-[11px]',
                    theme === 'contrast'
                      ? 'bg-black text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Contrast className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Contraste</span>
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    localStorage.removeItem(STUDENT_PROFILE_KEY);
                    localStorage.removeItem(STUDENT_COURSE_KEY);
                  } catch {}
                  await logout();
                  window.location.href = '/estudiante';
                }}
                className="text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 border-slate-200"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Salir
              </Button>
            </div>
          </header>

          {/* Menú Móvil Desplegable */}
          {mobileMenuOpen && (
            <div className="md:hidden border-b border-slate-200 bg-white p-4 space-y-1 shadow-md">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <Home className="w-4 h-4" />
                <span>Inicio</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('assignments');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'assignments' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <FolderCheck className="w-4 h-4" />
                  <span>Tareas y Entregas</span>
                </div>
                {assignments.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {assignments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('grades');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'grades' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Calificaciones MEP</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('justifications');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'justifications' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <Paperclip className="w-4 h-4" />
                  <span>Comprobantes de Ausencia</span>
                </div>
                {myJustifications.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {myJustifications.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('tutor');
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition text-left',
                  activeTab === 'tutor' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>English AI Tutor</span>
              </button>
            </div>
          )}

          {/* CONTENIDO PRINCIPAL */}
          <main className="p-3.5 sm:p-6 md:p-8 pb-24 md:pb-8 space-y-6 max-w-7xl">
            {/* 1. SECCIÓN: DASHBOARD GENERAL */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* 1. Encabezado Ejecutivo y Limpio (Estilo Docente) */}
                <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-xs font-semibold text-blue-300">
                        <Languages className="w-3.5 h-3.5 text-amber-300" />
                        <span>Portal Estudiantil · CINDEA MEP 2026</span>
                      </div>
                      <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                        <span>¡Hola, {currentStudent.name.split(' ')[0]}!</span>
                        <span className="text-xl font-normal">👋</span>
                      </h1>
                      <p className="text-xs md:text-sm text-slate-300 flex items-center gap-2 flex-wrap">
                        <span className="text-blue-300 font-medium">{currentCourse?.name || 'Inglés CINDEA'}</span>
                        <span className="text-slate-600">•</span>
                        <span>Cédula / Carné: <strong className="font-mono text-white">{currentStudent.carnet}</strong></span>
                      </p>
                    </div>

                    {courses.length > 1 && (
                      <div className="w-64 shrink-0">
                        <Select
                          label=""
                          name="courseSelect"
                          value={selectedCourseId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedCourseId(val);
                            try {
                              localStorage.setItem(STUDENT_COURSE_KEY, val);
                            } catch {}
                          }}
                          options={courses.map((c) => ({ value: c.id, label: c.name }))}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3 Tarjetas de Resumen KPI Minimalistas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Tareas */}
                  <div
                    onClick={() => setActiveTab('assignments')}
                    className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 hover:shadow-xs transition group flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Tareas & Entregas</span>
                      <div className="text-2xl font-black text-slate-900">{assignments.length}</div>
                      <span className="text-[11px] text-blue-600 font-medium group-hover:underline flex items-center gap-1">
                        Ver actividades <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileEdit className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Promedio Ponderado MEP */}
                  <div
                    onClick={() => setActiveTab('grades')}
                    className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition group flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Promedio MEP</span>
                      <div className="text-2xl font-black font-mono text-slate-900">
                        {myGradeSummary.totalScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                      </div>
                      <span
                        className={cn(
                          'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          myGradeSummary.status === 'APROBADO'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : myGradeSummary.status === 'EN CURSO'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        )}
                      >
                        {myGradeSummary.status}
                      </span>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Asistencia SICIN */}
                  <div
                    onClick={() => setActiveTab('justifications')}
                    className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs transition group flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Asistencia (10%)</span>
                      <div className="text-2xl font-black font-mono text-slate-900">
                        {myGradeSummary.asistenciaScore} <span className="text-xs font-normal text-slate-400">/ 10 pts</span>
                      </div>
                      <span className="text-[11px] text-amber-700 font-medium group-hover:underline flex items-center gap-1">
                        {myJustifications.length} comprobante(s) <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Paperclip className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Grid de 2 Columnas: Tareas Activas y Avisos/Idiom */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Columna Izquierda: Tareas Recientes (7 cols) */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <FolderCheck className="w-4 h-4 text-blue-600" />
                        <h2 className="text-sm font-bold text-slate-900">Tareas del Módulo</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('assignments')}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Ver todas
                      </button>
                    </div>

                    {assignments.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No hay tareas asignadas por el momento.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {assignments.slice(0, 3).map((a) => {
                          const mySub = submissions.find((s) => s.assignmentId === a.id);
                          const myGrade = myGrades.find((g) => g.assignmentId === a.id);

                          return (
                            <div
                              key={a.id}
                              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="font-bold text-slate-900 truncate">{a.title}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                  <span>{a.category || 'Tarea'}</span>
                                  <span>•</span>
                                  <span>{a.maxScore} pts</span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {myGrade ? (
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    Nota: {myGrade.score}/{myGrade.maxScore}
                                  </span>
                                ) : mySub ? (
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✓ Entregado
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('assignments');
                                      setSelectedTask(a);
                                    }}
                                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition"
                                  >
                                    Entregar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Columna Derecha: Avisos Oficiales y Tutor Virtual (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Avisos Oficiales */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 text-xs font-bold text-slate-900">
                        <MessageCircle className="w-4 h-4 text-blue-600" />
                        <span>Avisos & Comunicados</span>
                      </div>
                      {announcements.length === 0 ? (
                        <div className="text-center py-5 text-xs text-slate-400">
                          No hay avisos recientes de la docente.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {announcements.slice(0, 3).map((ann) => (
                            <div key={ann.id} className="py-2.5 space-y-1 text-xs">
                              <div className="font-bold text-slate-900">{ann.title}</div>
                              <p className="text-slate-600 text-[11px] line-clamp-3 leading-relaxed">{ann.content}</p>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {new Date(ann.createdAt).toLocaleDateString('es-CR')} • {ann.sentBy || 'Docente'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Acceso Rápido al Tutor IA */}
                    <div
                      onClick={() => setActiveTab('tutor')}
                      className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition shadow-2xs space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                          <Bot className="w-4 h-4 text-indigo-600" />
                          <span>English AI Tutor</span>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                          Abrir chat <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-900 leading-snug">
                        ¿Tienes dudas con vocabulario, gramática o redacción de tu tarea? Consulta con tu tutor 24/7.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SECCIÓN: TAREAS & ENTREGAS (MY ASSIGNMENTS) */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tareas & Actividades de Inglés</h2>
                <p className="text-xs text-slate-500">
                  Consignas asignadas para {currentCourse?.name}. Sube tus documentos en Word, PDF, fotos o notas de audio.
                </p>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white text-slate-500 text-xs">
                No hay tareas asignadas en este módulo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((a) => {
                  const mySub = submissions.find((s) => s.assignmentId === a.id);
                  const myGrade = myGrades.find(
                    (g) => g.assignmentId === a.id || (g.title && a.title && g.title.toLowerCase().trim() === a.title.toLowerCase().trim())
                  );
                  const isWithinDeadline = !a.dueDate || new Date().getTime() <= new Date(a.dueDate).getTime();

                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'rounded-2xl border bg-white p-5 shadow-2xs hover:shadow-sm transition flex flex-col justify-between space-y-4',
                        myGrade
                          ? 'border-blue-200'
                          : mySub
                          ? 'border-emerald-200'
                          : 'border-slate-200/90'
                      )}
                    >
                      <div className="space-y-3">
                        {/* Cabecera limpia: Categoría y Puntos a la izquierda, Estado a la derecha */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                              {a.category || 'Tarea'}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-400">
                              {a.maxScore} pts
                            </span>
                          </div>

                          {myGrade ? (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              {myGrade.score}/{myGrade.maxScore} pts
                            </span>
                          ) : mySub ? (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Entregado
                            </span>
                          ) : a.submissionType === 'in_class' ? (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              Evaluación en aula
                            </span>
                          ) : isWithinDeadline ? (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Pendiente
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Vencida
                            </span>
                          )}
                        </div>

                        {/* Título y descripción */}
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                          {a.description && (
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.description}</p>
                          )}
                        </div>

                        {/* Material / Guía del docente (si existe) */}
                        {a.attachmentName && (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                            <span className="truncate font-medium text-slate-700 flex items-center gap-1.5 text-[11px]">
                              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              Guía: <span className="font-semibold text-slate-900 truncate max-w-[180px]">{a.attachmentName}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.createElement('a');
                                if (a.attachmentData && a.attachmentData.startsWith('data:')) {
                                  el.href = a.attachmentData;
                                } else if (a.attachmentData) {
                                  el.href = URL.createObjectURL(new Blob([a.attachmentData]));
                                } else {
                                  el.href = 'https://drive.google.com/drive/folders/1sDpkjftZUFewVSGDemeyViPUlVUBki0L?authuser=pruebaproyecto551@gmail.com';
                                  el.target = '_blank';
                                }
                                el.download = a.attachmentName || 'Guia_Profesor.pdf';
                                document.body.appendChild(el);
                                el.click();
                                document.body.removeChild(el);
                              }}
                              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs shrink-0 transition flex items-center gap-1"
                            >
                              <Download className="w-3 h-3 text-blue-600" />
                              <span>Descargar</span>
                            </button>
                          </div>
                        )}

                        {/* Detalle si ya fue calificado */}
                        {myGrade && (
                          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5 text-xs text-blue-950">
                            <div className="flex items-center justify-between font-bold text-[11px]">
                              <span>Nota de la docente:</span>
                              <span className="font-mono font-black">{myGrade.score} / {myGrade.maxScore} pts</span>
                            </div>
                            {myGrade.notes && (
                              <p className="text-[11px] text-blue-900 italic font-medium">"{myGrade.notes}"</p>
                            )}
                          </div>
                        )}

                        {/* Detalle de entrega limpia (si el estudiante entregó) */}
                        {mySub && !myGrade && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px]">
                                <FolderCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[180px] sm:max-w-[240px]">{mySub.fileName}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Entregado: {formatCleanDate(mySub.submittedAt)}
                              </p>
                            </div>
                            {mySub.fileData && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (mySub.fileData?.startsWith('{"isMulti":true')) {
                                    try {
                                      const parsed = JSON.parse(mySub.fileData);
                                      const files: any[] = parsed.files || [];
                                      files.forEach((f, idx) => {
                                        setTimeout(() => {
                                          const el = document.createElement('a');
                                          el.href = f.data;
                                          el.download = f.name;
                                          document.body.appendChild(el);
                                          el.click();
                                          document.body.removeChild(el);
                                        }, idx * 250);
                                      });
                                      return;
                                    } catch (_) {}
                                  }
                                  const el = document.createElement('a');
                                  el.href = mySub.fileData!;
                                  el.download = mySub.fileName || 'Entrega_Tarea';
                                  document.body.appendChild(el);
                                  el.click();
                                  document.body.removeChild(el);
                                }}
                                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition shadow-2xs shrink-0 flex items-center gap-1.5"
                                title="Descargar comprobante de entrega"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Descargar</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pie de tarjeta con fecha límite y botón de acción */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Límite: {formatCleanDate(a.dueDate)}</span>
                        </div>

                        <div className="shrink-0">
                          {mySub && isWithinDeadline ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTask(a);
                                setUploadFiles([]);
                              }}
                              className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1 rounded-lg transition shadow-2xs"
                            >
                              Reemplazar
                            </button>
                          ) : !mySub && isWithinDeadline && a.submissionType !== 'in_class' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedTask(a);
                                setUploadFiles([]);
                              }}
                              className="text-[11px] font-bold bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg shadow-2xs"
                            >
                              Subir entrega
                            </Button>
                          ) : !mySub && !isWithinDeadline ? (
                            <span className="text-[11px] font-semibold text-rose-500">Plazo cerrado</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. SECCIÓN: MIS CALIFICACIONES PRIVADAS (MY GRADES) */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            {/* Cabecera Limpia */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <span>Calificaciones & Rendimiento</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Desglose oficial de rubros evaluativos y promedio ponderado MEP.
                </p>
              </div>

              {/* Píldora de Promedio Ponderado */}
              <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promedio Final</div>
                  <div className="text-xl font-black font-mono text-slate-900">
                    {myGradeSummary.totalScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-bold border',
                    myGradeSummary.status === 'APROBADO'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : myGradeSummary.status === 'EN CURSO'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {myGradeSummary.status}
                </span>
              </div>
            </div>

            {/* 4 Tarjetas KPI de Componentes MEP */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 text-center shadow-2xs space-y-1">
                <div className="text-xs text-slate-500 font-bold">Cotidiano (50%)</div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {myGradeSummary.cotidianoAvg} <span className="text-xs font-normal text-slate-400">/ 100</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {((myGradeSummary.cotidianoAvg * 0.5)).toFixed(1)} / 50 pts
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 text-center shadow-2xs space-y-1">
                <div className="text-xs text-slate-500 font-bold">Pruebas (30%)</div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {myGradeSummary.pruebasAvg} <span className="text-xs font-normal text-slate-400">/ 100</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {((myGradeSummary.pruebasAvg * 0.3)).toFixed(1)} / 30 pts
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 text-center shadow-2xs space-y-1">
                <div className="text-xs text-slate-500 font-bold">Tareas (10%)</div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {myGradeSummary.tareasAvg} <span className="text-xs font-normal text-slate-400">/ 100</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {((myGradeSummary.tareasAvg * 0.1)).toFixed(1)} / 10 pts
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 text-center shadow-2xs space-y-1">
                <div className="text-xs text-slate-500 font-bold">Asistencia (10%)</div>
                <div className="text-2xl font-black font-mono text-blue-700">
                  {myGradeSummary.asistenciaScore} <span className="text-xs font-normal text-slate-400">%</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {((myGradeSummary.asistenciaScore * 0.1)).toFixed(1)} / 10 pts
                </div>
              </div>
            </div>

            {/* Detalle de Evaluaciones Registradas */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-900 flex items-center justify-between">
                <span>Evaluaciones Registradas</span>
                <span className="text-slate-400 font-normal">{myGrades.length} registro(s)</span>
              </div>

              {myGrades.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400 space-y-1">
                  <p>Aún no tienes calificaciones registradas en este período.</p>
                  <p className="text-[11px] text-slate-400">Las notas aparecerán aquí tan pronto la docente califique tus entregas y pruebas.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myGrades.map((g) => (
                    <div key={g.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/60 transition">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-sm">{g.title}</div>
                        <div className="text-blue-600 font-medium text-[11px] flex items-center gap-2">
                          <span>{g.category}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400">Calificado el {g.gradedOn}</span>
                        </div>
                        {g.notes && (
                          <div className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs italic mt-1">
                            "{g.notes}"
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black font-mono px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-900">
                          {g.score} / {g.maxScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. SECCIÓN: ASISTENTE DE DUDAS (ENGLISH AI TUTOR) */}
        {activeTab === 'tutor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-3xl border border-indigo-200/80 bg-white shadow-2xs flex flex-col h-[560px] overflow-hidden">
                {/* Chat Header */}
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-inner">
                      <Bot className="w-5 h-5 text-amber-300 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                        <span>English AI Tutor</span>
                        <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-md">Gemini</span>
                      </h3>
                      <p className="text-[11px] text-indigo-100/90 font-medium">Asistente y tutor de inglés para estudiantes CINDEA</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Online 24/7
                  </span>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4 bg-slate-50/60">
                  {tutorChat.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex flex-col max-w-[90%] sm:max-w-[80%] rounded-3xl p-4 text-xs leading-relaxed transition-all shadow-2xs',
                        msg.sender === 'user'
                          ? 'ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                          : 'mr-auto bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-black/5 dark:border-white/10">
                        <span className="text-[10px] font-bold opacity-80 flex items-center gap-1">
                          {msg.sender === 'user' ? (
                            <>👤 Tú ({currentStudent?.name?.split(' ')[0] || 'Estudiante'})</>
                          ) : (
                            <>🇬🇧 English AI Tutor</>
                          )}
                        </span>

                        {msg.sender === 'ai' && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              setCopiedTutorIdx(idx);
                              setTimeout(() => setCopiedTutorIdx(null), 2000);
                            }}
                            className="text-[10px] text-slate-400 hover:text-indigo-600 font-semibold flex items-center gap-1 transition px-1.5 py-0.5 rounded hover:bg-slate-100 cursor-pointer"
                            title="Copiar texto"
                          >
                            {copiedTutorIdx === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Renderizador de Markdown Elegante sin Asteriscos Crudos */}
                      {msg.sender === 'ai' ? (
                        <FormattedMessage content={msg.text} />
                      ) : (
                        <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                      )}
                    </div>
                  ))}

                  {tutorLoading && (
                    <div className="mr-auto bg-white p-3.5 rounded-3xl rounded-tl-xs border border-slate-200 text-xs text-slate-500 shadow-2xs flex items-center gap-2.5">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      <span className="font-semibold text-slate-700">El Tutor IA está redactando tu explicación en inglés...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleAskTutor} className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs transition"
                    placeholder="Pregúntame sobre vocabulario, pronunciación, gramática o tareas..."
                    value={tutorQuestion}
                    onChange={(e) => setTutorQuestion(e.target.value)}
                    disabled={tutorLoading}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={tutorLoading || !tutorQuestion.trim()}
                    className="rounded-2xl px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xs shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Preguntar</span>
                  </Button>
                </form>
              </div>
            </div>

            {/* Sugerencias Rápidas de Preguntas CINDEA */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Preguntas Frecuentes Sugeridas:
                </h3>
              </div>

              <div className="space-y-2">
                {[
                  { tag: 'Grammar', prompt: '¿Cuál es la diferencia entre Simple Past y Present Perfect con ejemplos?' },
                  { tag: 'Speaking', prompt: '¿Cómo se pronuncian las terminaciones -ed en los verbos regulares?' },
                  { tag: 'Writing', prompt: 'Corrige esta frase: "I have 20 years old and I am study English"' },
                  { tag: 'Useful Phrases', prompt: '¿Qué expresiones puedo usar para ordenar comida en un restaurante?' },
                  { tag: 'Jobs', prompt: 'Explícame cómo responder preguntas en una entrevista de trabajo en inglés' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTutorQuestion(item.prompt);
                    }}
                    className="w-full text-left p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/40 transition text-xs text-slate-700 shadow-2xs flex items-center justify-between gap-2.5 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="inline-block px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase tracking-wider mb-1 border border-indigo-100">
                        {item.tag}
                      </span>
                      <p className="font-semibold text-slate-800 leading-snug group-hover:text-indigo-700 transition line-clamp-2">
                        {item.prompt}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: JUSTIFICACIONES Y COMPROBANTES DE AUSENCIA */}
        {/* ========================================================================= */}
        {/* 4. SECCIÓN: COMPROBANTES DE AUSENCIA */}
        {activeTab === 'justifications' && (
          <div className="space-y-6">
            {/* Cabecera Limpia sin Ruido Visual */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-amber-600" />
                  <span>Comprobantes de Ausencia</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Envía constancias médicas de la CCSS o laborales para justificar lecciones sin rebajo de asistencia.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulario de subida de justificante (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UploadCloud className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-bold text-slate-900">Subir Justificación</h2>
                </div>

                <form onSubmit={handleSendJustification} className="space-y-3.5 text-xs">
                  {justError && (
                    <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{justError}</span>
                    </div>
                  )}

                  {justSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{justSuccess}</span>
                    </div>
                  )}

                  {courses.length > 1 && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Módulo / Curso:</label>
                      <Select
                        options={courses.map((c) => ({ value: c.id, label: c.name }))}
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Fecha de la Ausencia:</label>
                      <span className="text-[10px] text-slate-400">Plazo máx. 8 días</span>
                    </div>
                    <input
                      type="date"
                      min={getAbsenceDateBounds().min}
                      max={getAbsenceDateBounds().max}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none bg-slate-50/50"
                      value={justAbsenceDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJustAbsenceDate(val);
                        if (val) {
                          const selected = new Date(val + 'T00:00:00');
                          const now = new Date();
                          const diff = Math.floor((now.getTime() - selected.getTime()) / (1000 * 60 * 60 * 24));
                          if (diff > 8) {
                            setJustError(`⚠️ Plazo vencido: Han pasado ${diff} días desde esta fecha. El límite del MEP es de 8 días naturales.`);
                          } else {
                            setJustError(null);
                          }
                        }
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Motivo o Justificación:</label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none bg-slate-50/50"
                      rows={3}
                      placeholder="Ej. Cita médica en la CCSS / Dictamen médico / Motivo laboral..."
                      value={justReason}
                      onChange={(e) => setJustReason(e.target.value)}
                      required
                    />
                  </div>

                  {/* Selector y subida de archivo / foto */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Comprobante(s) Médico / Fotografía(s) {justFiles.length > 0 && `(${justFiles.length})`}:
                      </label>
                      {justFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setJustFiles([])}
                          className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                        >
                          <X className="w-3 h-3" /> Quitar todos
                        </button>
                      )}
                    </div>

                    {justFiles.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
                        {justFiles.map((file) => (
                          <div key={file.id} className="p-2 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between text-xs gap-3">
                            <div className="flex items-center gap-2 truncate font-semibold text-slate-900">
                              {file.data.startsWith('data:image/') ? (
                                <img src={file.data} alt={file.name} className="w-7 h-7 object-cover rounded-md border border-amber-300 shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                              )}
                              <div className="truncate">
                                <div className="truncate text-slate-900">{file.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{formatFileSize(file.size)}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setJustFiles((prev) => prev.filter((f) => f.id !== file.id))}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Quitar este archivo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingJust(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingJust(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingJust(false);
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingJust(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          const updated = await processFiles(e.dataTransfer.files, justFiles);
                          setJustFiles(updated);
                        }
                      }}
                      className={cn(
                        'border-2 border-dashed rounded-2xl p-4 text-center space-y-1.5 cursor-pointer transition block group',
                        isDraggingJust
                          ? 'border-amber-500 bg-amber-100/80 scale-[1.01] ring-4 ring-amber-200'
                          : 'border-slate-300 hover:border-amber-500 bg-slate-50/60 hover:bg-amber-50/40'
                      )}
                    >
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const updated = await processFiles(e.target.files, justFiles);
                            setJustFiles(updated);
                            e.target.value = '';
                          }
                        }}
                      />
                      <div className="flex justify-center gap-2 text-amber-600">
                        <Camera className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition" />
                        <UploadCloud className={cn('w-5 h-5 text-slate-400 group-hover:text-amber-600 transition', isDraggingJust && 'animate-bounce text-amber-600')} />
                      </div>
                      <div className="font-bold text-slate-700 text-xs">
                        {justFiles.length > 0 ? '+ Adjuntar más fotos o comprobantes' : 'Tomar foto(s), arrastrar o seleccionar archivos'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Puedes subir múltiples fotos o comprobantes CCSS / PDF (Máx. 15 MB c/u)
                      </div>
                    </label>
                  </div>

                  <Button
                    variant="primary"
                    type="submit"
                    disabled={justSubmitting}
                    className="w-full bg-amber-600 hover:bg-amber-700 font-bold text-xs"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {justSubmitting ? 'Enviando comprobante...' : 'Enviar Justificación a la Docente'}
                  </Button>
                </form>
              </div>

              {/* Lista e historial de justificaciones enviadas */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock3 className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Historial de Justificaciones Enviadas</h3>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {myJustifications.length} comprobante(s)
                  </span>
                </div>

                {myJustifications.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                    <Paperclip className="w-8 h-8 mx-auto text-slate-300" />
                    <p>Aún no has enviado ninguna justificación de ausencia.</p>
                    <p className="text-[11px] text-slate-400">
                      Cuando faltes a clase por motivos justificados, sube el comprobante en el formulario de la izquierda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myJustifications.map((j) => (
                      <div
                        key={j.id}
                        className={cn(
                          'p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs',
                          j.status === 'pending'
                            ? 'bg-amber-50/50 border-amber-200'
                            : j.status === 'approved'
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-rose-50/50 border-rose-200'
                        )}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">
                              Ausencia del: {j.absenceDate}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-medium">{j.courseName}</span>
                          </div>

                          <p className="text-slate-700 italic bg-white/70 p-2 rounded-lg border border-slate-100">
                            "{j.reason}"
                          </p>

                          {/* Comentario de la docente */}
                          {j.teacherComment && (
                            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
                              <strong>Respuesta de la Docente:</strong> {j.teacherComment}
                            </div>
                          )}

                          <div className="text-[11px] text-slate-400">
                            Enviado el: {new Date(j.createdAt).toLocaleDateString()} a las {new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Estado y archivo adjunto */}
                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          {j.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                              En revisión docente
                            </span>
                          )}
                          {j.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Aprobada (Justificada)
                            </span>
                          )}
                          {j.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-300">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              No Aprobada
                            </span>
                          )}

                          {j.fileData && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedJustificationDoc(j)}
                              className="text-[11px] bg-white hover:bg-slate-100"
                            >
                              <Eye className="w-3 h-3 mr-1 text-slate-600" />
                              Ver Comprobante
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE VISUALIZACIÓN DE COMPROBANTE DE AUSENCIA */}
      <Modal
        open={selectedJustificationDoc !== null}
        title={`Comprobante de Ausencia: ${selectedJustificationDoc?.studentName || ''}`}
        onClose={() => setSelectedJustificationDoc(null)}
        footer={
          <Button variant="secondary" onClick={() => setSelectedJustificationDoc(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedJustificationDoc && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong>Fecha de Ausencia:</strong> {selectedJustificationDoc.absenceDate}</div>
              <div><strong>Módulo:</strong> {selectedJustificationDoc.courseName}</div>
              <div><strong>Motivo:</strong> {selectedJustificationDoc.reason}</div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-100 text-center max-h-96 overflow-y-auto space-y-3">
              {selectedJustificationDoc.fileData && selectedJustificationDoc.fileData.startsWith('{"isMulti":true') ? (
                (() => {
                  try {
                    const parsed = JSON.parse(selectedJustificationDoc.fileData);
                    const files: any[] = parsed.files || [];
                    return (
                      <div className="space-y-3 text-left">
                        <div className="text-xs font-bold text-slate-700">
                          Comprobantes adjuntos ({files.length}):
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {files.map((file, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-800 truncate">{file.name}</span>
                                <a
                                  href={file.data}
                                  download={file.name}
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 shadow-2xs"
                                >
                                  📥 Descargar
                                </a>
                              </div>
                              {file.data && file.data.startsWith('data:image/') && (
                                <img src={file.data} alt={file.name} className="max-h-60 mx-auto rounded shadow-sm border border-slate-200" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch (_) {
                    return <div>Comprobantes listos.</div>;
                  }
                })()
              ) : selectedJustificationDoc.fileType?.startsWith('image/') || selectedJustificationDoc.fileData?.startsWith('data:image/') ? (
                <img
                  src={selectedJustificationDoc.fileData}
                  alt="Comprobante de Ausencia"
                  className="max-w-full h-auto mx-auto rounded-lg shadow-sm"
                />
              ) : selectedJustificationDoc.fileType === 'application/pdf' || selectedJustificationDoc.fileData?.startsWith('data:application/pdf') ? (
                <div className="space-y-3 py-6">
                  <FileText className="w-16 h-16 text-rose-500 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">{selectedJustificationDoc.fileName || 'Comprobante_Medico.pdf'}</div>
                  <a
                    href={selectedJustificationDoc.fileData}
                    download={selectedJustificationDoc.fileName || 'Comprobante_Medico.pdf'}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    📥 Descargar y Abrir PDF
                  </a>
                </div>
              ) : (
                <div className="space-y-3 py-6">
                  <Paperclip className="w-12 h-12 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold">{selectedJustificationDoc.fileName || 'Documento adjunto'}</div>
                  {selectedJustificationDoc.fileData && (
                    <a
                      href={selectedJustificationDoc.fileData}
                      download={selectedJustificationDoc.fileName || 'Documento'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold"
                    >
                      Descargar archivo
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DE SUBIDA Y ENTREGA DE ASIGNACIÓN */}
      <Modal
        open={selectedTask !== null}
        title={
          selectedTask
            ? showConfirmSummary
              ? `📋 Confirmación de Entrega: ${selectedTask.title}`
              : submissions.some((s) => s.assignmentId === selectedTask.id)
              ? `Reemplazar Entrega: ${selectedTask.title}`
              : `Entregar Asignación: ${selectedTask.title}`
            : 'Entregar Asignación'
        }
        onClose={() => {
          if (!uploading) {
            setSelectedTask(null);
            setShowConfirmSummary(false);
          }
        }}
        footer={
          showConfirmSummary ? (
            <>
              {!uploading && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowConfirmSummary(false)}
                >
                  ← Volver a modificar
                </Button>
              )}
              <Button
                type="button"
                onClick={() => handleUploadAssignment()}
                disabled={uploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sincronizando con Drive...
                  </span>
                ) : (
                  '✓ Confirmar y Enviar a Google Drive'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" type="button" onClick={() => setSelectedTask(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (uploadFiles.length === 0) {
                    alerts.warning('Falta archivo', 'Por favor adjunta al menos un archivo antes de continuar.');
                    return;
                  }
                  setShowConfirmSummary(true);
                }}
                disabled={uploadFiles.length === 0}
              >
                Revisar y Confirmar ({uploadFiles.length}) →
              </Button>
            </>
          )
        }
      >
        {showConfirmSummary && selectedTask ? (
          <div className="space-y-4 py-1">
            {/* Pantalla de Resumen antes de Enviar */}
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/90 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 text-sm">{selectedTask.title}</span>
                <span className="font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                  {selectedTask.maxScore} pts
                </span>
              </div>
              <p className="text-blue-900">
                {currentCourse?.name} · {selectedTask.category || 'Tarea'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Archivos listos para enviar ({uploadFiles.length}):</span>
                <span className="text-slate-400">
                  Peso total: {formatFileSize(uploadFiles.reduce((acc, f) => acc + f.size, 0))}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadFiles.map((file, idx) => (
                  <div key={file.id || idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate text-slate-800 font-medium">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Barra de Progreso y Animación en Vivo durante la Subida */}
            {uploading ? (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-950 flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-indigo-600 animate-pulse" />
                    {uploadPhase || 'Sincronizando con Google Drive...'}
                  </span>
                  <span className="font-mono font-bold text-indigo-700">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-indigo-200/70 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-indigo-700 text-center">
                  Guardando en la carpeta oficial del curso en la nube...
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                ☁️ <strong>Garantía de Entrega:</strong> Al confirmar, tus documentos se cifrarán y sincronizarán de forma permanente en Google Drive para la revisión de la docente.
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}
          </div>
        ) : (
          <form id="student-upload-form" onSubmit={(e) => { e.preventDefault(); setShowConfirmSummary(true); }} className="space-y-4">
            {/* Instrucciones de la docente (solo si existen) */}
            {selectedTask?.description && selectedTask.description.trim().length > 0 && (
              <div className="text-xs text-slate-700 bg-blue-50/80 p-3.5 rounded-xl border border-blue-200/80 leading-relaxed space-y-1">
                <div className="font-bold text-blue-950 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Instrucciones de la Docente:</span>
                </div>
                <p className="text-slate-700">{selectedTask.description}</p>
              </div>
            )}

            {/* Guía de la docente si existe adjunto */}
            {selectedTask?.attachmentName && (
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200/80 flex items-center justify-between text-xs text-indigo-950">
                <span className="truncate font-semibold flex items-center gap-1.5 text-[11px]">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  Guía de Trabajo: <strong>{selectedTask.attachmentName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.createElement('a');
                    if (selectedTask.attachmentData && selectedTask.attachmentData.startsWith('data:')) {
                      el.href = selectedTask.attachmentData;
                    } else if (selectedTask.attachmentData) {
                      el.href = URL.createObjectURL(new Blob([selectedTask.attachmentData]));
                    } else {
                      el.href = 'https://drive.google.com/drive/folders/1sDpkjftZUFewVSGDemeyViPUlVUBki0L?authuser=pruebaproyecto551@gmail.com';
                      el.target = '_blank';
                    }
                    el.download = selectedTask.attachmentName || 'Guia.pdf';
                    document.body.appendChild(el);
                    el.click();
                    document.body.removeChild(el);
                  }}
                  className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs shrink-0 transition"
                >
                  📥 Descargar Guía
                </button>
              </div>
            )}

            {/* Lista de archivos adjuntos y Dropzone Drag & Drop */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Archivos de la Entrega {uploadFiles.length > 0 && `(${uploadFiles.length})`}:
                </label>
                {uploadFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUploadFiles([])}
                    className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                  >
                    <X className="w-3 h-3" /> Quitar todos
                  </button>
                )}
              </div>

              {uploadFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadFiles.map((file) => (
                    <div key={file.id} className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2.5 truncate text-blue-950 font-semibold">
                        {file.data.startsWith('data:image/') ? (
                          <img src={file.data} alt={file.name} className="w-7 h-7 object-cover rounded-md border border-blue-300 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="truncate text-slate-900">{file.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{formatFileSize(file.size)}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadFiles((prev) => prev.filter((f) => f.id !== file.id))}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Quitar este archivo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingSubmission(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingSubmission(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingSubmission(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingSubmission(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const updated = await processFiles(e.dataTransfer.files, uploadFiles);
                    setUploadFiles(updated);
                  }
                }}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-5 text-center space-y-2 cursor-pointer transition block group',
                  isDraggingSubmission
                    ? 'border-blue-500 bg-blue-100/70 scale-[1.01] ring-4 ring-blue-200'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/40'
                )}
              >
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.mp3,.wav,.m4a,.ogg,.jpg,.jpeg,.png,.txt,.zip,.rar"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const updated = await processFiles(e.target.files, uploadFiles);
                      setUploadFiles(updated);
                      e.target.value = '';
                    }
                  }}
                />
                <FolderUp
                  className={cn(
                    'w-6 h-6 mx-auto transition',
                    isDraggingSubmission ? 'text-blue-600 animate-bounce' : 'text-slate-400 group-hover:text-blue-600'
                  )}
                />
                <div className="text-xs font-bold text-slate-700">
                  {uploadFiles.length > 0 ? '+ Adjuntar más archivos o fotos' : 'Arrastra tus archivos aquí o haz clic para seleccionar'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Puedes subir varios archivos (Word, PDF, Fotos, Audio MP3/M4A, ZIP) · Máx. 15 MB c/u
                </div>
              </label>
            </div>
          </form>
        )}
      </Modal>

          {/* Barra Inferior Fija para Móviles (Bottom Navigation Bar) */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer',
                activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              )}
            >
              <Home className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Inicio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition relative cursor-pointer',
                activeTab === 'assignments' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              )}
            >
              <FolderCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Tareas</span>
              {assignments.length > 0 && (
                <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grades')}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer',
                activeTab === 'grades' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              )}
            >
              <GraduationCap className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Notas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('justifications')}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition relative cursor-pointer',
                activeTab === 'justifications' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              )}
            >
              <Paperclip className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Boletas</span>
              {myJustifications.length > 0 && (
                <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tutor')}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer',
                activeTab === 'tutor' ? 'text-amber-500 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              )}
            >
              <Sparkles className="w-5 h-5 mb-0.5 text-amber-500" />
              <span className="text-[10px]">Tutor IA</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
