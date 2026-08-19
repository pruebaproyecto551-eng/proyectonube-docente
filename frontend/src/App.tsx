import { BrowserRouter, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Courses } from './pages/Courses';
import { CourseDetail } from './pages/CourseDetail';
import { Grades } from './pages/Grades';
import { Attendance } from './pages/Attendance';
import { Assignments } from './pages/Assignments';
import { Announcements } from './pages/Announcements';
import { AIAssistant } from './pages/AIAssistant';
import { Planning } from './pages/Planning';
import { GoogleCalendarPage } from './pages/GoogleCalendarPage';
import { StudentPortal } from './pages/StudentPortal';
import { LoginEstudiante } from './pages/LoginEstudiante';
import { Loading } from './components/Loading';
import { ForcePasswordChangeModal } from './components/ForcePasswordChangeModal';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Acceso Docente · CINDEA MEP Cloud',
  '/login': 'Acceso Docente · CINDEA MEP Cloud',
  '/estudiante': 'Portal Estudiantil · CINDEA MEP Cloud',
  '/student-portal': 'Inicio · Portal Estudiantil',
  '/dashboard': 'Inicio · CINDEA MEP Cloud',
  '/courses': 'Grupos · CINDEA MEP Cloud',
  '/attendance': 'Asistencia · CINDEA MEP Cloud',
  '/assignments': 'Tareas · CINDEA MEP Cloud',
  '/grades': 'Calificaciones · CINDEA MEP Cloud',
  '/students': 'Estudiantes · CINDEA MEP Cloud',
  '/planning': 'Planeamiento · CINDEA MEP Cloud',
  '/calendar': 'Calendario · CINDEA MEP Cloud',
  '/announcements': 'Comunicados · CINDEA MEP Cloud',
  '/ai-assistant': 'Asistente IA · CINDEA MEP Cloud',
};

function PageTitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = ROUTE_TITLES[path];
    if (!title) {
      if (path.startsWith('/courses/')) {
        title = 'Grupos · CINDEA MEP Cloud';
      } else {
        title = 'CINDEA MEP Cloud';
      }
    }
    document.title = title;
  }, [location.pathname]);

  return null;
}

function OAuthCallback() {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }

    if (status === 'authenticated') {
      if (user?.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else if (status === 'unauthenticated' && !accessToken && !localStorage.getItem('access_token')) {
      navigate('/login', { replace: true });
    }
  }, [status, user, navigate]);

  return <Loading label="Iniciando sesión con Google..." />;
}

function RootRedirect() {
  const { user, status } = useAuth();
  if (status === 'loading') {
    return <Loading label="Cargando portal..." />;
  }
  if (status === 'authenticated') {
    if (user?.role === 'student') {
      return <Navigate to="/student-portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <PageTitleUpdater />
      <AuthProvider>
        <ForcePasswordChangeModal />
        <Routes>
          {/* Ruta raíz: Redirige automáticamente al portal correspondiente sin mostrar página intermedia */}
          <Route path="/" element={<RootRedirect />} />

          {/* Login Docente — Portada integrada + Formulario exclusivo */}
          <Route path="/login" element={<Login />} />

          {/* Login Estudiante — Portada integrada + Formulario por Cédula exclusivo */}
          <Route path="/estudiante" element={<LoginEstudiante />} />

          {/* Portal del Estudiante (Protegido con Cédula/PIN) */}
          <Route
            path="/student-portal"
            element={
              <ProtectedRoute>
                <StudentPortal />
              </ProtectedRoute>
            }
          />

          {/* Panel Administrativo y Docente (Protegido con JWT) */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/calendar" element={<GoogleCalendarPage />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/students" element={<Students />} />
          </Route>

          {/* Callbacks OAuth Google / Microsoft */}
          <Route path="/auth/microsoft/callback" element={<OAuthCallback />} />
          <Route path="/auth/google/callback" element={<OAuthCallback />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
