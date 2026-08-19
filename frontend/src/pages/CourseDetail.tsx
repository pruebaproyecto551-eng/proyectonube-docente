import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coursesService, type CourseStudent } from '../services/courses.service';
import { gradesService } from '../services/grades.service';
import type { Course, Grade } from '../types';
import { Table } from '../components/Table';
import { ErrorMessage } from '../components/ErrorMessage';

export function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      coursesService.get(id),
      coursesService.listStudents(id),
      gradesService.listGrades(id),
    ])
      .then(([c, s, g]) => {
        setCourse(c);
        setStudents(s);
        setGrades(g);
      })
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar'));
  }, [id]);

  if (!id) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/courses" className="text-sm text-blue-600 hover:underline">
          ← Cursos
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{course?.name ?? '...'}</h1>
        <p className="text-sm text-slate-600">{course?.code}</p>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Alumnos matriculados</h2>
        <Table
          rows={students}
          rowKey={(s) => s.id}
          emptyMessage="Sin alumnos"
          columns={[
            { key: 'name', header: 'Nombre', render: (s) => s.fullName },
            { key: 'email', header: 'Email', render: (s) => s.email },
            {
              key: 'avg',
              header: 'Promedio',
              render: (s) => {
                const list = grades.filter((g) => g.studentId === s.id);
                if (list.length === 0) return '—';
                const sum = list.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0);
                return `${(sum / list.length).toFixed(1)}%`;
              },
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Notas</h2>
        <Table
          rows={grades}
          rowKey={(g) => g.id}
          emptyMessage="Sin notas registradas"
          columns={[
            { key: 'title', header: 'Título', render: (g) => g.title },
            {
              key: 'student',
              header: 'Alumno',
              render: (g) => students.find((s) => s.id === g.studentId)?.fullName ?? g.studentId,
            },
            {
              key: 'score',
              header: 'Nota',
              render: (g) => `${g.score} / ${g.maxScore}`,
            },
            { key: 'date', header: 'Fecha', render: (g) => g.gradedOn },
          ]}
        />
        <div className="mt-3">
          <Link
            to="/grades"
            className="inline-flex items-center rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
          >
            Gestionar notas →
          </Link>
        </div>
      </section>
    </div>
  );
}
