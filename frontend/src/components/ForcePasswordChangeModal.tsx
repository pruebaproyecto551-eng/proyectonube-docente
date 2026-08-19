import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { Lock, ShieldCheck, Eye, EyeOff, LogOut, CheckCircle2 } from 'lucide-react';

export function ForcePasswordChangeModal() {
  const { user, logout, updateUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user || !user.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    if (newPassword === 'student123' || newPassword === '123456' || newPassword === 'mep2026') {
      setError('No puedes usar la contraseña genérica. Por favor elige una contraseña personal y segura.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar contraseña');
      }

      setSuccess(true);
      setTimeout(() => {
        if (updateUser) {
          updateUser({ ...user, mustChangePassword: false });
        } else {
          window.location.reload();
        }
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Cambio Obligatorio de Contraseña
          </h2>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
            Hola <strong>{user.fullName}</strong>. Por motivos de seguridad y privacidad en CINDEA, debes crear una contraseña personal antes de continuar.
          </p>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {success ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold animate-in zoom-in-95">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p>¡Contraseña actualizada con éxito!</p>
              <p className="text-xs font-normal text-emerald-700">Iniciando tu portal estudiantil...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                1. Nueva Contraseña Personal:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                2. Confirmar Nueva Contraseña:
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                A partir de ahora, solo podrás ingresar al portal con tu Cédula y esta nueva contraseña que acabas de elegir.
              </span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full justify-center bg-blue-600 hover:bg-blue-700 font-bold text-sm py-2.5 shadow-xs"
              >
                {loading ? 'Guardando...' : '🔐 Guardar Contraseña y Continuar'}
              </Button>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
