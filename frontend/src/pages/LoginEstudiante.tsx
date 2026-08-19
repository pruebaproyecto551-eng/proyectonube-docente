import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
  Award,
  FileCheck2,
  Bot,
} from 'lucide-react';

export function LoginEstudiante() {
  const { login, user, status } = useAuth();
  const navigate = useNavigate();

  const [studentCedula, setStudentCedula] = useState('');
  const [studentPin, setStudentPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estado dinámico del estudiante según la cédula ingresada
  const [isInitialAccount, setIsInitialAccount] = useState<boolean | null>(null);
  const [studentFirstName, setStudentFirstName] = useState<string | null>(null);
  const [showManualHelp, setShowManualHelp] = useState(false);

  // Si ya está autenticado como estudiante, redirigir directo
  useEffect(() => {
    if (status === 'authenticated') {
      if (user?.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [status, user, navigate]);

  // Si viene con parámetro role=teacher o role=docente, redirigir a /login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'teacher' || roleParam === 'docente') {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Consulta dinámica inteligente: detecta si la cuenta requiere clave inicial
  useEffect(() => {
    const trimmed = studentCedula.trim();
    if (trimmed.length < 8) {
      setIsInitialAccount(null);
      setStudentFirstName(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/student-status?cedula=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setIsInitialAccount(data.mustChangePassword);
            setStudentFirstName(data.name || null);
          } else {
            setIsInitialAccount(null);
            setStudentFirstName(null);
          }
        }
      } catch (_) {
        // Silencioso para no saturar la vista
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [studentCedula]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedUser = await login(studentCedula, studentPin);
      if (loggedUser.role === 'student') {
        navigate('/student-portal', { replace: true });
      } else {
        setError('Esta entrada es exclusiva para estudiantes. El acceso docente se realiza en /login.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Número de Cédula o contraseña incorrectos. Verificá tus datos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40 flex items-center justify-center px-4 py-8 sm:py-12 selection:bg-emerald-600 selection:text-white">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA: PORTADA / BIENVENIDA ESTUDIANTIL      */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          {/* Badge institucional */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200/80 text-emerald-900 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>CINDEA • Departamento de Inglés • MEP</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Portal Estudiantil &amp; <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-700">
                Aula Virtual en la Nube
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
              Accede a tu información académica oficial, revisa tus notas ponderadas en tiempo real, entrega tus asignaciones y practica inglés con tu tutor de IA.
            </p>
          </div>

          {/* 3 Pilares del Estudiante */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 text-left">
            <div className="bg-white/80 backdrop-blur-xs border border-emerald-100/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Notas en Tiempo Real</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Desglose oficial MEP: Cotidiano 50%, Pruebas 30%, Tareas 10%.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xs border border-emerald-100/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Tareas &amp; Justificaciones</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sube múltiples fotos, audios o documentos a Google Drive.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xs border border-emerald-100/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Tutor de Inglés con IA</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Práctica guiada de gramática y speaking disponible 24/7.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA DERECHA: FORMULARIO MINIMALISTA DE ACCESO        */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-950/5 p-6 sm:p-8 space-y-5">
            {/* Cabecera del formulario */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">Ingreso de Estudiantes</h2>
                <p className="text-xs text-slate-500">Usa tu identificación oficial</p>
              </div>
            </div>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <form className="space-y-4" onSubmit={onSubmit}>
              {/* Campo Cédula */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="cedula-input" className="text-xs font-bold text-slate-700">
                    Número de Cédula o DIMEX
                  </label>
                  {studentFirstName && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Hola, {studentFirstName}
                    </span>
                  )}
                </div>
                <input
                  id="cedula-input"
                  type="text"
                  placeholder="Ej. 501230456"
                  value={studentCedula}
                  onChange={(e) => setStudentCedula(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                />
              </div>

              {/* Campo Contraseña */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="pin-input" className="text-xs font-bold text-slate-700">
                    Contraseña / PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManualHelp(!showManualHelp)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-emerald-700 transition"
                  >
                    ¿Primera vez?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="pin-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={studentPin}
                    onChange={(e) => setStudentPin(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none pr-10 transition"
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

                {/* Hint inteligente de primera vez */}
                {(isInitialAccount === true || showManualHelp) && (
                  <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2.5 py-1.5 rounded-lg">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Clave inicial: <strong className="font-mono font-bold bg-amber-100 px-1 py-0.2 rounded text-amber-950">student123</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-xs py-3 rounded-xl shadow-xs text-white transition mt-2 flex items-center justify-center gap-1.5"
              >
                {submitting ? 'Verificando...' : 'Ingresar al Portal'}
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
