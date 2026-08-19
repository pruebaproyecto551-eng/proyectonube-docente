import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ErrorMessage } from '../components/ErrorMessage';

export function Register() {
  const { register, loginWithMicrosoft, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, fullName);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo crear la cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Crear cuenta</h1>
        <p className="mt-1 text-sm text-slate-600">
          Te registrarás como profesora.
        </p>

        <div className="mt-6 space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => loginWithMicrosoft()}
          >
            Registrarse con Microsoft
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => loginWithGoogle()}
          >
            Registrarse con Google
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>o regístrate con email</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label="Nombre completo"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Creando...' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
