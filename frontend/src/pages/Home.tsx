import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FolderSync,
  FileCheck2,
  WifiOff,
  Bot,
  Award,
  BookOpen,
} from 'lucide-react';

export function Home() {
  return (
    <div className="space-y-12 pb-8">
      {/* 1. Hero Principal con Diseño Moderno */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-8 sm:p-12 md:p-16 text-white shadow-xl border border-blue-900/40">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-xs font-semibold text-blue-200 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            CINDEA • Departamento de Inglés • MEP Costa Rica
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15]">
            Portal Académico & Aula Virtual en la <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-teal-300">Nube</span>
          </h1>

          <p className="text-sm sm:text-base text-blue-100/85 leading-relaxed font-normal">
            Plataforma institucional para el cálculo oficial de calificaciones MEP, control de asistencia por lección SICIN, portafolio docente en Google Drive y tutor interactivo de inglés con Inteligencia Artificial.
          </p>
        </div>
      </section>

      {/* 2. Tarjetas de Acceso Rápido por Rol (Estudiante vs Docente) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta 1: Acceso Estudiantes */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-200 bg-gradient-to-b from-white to-emerald-50/40 p-7 shadow-sm hover:shadow-md transition group flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-inner">
                <GraduationCap className="w-6 h-6 text-emerald-700" />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                Acceso con Cédula
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">Soy Estudiante</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Ingresa directamente con tu número de identificación para consultar tu progreso académico, entregar tareas y practicar con IA.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Consulta de notas ponderadas y desglose MEP</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Subida de tareas a Google Drive y justificación digital</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tutor de inglés con IA Gemini (Speaking / Writing)</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Link
              to="/estudiante"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm py-3.5 px-5 shadow-sm transition group-hover:gap-3"
            >
              <span>Ingresar al Portal Estudiantil</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Tarjeta 2: Acceso Docente (Prof. Diana) */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-blue-200 bg-gradient-to-b from-white to-blue-50/40 p-7 shadow-sm hover:shadow-md transition group flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shadow-inner">
                <ShieldCheck className="w-6 h-6 text-blue-700" />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                Docente Titular
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">Acceso Docente Institucional</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Panel administrativo para la profesora de inglés: gestión de actas, registro de asistencias y Google Calendar.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Control diario de asistencia y cálculo de rebajo SICIN</span>
              </div>
              <div className="flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Portafolio oficial y respaldo automático en Google Drive</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Google Calendar oficial y asistente de redacción IA</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm py-3.5 px-5 shadow-sm transition group-hover:gap-3"
            >
              <span>Iniciar Sesión como Docente</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Módulos & Pilares del Sistema */}
      <section className="space-y-6 pt-4">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Pilares y Funcionalidades del Sistema
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Diseñado específicamente para cubrir la normativa y el flujo pedagógico de la educación secundaria y modular costarricense.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm transition space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Ponderaciones Oficiales MEP</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cálculo exacto de Trabajo Cotidiano (50%), Pruebas (30%), Tareas (10%) y Asistencia (10%) con acta oficial descargable en Excel y PDF.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm transition space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Asistencia Inteligente SICIN</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Registro por lecciones impartidas y cálculo automático del rebajo de puntos en cotidiano por ausencias injustificadas.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm transition space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <FolderSync className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Almacenamiento Cloud Google Drive</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Organización automática por módulos y tareas en Google Drive, con sustitución inteligente de archivos para no duplicar espacio.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm transition space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Asistente IA Docente (Gemini)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generación de rúbricas pedagógicas, cartas institucionales, resúmenes de rendimiento y comunicados para padres vía WhatsApp.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm transition space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Planeamiento Didáctico Oficial</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Módulo de portafolio para archivar planeamientos curriculares oficiales del MEP, guías de trabajo autónomo (GTA) e instrumentos.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-sm transition space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <WifiOff className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Modo Offline PWA Instalable</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Permite a la profesora pasar asistencia en aulas sin señal o WiFi y sincronizar los datos automáticamente al recuperar conexión.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Footer Informativo de Proyecto */}
      <section className="rounded-2xl bg-slate-900 text-slate-300 p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="space-y-1 text-center sm:text-left">
          <p className="font-bold text-white text-sm">Proyecto de Computación en la Nube • UTN Sede Corobicí, Cañas</p>
          <p className="text-slate-400">Implementado para el Departamento de Inglés del CINDEA • Año Lectivo 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login?role=student"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition border border-slate-700 shadow-2xs"
          >
            Portal Estudiante
          </Link>
          <Link
            to="/login?role=teacher"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-sm"
          >
            Acceso Docente
          </Link>
        </div>
      </section>
    </div>
  );
}
