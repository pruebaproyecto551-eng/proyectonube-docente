import { useEffect, useState, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { studentsService } from '../services/students.service';
import { coursesService } from '../services/courses.service';
import type { Student, Course } from '../types';
import { alerts } from '../utils/alerts';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Search,
  Pencil,
  Sparkles,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../utils';

const DEFAULT_ENGLISH_COURSES: Course[] = [
  { id: '55555555-5555-4555-a555-555555555551', name: 'Inglés 10° Año (Módulo IV)', code: 'ING-10', teacherId: '', description: null, color: '#2563EB' },
  { id: '55555555-5555-4555-a555-555555555552', name: 'Inglés 11° Año (Módulo V / Bachillerato)', code: 'ING-11', teacherId: '', description: null, color: '#059669' },
  { id: '55555555-5555-4555-a555-555555555553', name: 'Inglés 9° Año (Módulo III)', code: 'ING-9', teacherId: '', description: null, color: '#7C3AED' },
  { id: '55555555-5555-4555-a555-555555555554', name: 'Inglés 7° y 8° Año (Módulos I y II)', code: 'ING-7-8', teacherId: '', description: null, color: '#EA580C' },
];

export function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>(DEFAULT_ENGLISH_COURSES);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal 1: Registro Individual
  const [openSingleModal, setOpenSingleModal] = useState(false);
  const [singleForm, setSingleForm] = useState({
    fullName: '',
    studentNumber: '',
    gradeLevel: 'Inglés 10° Año (Módulo IV)',
    guardianPhone: '',
    courseId: '55555555-5555-4555-a555-555555555551',
  });

  // Modal 2: Cargar Archivo Excel Masivo
  const [openBatchModal, setOpenBatchModal] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<
    Array<{ fullName: string; studentNumber: string; gradeLevel: string; courseId?: string }>
  >([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [batchCourseId, setBatchCourseId] = useState('auto');
  const [submitting, setSubmitting] = useState(false);

  // Modal 3: Cambiar Grado / Nivel de un estudiante
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedNewCourseId, setSelectedNewCourseId] = useState('');

  const resolveCourseByText = (levelText: string, courseList: Course[]): Course | undefined => {
    if (!levelText) return undefined;
    const clean = levelText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (clean.includes('11') || clean.includes('bachillerato') || clean.includes('modulo v') || clean.includes('modulo 5')) {
      return courseList.find((c) => (c.name || '').includes('11') || (c.code || '').includes('11') || (c.name || '').toLowerCase().includes('bachillerato'));
    }
    if (clean.includes('10') || clean.includes('modulo iv') || clean.includes('modulo 4') || clean.includes('diversificada')) {
      return courseList.find((c) => (c.name || '').includes('10') || (c.code || '').includes('10'));
    }
    if (clean.includes('9') || clean.includes('modulo iii') || clean.includes('modulo 3') || clean.includes('tercer ciclo')) {
      return courseList.find((c) => (c.name || '').includes('9') || (c.code || '').includes('9'));
    }
    if (clean.includes('7') || clean.includes('8') || clean.includes('modulo i') || clean.includes('modulo ii') || clean.includes('basico')) {
      return courseList.find((c) => (c.name || '').includes('7') || (c.name || '').includes('8') || (c.code || '').includes('7'));
    }
    for (const c of courseList) {
      const cName = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cName.includes(clean) || clean.includes(cName)) return c;
    }
    return undefined;
  };

  const downloadExcelTemplate = () => {
    const sampleEstudiantes = [
      {
        'Cédula / DIMEX': '504540188',
        'Nombre Completo': 'Pamela Leiva Gómez',
        'Nivel / Módulo': 'Inglés 10° Año (Módulo IV)',
        'Teléfono / Contacto': '8899-7711',
      },
      {
        'Cédula / DIMEX': '118230491',
        'Nombre Completo': 'Alejandro José Mora Solís',
        'Nivel / Módulo': 'Inglés 10° Año (Módulo IV)',
        'Teléfono / Contacto': '8745-1290',
      },
      {
        'Cédula / DIMEX': '207450123',
        'Nombre Completo': 'María Fernanda Rodríguez Céspedes',
        'Nivel / Módulo': 'Inglés 10° Año (Módulo IV)',
        'Teléfono / Contacto': '8321-4567',
      },
      {
        'Cédula / DIMEX': '109820341',
        'Nombre Completo': 'Carlos Alberto Núñez Quesada',
        'Nivel / Módulo': 'Inglés 11° Año (Módulo V / Bachillerato)',
        'Teléfono / Contacto': '8901-2345',
      },
      {
        'Cédula / DIMEX': '503210987',
        'Nombre Completo': 'Sofía Elena Vargas Peñaranda',
        'Nivel / Módulo': 'Inglés 11° Año (Módulo V / Bachillerato)',
        'Teléfono / Contacto': '8654-7890',
      },
      {
        'Cédula / DIMEX': '304560789',
        'Nombre Completo': 'Esteban Josué Brenes Chacón',
        'Nivel / Módulo': 'Inglés 9° Año (Módulo III)',
        'Teléfono / Contacto': '8432-1098',
      },
      {
        'Cédula / DIMEX': '112340567',
        'Nombre Completo': 'Valeria Michelle Jiménez Zúñiga',
        'Nivel / Módulo': 'Inglés 9° Año (Módulo III)',
        'Teléfono / Contacto': '8765-4321',
      },
      {
        'Cédula / DIMEX': '602340891',
        'Nombre Completo': 'Andrés Felipe Muñoz Barquero',
        'Nivel / Módulo': 'Inglés 7° y 8° Año (Módulos I y II)',
        'Teléfono / Contacto': '8512-3456',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleEstudiantes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes CINDEA');
    XLSX.writeFile(wb, 'Plantilla_Estudiantes_CINDEA.xlsx');
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([studentsService.list(), coursesService.list()])
      .then(([s, c]) => {
        setStudents(s);
        const list = c && c.length > 0 ? c : DEFAULT_ENGLISH_COURSES;
        setCourses(list);
        if (list[0]) {
          setSingleForm((prev) => ({
            ...prev,
            courseId: prev.courseId || list[0].id,
            gradeLevel: list[0].name,
          }));
        }
      })
      .catch((e) => setError(e?.response?.data?.error ?? 'Error al cargar estudiantes'))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  // Crear 1 estudiante
  const onSingleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!singleForm.fullName || !singleForm.studentNumber) return;
    setSubmitting(true);
    setError(null);
    try {
      await studentsService.create({
        fullName: singleForm.fullName.trim(),
        studentNumber: singleForm.studentNumber.trim(),
        gradeLevel: singleForm.gradeLevel,
        guardianPhone: singleForm.guardianPhone || undefined,
        courseId: singleForm.courseId || undefined,
      });
      setOpenSingleModal(false);
      setSingleForm({
        fullName: '',
        studentNumber: '',
        gradeLevel: courses[0]?.name || 'Inglés 10° Año (Módulo IV)',
        guardianPhone: '',
        courseId: courses[0]?.id || '',
      });
      setSuccessMsg('¡Estudiante registrado y matriculado con éxito!');
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al registrar estudiante');
    } finally {
      setSubmitting(false);
    }
  };

  // Cargar y procesar archivo Excel (.xlsx, .xls, .csv)
  const handleFileUpload = (file: File) => {
    setExcelFile(file);
    setParsingError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        const extracted: Array<{ fullName: string; studentNumber: string; gradeLevel: string; courseId?: string }> = [];

        for (const row of rawData) {
          if (!row || !Array.isArray(row) || row.length === 0) continue;

          // Convertir todas las celdas a string limpio
          const cells = row.map((c) => (c !== undefined && c !== null ? String(c).trim() : '')).filter(Boolean);
          if (cells.length === 0) continue;

          // Omitir fila de encabezados si contiene palabras clave de títulos
          const rowText = cells.join(' ').toLowerCase();
          if (
            rowText.includes('cedula') ||
            rowText.includes('cédula') ||
            rowText.includes('identificación') ||
            rowText.includes('dimex') ||
            rowText.includes('nombre del estudiante') ||
            rowText.includes('apellidos')
          ) {
            continue;
          }

          let studentNumber = '';
          const nameParts: string[] = [];
          let gradeText = '';

          for (const cell of cells) {
            const cleanDigits = cell.replace(/\D/g, '');
            if (!studentNumber && cleanDigits.length >= 7 && cleanDigits.length <= 13) {
              studentNumber = cleanDigits;
            } else if (cleanDigits.length < 5 && cell.length >= 2) {
              if (
                cell.toLowerCase().includes('ingl') ||
                cell.toLowerCase().includes('año') ||
                cell.toLowerCase().includes('módulo') ||
                cell.toLowerCase().includes('modulo') ||
                cell.toLowerCase().includes('10') ||
                cell.toLowerCase().includes('11') ||
                cell.toLowerCase().includes('9') ||
                cell.toLowerCase().includes('7') ||
                cell.toLowerCase().includes('8')
              ) {
                gradeText = cell;
              } else {
                nameParts.push(cell);
              }
            } else if (cell.length >= 2) {
              nameParts.push(cell);
            }
          }

          const fullName = nameParts.join(' ').replace(/["']/g, '').trim();
          if (!fullName || fullName.length < 2) continue;

          if (!studentNumber) {
            studentNumber = `EST-${Math.floor(100000 + Math.random() * 900000)}`;
          }

          let finalCourseId = '';
          let finalGradeLevel = '';
          if (batchCourseId !== 'auto') {
            finalCourseId = batchCourseId;
            const found = courses.find((c) => c.id === batchCourseId);
            finalGradeLevel = found?.name || 'Inglés CINDEA';
          } else {
            const autoFound = resolveCourseByText(gradeText, courses);
            if (autoFound) {
              finalCourseId = autoFound.id;
              finalGradeLevel = autoFound.name;
            } else {
              finalCourseId = courses[0]?.id || '';
              finalGradeLevel = courses[0]?.name || 'Inglés 10° Año (Módulo IV)';
            }
          }

          extracted.push({
            fullName,
            studentNumber,
            gradeLevel: finalGradeLevel,
            courseId: finalCourseId,
          });
        }

        // Deduplicar lista extraída por cédula / studentNumber
        const seenNumbers = new Set<string>();
        const uniqueExtracted: Array<{ fullName: string; studentNumber: string; gradeLevel: string; courseId?: string }> = [];
        for (const st of extracted) {
          const key = st.studentNumber.trim().toLowerCase();
          if (!seenNumbers.has(key)) {
            seenNumbers.add(key);
            uniqueExtracted.push(st);
          }
        }

        if (uniqueExtracted.length === 0) {
          setParsingError('No se encontraron filas con estudiantes en el archivo. Verifica que contenga columnas de cédula y nombre.');
        } else {
          setParsedStudents(uniqueExtracted);
        }
      } catch {
        setParsingError('Error al leer el archivo Excel. Asegúrate de que sea un archivo .xlsx, .xls o .csv válido.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Importar estudiantes detectados desde el archivo
  const onBatchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (parsedStudents.length === 0) {
      setError('Por favor selecciona un archivo Excel con estudiantes antes de importar.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      let createdCount = 0;
      for (const st of parsedStudents) {
        let finalCourseId = st.courseId;
        let finalGradeLevel = st.gradeLevel;
        if (batchCourseId !== 'auto') {
          finalCourseId = batchCourseId;
          const found = courses.find((c) => c.id === batchCourseId);
          finalGradeLevel = found?.name || 'Inglés CINDEA';
        }

        try {
          await studentsService.create({
            fullName: st.fullName,
            studentNumber: st.studentNumber,
            gradeLevel: finalGradeLevel,
            courseId: finalCourseId,
          });
          createdCount++;
        } catch {
          // Si ya existe continuar con los demás
        }
      }

      setOpenBatchModal(false);
      setExcelFile(null);
      setParsedStudents([]);
      setSuccessMsg(`¡Éxito! Se importaron ${createdCount} estudiantes desde el archivo Excel.`);
      loadData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: any) {
      setError(e?.message || 'Error al procesar la lista masiva de estudiantes');
    } finally {
      setSubmitting(false);
    }
  };

  // Guardar edición de grado / nivel
  const onEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !selectedNewCourseId) return;
    setSubmitting(true);
    setError(null);
    try {
      const selectedCourse = courses.find((c) => c.id === selectedNewCourseId);
      await studentsService.update(editingStudent.id, {
        courseId: selectedNewCourseId,
        gradeLevel: selectedCourse?.name || editingStudent.gradeLevel,
      });
      setOpenEditModal(false);
      setEditingStudent(null);
      setSuccessMsg('¡Grado / Nivel del estudiante actualizado con éxito!');
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al actualizar grado');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    const ok = await alerts.confirmDelete(
      '¿Eliminar estudiante del sistema?',
      'Se removerá de las listas de asistencia y registro de calificaciones.'
    );
    if (!ok) return;
    try {
      await studentsService.remove(id);
      alerts.success('Estudiante eliminado', 'El registro se actualizó correctamente.');
      loadData();
    } catch (e: any) {
      alerts.error('Error al eliminar', e?.response?.data?.error ?? 'No se pudo eliminar el estudiante');
    }
  };

  const filteredStudents = students
    .filter((s) => {
      const name = s.fullName || '';
      const num = s.studentNumber || '';
      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        num.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = selectedGrade === 'ALL' || s.gradeLevel === selectedGrade;
      return matchesSearch && matchesGrade;
    })
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'es', { sensitivity: 'base' }));

  function sanitizeFilename(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  const exportStudentsExcel = () => {
    if (filteredStudents.length === 0) return;
    const gradeTitle = selectedGrade === 'ALL' ? 'Todos los Grados' : selectedGrade;
    const cleanTitle = sanitizeFilename(gradeTitle);

    const rows: (string | number)[][] = [
      ['EDUNUBE DOCENTE — NÓMINA OFICIAL DE ESTUDIANTES'],
      ['Nivel / Filtro:', gradeTitle, '', 'Fecha de Emisión:', new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })],
      ['Total de Estudiantes:', filteredStudents.length, '', 'Año Lectivo:', '2026'],
      [],
      ['N°', 'Cédula / DIMEX', 'Nombre Completo del Estudiante', 'Nivel / Módulo', 'Contacto / Tel. Encargado'],
    ];

    filteredStudents.forEach((st, idx) => {
      rows.push([
        idx + 1,
        st.studentNumber || '—',
        st.fullName || '—',
        st.gradeLevel || '—',
        st.guardianPhone || '—',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 38 },
      { wch: 30 },
      { wch: 24 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, `Nomina_Estudiantes_${cleanTitle}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Minimalista & Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
            <span>Lista de Estudiantes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total matriculados: <strong className="text-slate-800 font-semibold">{students.length} estudiantes</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={exportStudentsExcel}
            disabled={filteredStudents.length === 0}
            className="text-[11px] sm:text-xs font-semibold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs cursor-pointer justify-center"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
            <span>Descargar Excel (.xlsx)</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setExcelFile(null);
              setParsedStudents([]);
              setParsingError(null);
              setOpenBatchModal(true);
            }}
            className="text-[11px] sm:text-xs font-bold border-slate-200 hover:bg-slate-50 bg-white text-slate-700 shadow-2xs cursor-pointer justify-center"
          >
            <UploadCloud className="w-4 h-4 mr-1.5 text-blue-600 shrink-0" />
            <span>Cargar Archivo Excel</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setOpenSingleModal(true)}
            className="text-[11px] sm:text-xs font-bold bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer text-white justify-center"
          >
            <UserPlus className="w-4 h-4 mr-1.5 shrink-0" />
            <span>+ Nuevo Alumno</span>
          </Button>
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {successMsg && (
        <div className="p-3 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Contenedor de Tabla con Toolbar Integrado */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        {/* Barra de Búsqueda y Filtro Integrada en la Cabecera de la Tabla */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">Nivel / Grado:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer truncate"
            >
              <option value="ALL">Todos los Grados ({students.length})</option>
              {courses.map((c) => {
                const count = students.filter((s) => s.courseId === c.id || s.gradeLevel === c.name).length;
                return (
                  <option key={c.id} value={c.name}>
                    {c.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 3. Tabla de Estudiantes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 select-none">
                <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                <th className="py-2.5 px-3.5">Cédula / DIMEX</th>
                <th className="py-2.5 px-3.5">Nombre Completo del Estudiante</th>
                <th className="py-2.5 px-3.5">Nivel / Módulo</th>
                <th className="py-2.5 px-3.5 text-center">Estado</th>
                <th className="py-2.5 px-3.5 text-right pr-5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((st, idx) => {
                const course = courses.find((c) => c.id === st.courseId || c.name === st.gradeLevel);
                return (
                  <tr
                    key={st.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    {/* # Consecutivo */}
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Cédula */}
                    <td className="py-2.5 px-3.5">
                      <span className="inline-flex items-center gap-1.5 font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {st.studentNumber || 'Sin cédula'}
                      </span>
                    </td>

                    {/* Nombre */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-black text-[10px] flex items-center justify-center shrink-0">
                          {st.fullName?.charAt(0) || 'E'}
                        </div>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {st.fullName}
                        </span>
                      </div>
                    </td>

                    {/* Nivel / Grado */}
                    <td className="py-2.5 px-3.5">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-slate-700 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/80">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: course?.color || '#2563EB' }}
                        />
                        <span>{st.gradeLevel || 'Inglés CINDEA'}</span>
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Activo
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-2.5 px-3.5 text-right pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingStudent(st);
                            const currentCourse = courses.find((c) => c.id === st.courseId || c.name === st.gradeLevel);
                            setSelectedNewCourseId(currentCourse?.id || courses[0]?.id || '');
                            setOpenEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg border border-transparent hover:border-blue-200 transition"
                          title="Cambiar Grado / Módulo"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(st.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-200 transition"
                          title="Eliminar estudiante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredStudents.length === 0 && !loading && (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-slate-50/50 space-y-3">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No se encontraron estudiantes</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Puedes agregar a tus alumnos con el botón azul "+ Nuevo Alumno" o pegar la lista de Excel de la dirección.
          </p>
        </div>
      )}

      {/* Modal 1: Registro Individual */}
      <Modal
        open={openSingleModal}
        title="Registrar Nuevo Estudiante a Mano"
        onClose={() => setOpenSingleModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenSingleModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="single-student-form" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar y Matricular'}
            </Button>
          </>
        }
      >
        <form id="single-student-form" onSubmit={onSingleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nombre Completo del Alumno: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Pedro Ramírez Soto"
              value={singleForm.fullName}
              onChange={(e) => setSingleForm({ ...singleForm, fullName: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Cédula de Identidad o DIMEX (Solo Números): <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. 501230456 o 155823491024"
              value={singleForm.studentNumber}
              onChange={(e) => setSingleForm({ ...singleForm, studentNumber: e.target.value.replace(/\D/g, '') })}
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Solo dígitos numéricos (sin guiones). Esta cédula será su usuario para entrar al portal.
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nivel / Grupo de Inglés:
            </label>
            <select
              value={singleForm.courseId}
              onChange={(e) => {
                const c = courses.find((x) => x.id === e.target.value);
                setSingleForm({ ...singleForm, courseId: e.target.value, gradeLevel: c?.name || singleForm.gradeLevel });
              }}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Teléfono / WhatsApp (Opcional):
            </label>
            <input
              type="tel"
              placeholder="Ej. 88889999"
              value={singleForm.guardianPhone}
              onChange={(e) => setSingleForm({ ...singleForm, guardianPhone: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>
      </Modal>

      {/* Modal 2: Cargar Archivo de Excel */}
      <Modal
        open={openBatchModal}
        title="Cargar Lista de Estudiantes desde Archivo Excel"
        onClose={() => {
          setOpenBatchModal(false);
          setExcelFile(null);
          setParsedStudents([]);
          setParsingError(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpenBatchModal(false);
                setExcelFile(null);
                setParsedStudents([]);
                setParsingError(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="batch-student-form"
              disabled={submitting || parsedStudents.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              {submitting
                ? 'Importando...'
                : parsedStudents.length > 0
                ? `Importar ${parsedStudents.length} Estudiantes`
                : 'Importar Lista'}
            </Button>
          </>
        }
      >
        <form id="batch-student-form" onSubmit={onBatchSubmit} className="space-y-4 text-xs">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 text-emerald-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Carga automática desde listas oficiales:</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Sube tu archivo de Excel (<strong>.xlsx, .xls o .csv</strong>). El sistema extraerá automáticamente la cédula y los nombres sin necesidad de copiar ni pegar texto a mano.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Asignar al Grupo / Nivel:
            </label>
            <select
              value={batchCourseId}
              onChange={(e) => setBatchCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="auto">⚡ Detectar automáticamente por texto de grado</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropzone para cargar archivo Excel con Drag & Drop real */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-700 text-xs">
                Archivo Excel (.xlsx, .xls, .csv):
              </label>
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Descargar archivo Excel de ejemplo sin correo"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>📥 Descargar Plantilla Excel</span>
              </button>
            </div>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileUpload(f);
              }}
              className={cn(
                'border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group',
                isDragging
                  ? 'border-emerald-500 bg-emerald-50 scale-[1.02] shadow-md ring-4 ring-emerald-100'
                  : 'border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20'
              )}
            >
              <UploadCloud
                className={cn(
                  'w-9 h-9 transition mb-2',
                  isDragging ? 'text-emerald-600 animate-bounce' : 'text-slate-400 group-hover:text-emerald-600'
                )}
              />
              <span
                className={cn(
                  'text-xs font-bold transition',
                  isDragging ? 'text-emerald-900 font-extrabold' : 'text-slate-800 group-hover:text-emerald-900'
                )}
              >
                {excelFile
                  ? `Archivo seleccionado: ${excelFile.name}`
                  : isDragging
                  ? '¡Suelta tu archivo Excel aquí!'
                  : 'Arrastra y suelta tu archivo Excel aquí o haz clic para buscar'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                {excelFile
                  ? `${(excelFile.size / 1024).toFixed(1)} KB`
                  : 'Soporta archivos de nómina oficial (.xlsx, .xls, .csv)'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
                className="hidden"
              />
            </label>
          </div>

          {parsingError && (
            <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parsingError}</span>
            </div>
          )}

          {parsedStudents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700">
                  Vista previa ({parsedStudents.length} estudiantes detectados):
                </span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ✓ Listo para importar
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white shadow-2xs">
                {parsedStudents.slice(0, 15).map((st, i) => (
                  <div key={i} className="px-3.5 py-1.5 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[10px] w-5">{i + 1}.</span>
                      <span className="font-bold text-slate-800">{st.fullName}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px] font-semibold">{st.studentNumber}</span>
                  </div>
                ))}
                {parsedStudents.length > 15 && (
                  <div className="px-3.5 py-2 text-center text-[11px] text-slate-400 bg-slate-50 font-medium">
                    ... y {parsedStudents.length - 15} estudiantes más en el archivo
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal 3: Cambiar Grado / Nivel de un estudiante */}
      <Modal
        open={openEditModal}
        title="Cambiar Grado / Módulo del Estudiante"
        onClose={() => {
          setOpenEditModal(false);
          setEditingStudent(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpenEditModal(false);
                setEditingStudent(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" form="edit-student-form" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar Cambio'}
            </Button>
          </>
        }
      >
        {editingStudent && (
          <form id="edit-student-form" onSubmit={onEditSubmit} className="space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estudiante Seleccionado:</span>
              <p className="text-sm font-bold text-slate-900">{editingStudent.fullName}</p>
              <p className="text-xs font-mono text-slate-600">Cédula: {editingStudent.studentNumber}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Selecciona el Nuevo Grado / Nivel de Inglés:
              </label>
              <select
                value={selectedNewCourseId}
                onChange={(e) => setSelectedNewCourseId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                required
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
