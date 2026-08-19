# Profesora Platform

Plataforma docente en la nube para gestión de alumnos, cursos, calificaciones y asistencia.

## Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS + React Router
- **Backend**: Node.js + Express + TypeScript + Zod
- **Base de datos**: PostgreSQL (SQL puro, sin ORM)
- **Auth**: JWT (access + refresh rotativo con hash en BD)
- **OAuth**: Google y Microsoft (opcional)
- **Storage**: MinIO (S3 compatible) en desarrollo

## Estructura

```
profesora-platform/
├── frontend/        # React + Vite
├── backend/         # Express + TypeScript
├── database/        # schema.sql + seed.sql
├── docs/            # Documentación
├── docker-compose.yml
└── .env.example
```

## Inicio rápido

```bash
# 1. Instalar dependencias (raíz + subproyectos)
npm install
npm --prefix frontend install
npm --prefix backend install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env y poner JWT_SECRET, JWT_REFRESH_SECRET (pueden ser cualquier string)

# 3. Levantar Postgres + MinIO
docker compose up -d

# 4. Cargar esquema y datos de demo
docker compose exec -T postgres psql -U profesora -d profesora < database/schema.sql
docker compose exec -T postgres psql -U profesora -d profesora < database/seed.sql

# 5. Arrancar frontend + backend en paralelo
npm run dev
```

URLs:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Adminer (BD): http://localhost:8080
- MinIO Console: http://localhost:9001

Acceso a Adminer:
- URL: http://localhost:8080
- Sistema: PostgreSQL (ya viene seleccionado)
- Servidor: `postgres` (ya viene rellenado)
- Usuario: `root`
- Contraseña: `root`
- Base de datos: `profesora`

Pulsa "Iniciar sesión" y verás todas las tablas (`users`, `teachers`, `students`, `courses`, `enrollments`, `assignments`, `grades`, `attendance`, etc.).

## Cuentas de desarrollo (seed)

| Email | Contraseña | Rol |
| --- | --- | --- |
| `admin@profesora.app` | `admin123` | admin |
| `maria@profesora.app` | `teacher123` | teacher |
| `pedro@profesora.app` | `student123` | student |

El seed crea también un curso "Matemáticas 10A" con Pedro matriculado y una nota de ejemplo.

## API principal

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | no | Crea profesora (rol forzado a `teacher`) |
| POST | `/api/auth/login` | no | Login email/password |
| POST | `/api/auth/refresh` | no | Rotación de refresh token |
| POST | `/api/auth/logout` | no | Revoca refresh token |
| GET | `/api/auth/me` | sí | Usuario autenticado |
| GET | `/api/students` | sí | Alumnos del ámbito del profesor |
| POST | `/api/students` | sí | Crear alumno |
| PUT | `/api/students/:id` | sí | Editar alumno |
| DELETE | `/api/students/:id` | sí | Eliminar alumno |
| GET | `/api/courses` | sí | Cursos del profesor |
| POST | `/api/courses` | sí | Crear curso |
| PUT | `/api/courses/:id` | sí | Editar curso |
| DELETE | `/api/courses/:id` | sí | Eliminar curso |
| POST | `/api/courses/:courseId/students/:studentId` | sí | Matricular |
| DELETE | `/api/courses/:courseId/students/:studentId` | sí | Desmatricular |
| GET | `/api/courses/:courseId/students` | sí | Listar alumnos del curso |
| GET/POST | `/api/courses/:courseId/assignments` | sí | Actividades |
| PUT/DELETE | `/api/assignments/:id` | sí | Editar/eliminar actividad |
| GET/POST | `/api/courses/:courseId/grades` | sí | Notas |
| PUT/DELETE | `/api/grades/:id` | sí | Editar/eliminar nota |
| GET | `/api/courses/:courseId/attendance` | sí | Asistencia (filtro `?date=`) |
| POST | `/api/courses/:courseId/attendance` | sí | Marcar asistencia |
| PUT | `/api/attendance/:id` | sí | Editar asistencia |
| GET | `/api/integrations/google/login` | no | Inicia OAuth Google |
| GET | `/api/integrations/google/callback` | no | Callback Google |
| GET | `/api/integrations/microsoft/login` | no | Inicia OAuth Microsoft |
| GET | `/api/integrations/microsoft/callback` | no | Callback Microsoft |

Todas las rutas autenticadas verifican propiedad: un profesor solo puede ver/modificar sus cursos, alumnos matriculados en ellos, etc. Los IDs se validan y las consultas usan parámetros `$1, $2, ...`.

## Seguridad implementada

- `helmet`, `cors`, `rate limiting` (login/register más estricto)
- bcrypt (cost 12) para contraseñas
- JWT con access corto (15m) + refresh largo (7d) guardado como `sha256` en BD
- Refresh tokens rotan en cada `refresh` (revocación del anterior)
- Logout revoca el refresh token
- Zod valida todos los inputs en backend
- Restricciones CHECK en BD: `score >= 0`, `score <= max_score`, `max_score > 0`, `weight >= 0`
- El cliente nunca puede forzar el `role` en `register`

## Variables de entorno

Ver `.env.example`. Los secretos reales van en `.env` (ignorado por git). En producción se configuran directamente en el proveedor.

## Despliegue

Una vez funcione local:
- **Frontend**: build estático (`npm --prefix frontend run build`) → Cloudflare Pages o equivalente
- **Backend**: `npm --prefix backend run build && start` → servicio compatible con Node.js
- **PostgreSQL**: servicio administrado
- **Storage**: reemplazar MinIO por el almacenamiento elegido y actualizar `STORAGE_*`

## Licencia

Privado.
