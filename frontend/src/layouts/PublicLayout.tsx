import { Link, Outlet } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  User,
  BookOpen,
} from 'lucide-react';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          {/* Logo & Branding Institucional */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center shadow-md shadow-blue-700/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 tracking-tight text-base sm:text-lg">
                  CINDEA <span className="text-blue-700 font-extrabold">English</span>
                </span>
                <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  MEP
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Plataforma de Gestión Docente & Portal Estudiantil
              </p>
            </div>
          </Link>

          {/* Navegación y Accesos */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/estudiante"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Portal Estudiante</span>
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Acceso Docente</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 md:py-10">
        <Outlet />
      </main>

      {/* Footer Institucional */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <BookOpen className="w-4 h-4 text-blue-700" />
            <span className="font-semibold text-slate-700">CINDEA • Departamento de Lenguas Extranjeras (Inglés)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Ministerio de Educación Pública de Costa Rica • Sistema Cloud Educativo 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
