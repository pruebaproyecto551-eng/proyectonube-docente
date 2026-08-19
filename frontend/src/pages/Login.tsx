import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  CalendarCheck,
  FolderSync,
  Sparkles,
} from 'lucide-react';

export function Login() {
  const { login, loginWithMicrosoft, loginWithGoogle, user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si ya está autenticado, redirigir según rol
  useEffect(() => {
    if (status === 'authenticated') {
      if (user?.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [status, user, navigate]);

  // Si viene con parámetro role=student o role=estudiante, redirigir a /estudiante
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'student' || roleParam === 'estudiante') {
      navigate('/estudiante', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('error');
    const provider = params.get('provider');
    if (oauthError) {
      setError(
        `No se pudo completar el inicio de sesión con ${provider ?? 'el proveedor'} (${oauthError}).`
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  const onSubmitTeacher = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedUser = await login(teacherEmail, teacherPassword);
      if (loggedUser.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Credenciales institucionales incorrectas.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center px-4 py-8 sm:py-12 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA: PORTADA / PRESENTACIÓN DOCENTE         */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          {/* Badge institucional */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/80 text-blue-900 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Gestión Docente Titular • CINDEA • MEP</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Plataforma Cloud de <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-800">
                Gestión Docente &amp; Aula
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
              Administración académica oficial del MEP: registro diario de asistencia por lección SICIN, portafolio docente en Google Drive y asistente pedagógico con IA.
            </p>
          </div>

          {/* 3 Pilares Docentes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 text-left">
            <div className="bg-white/80 backdrop-blur-xs border border-blue-100/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Asistencia SICIN</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Control de lecciones y cálculo de rebajo automático de puntos.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xs border border-blue-100/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <FolderSync className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Portafolio en Drive</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Organización de carpetas de tareas y actas en la nube.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xs border border-blue-100/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Asistente IA Gemini</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Creación ágil de rúbricas pedagógicas y planeamientos MEP.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA DERECHA: FORMULARIO MINIMALISTA DOCENTE           */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-950/5 p-6 sm:p-8 space-y-4">
            {/* Cabecera del formulario */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-11 h-11 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-700/20 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">Acceso Docente</h2>
                <p className="text-xs text-slate-500">Credenciales institucionales MEP</p>
              </div>
            </div>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            {/* Botones Rápidos Cloud */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-2xs hover:shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>Continuar con Google (Drive / Gmail)</span>
              </button>

              <button
                type="button"
                onClick={() => loginWithMicrosoft(teacherEmail)}
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 21 21">
                  <path fill="#f25022" d="M1 1h9v9H1z" />
                  <path fill="#00a4ef" d="M1 11h9v9H1z" />
                  <path fill="#7fba00" d="M11 1h9v9h-9z" />
                  <path fill="#ffb900" d="M11 11h9v9h-9z" />
                </svg>
                <span>Microsoft 365 MEP</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 py-0.5">
              <div className="h-px flex-1 bg-slate-200" />
              <span>o con correo institucional</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form className="space-y-3" onSubmit={onSubmitTeacher}>
              <div className="space-y-1.5">
                <label htmlFor="teacher-email" className="text-xs font-bold text-slate-700">
                  Correo Institucional o Gmail
                </label>
                <input
                  id="teacher-email"
                  type="email"
                  placeholder="ej. diana@mep.go.cr"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="teacher-password" className="text-xs font-bold text-slate-700">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="teacher-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none pr-10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full font-bold bg-blue-700 hover:bg-blue-800 text-xs py-3 rounded-xl shadow-xs text-white transition mt-2 flex items-center justify-center gap-1.5"
              >
                {submitting ? 'Autenticando...' : 'Iniciar Sesión'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <p className="pt-1 text-[10px] text-slate-400 text-center font-medium">
              Ministerio de Educación Pública de Costa Rica
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
