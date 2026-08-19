import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService } from '../services/courses.service';
import { documentsService } from '../services/documents.service';
import type { Course, TeacherDocument } from '../types';
import {
  FolderArchive,
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ExternalLink,
  BookOpen,
  Search,
  Plus,
} from 'lucide-react';
import { cn } from '../utils';
import { alerts } from '../utils/alerts';

const PERIODS = [
  { value: 'I Período 2026', label: 'I Período 2026' },
  { value: 'II Período 2026', label: 'II Período 2026' },
  { value: 'Anual / General', label: 'Anual / General' },
];

export function Planning() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal de Subida
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [docTitle, setDocTitle] = useState<string>('');
  const [docCourseId, setDocCourseId] = useState<string>('');
  const [docCategory, setDocCategory] = useState<'planeamiento' | 'examen' | 'guia' | 'rubrica' | 'otro'>('planeamiento');
  const [docPeriod, setDocPeriod] = useState<string>('I Período 2026');
  const [docFileName, setDocFileName] = useState<string>('');
  const [docFileData, setDocFileData] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    Promise.all([
      coursesService.list().catch(() => []),
      documentsService.list().catch(() => []),
    ])
      .then(([cs, docs]) => {
        setCourses(cs);
        setDocuments(docs);
      })
      .catch((err) => setError(err?.message || 'Error al cargar los documentos'));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docFileName) return;

    setSubmitting(true);
    setError(null);
    try {
      const selectedCourse = courses.find((c) => c.id === docCourseId);
      await documentsService.create({
        title: docTitle.trim(),
        courseId: docCourseId || null,
        courseName: selectedCourse?.name || 'Documentos Generales',
        category: docCategory,
        period: docPeriod,
        fileName: docFileName,
        fileData: docFileData || undefined,
      });

      setUploadSuccess(`¡El archivo "${docFileName}" se guardó y respaldó en Google Drive con éxito!`);
      setTimeout(() => {
        setOpenModal(false);
        setDocTitle('');
        setDocCourseId('');
        setDocCategory('planeamiento');
        setDocPeriod('I Período 2026');
        setDocFileName('');
        setDocFileData('');
        setUploadSuccess(null);
        loadData();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al subir el documento. Intente de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = async (id: string, name: string) => {
    const ok = await alerts.confirmDelete(
      '¿Eliminar documento de la nube?',
      `Se eliminará el respaldo de "${name}".`
    );
    if (!ok) return;
    try {
      await documentsService.delete(id);
      alerts.success('Documento eliminado', 'El respaldo se actualizó correctamente.');
      loadData();
    } catch (err: any) {
      alerts.error('Error al eliminar', err?.response?.data?.error || 'No se pudo eliminar el documento');
    }
  };

  // Filtrado de documentos
  const filteredDocs = documents.filter((doc) => {
    const matchesCourse = selectedCourseId === 'all' || doc.courseId === selectedCourseId || !doc.courseId;
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.courseName && doc.courseName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCourse && matchesCategory && matchesSearch;
  });

  const planeamientoCount = documents.filter((d) => d.category === 'planeamiento').length;
  const examenesCount = documents.filter((d) => d.category === 'examen').length;
  const guiasCount = documents.filter((d) => d.category === 'guia').length;

  return (
    <div className="space-y-5">
      {/* 1. Header Minimalista & Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>Planeamiento & Documentos</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Respaldo de planeamientos MEP, exámenes y recursos didácticos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href="https://drive.google.com/drive/u/0/my-drive?authuser=pruebaproyecto551@gmail.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span>Abrir Drive ↗</span>
          </a>
          <Button
            variant="primary"
            onClick={() => setOpenModal(true)}
            className="bg-blue-600 hover:bg-blue-700 font-bold shadow-xs text-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Subir Archivo</span>
          </Button>
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* 2. Filtros y Búsqueda Integrados */}
      <div className="space-y-3">
        {/* Chips de Categorías */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `Todos (${documents.length})` },
            { id: 'planeamiento', label: `📘 Planeamientos (${planeamientoCount})` },
            { id: 'examen', label: `📝 Exámenes (${examenesCount})` },
            { id: 'guia', label: `📋 Guías GTA (${guiasCount})` },
            { id: 'rubrica', label: `📊 Rúbricas` },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Barra de Módulo y Búsqueda */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Módulo / Grupo:</span>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              <option value="all">Todos los Módulos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título o archivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:border-blue-500 focus:outline-none shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* 3. Tabla / Lista de Archivos */}
      <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-xs">No hay documentos que coincidan con los filtros.</p>
            <p className="text-slate-400 text-[11px]">
              Haz clic en "+ Subir Archivo" para respaldar tus planeamientos y guías en Google Drive.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 select-none">
                  <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                  <th className="py-2.5 px-3.5">Título & Archivo</th>
                  <th className="py-2.5 px-3.5">Categoría</th>
                  <th className="py-2.5 px-3.5">Módulo / Período</th>
                  <th className="py-2.5 px-3.5">Fecha</th>
                  <th className="py-2.5 px-3.5 text-right pr-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc, idx) => {
                  const categoryBadge = {
                    planeamiento: { label: '📘 Planeamiento', color: 'bg-blue-50 text-blue-800 border-blue-200' },
                    examen: { label: '📝 Examen', color: 'bg-rose-50 text-rose-800 border-rose-200' },
                    guia: { label: '📋 Guía / GTA', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                    rubrica: { label: '📊 Rúbrica', color: 'bg-purple-50 text-purple-800 border-purple-200' },
                    otro: { label: '📁 Recurso', color: 'bg-slate-50 text-slate-800 border-slate-200' },
                  }[doc.category] || { label: 'Documento', color: 'bg-slate-50 text-slate-800 border-slate-200' };

                  const driveUrl = doc.driveLink
                    ? (doc.driveLink.includes('?') ? `${doc.driveLink}&authuser=pruebaproyecto551@gmail.com` : `${doc.driveLink}?authuser=pruebaproyecto551@gmail.com`)
                    : undefined;

                  return (
                    <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors group">
                      {/* # Consecutivo */}
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Título & Archivo */}
                      <td className="py-2.5 px-3.5">
                        <div className="space-y-0.5 min-w-[200px]">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">{doc.title}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                            <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate max-w-[240px]">{doc.fileName}</span>
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-2.5 px-3.5">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', categoryBadge.color)}>
                          {categoryBadge.label}
                        </span>
                      </td>

                      {/* Módulo / Período */}
                      <td className="py-2.5 px-3.5">
                        <div className="text-slate-700 font-semibold text-xs">{doc.courseName || 'General'}</div>
                        <div className="text-[10px] text-slate-400">{doc.period || 'I Período 2026'}</div>
                      </td>

                      {/* Fecha */}
                      <td className="py-2.5 px-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(doc.createdAt).toLocaleDateString('es-CR')}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          {doc.fileData && (
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.createElement('a');
                                el.href = doc.fileData!;
                                el.download = doc.fileName;
                                document.body.appendChild(el);
                                el.click();
                                document.body.removeChild(el);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition"
                              title="Descargar archivo"
                            >
                              Descargar
                            </button>
                          )}
                          {driveUrl && (
                            <a
                              href={driveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition"
                              title="Abrir en Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, doc.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                            title="Eliminar documento"
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
        )}
      </div>

      {/* MODAL DE SUBIDA DE DOCUMENTO O PLANEAMIENTO */}
      <Modal
        open={openModal}
        title="Subir y Respaldar Documento en Google Drive"
        onClose={() => {
          setOpenModal(false);
          setUploadSuccess(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setOpenModal(false);
                setUploadSuccess(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="upload-doc-form"
              disabled={submitting || !docTitle || !docFileName}
              className="bg-blue-600 hover:bg-blue-700 font-bold"
            >
              {submitting ? 'Guardando en Google Drive...' : 'Subir y Respaldar'}
            </Button>
          </>
        }
      >
        <form id="upload-doc-form" onSubmit={handleUploadDocument} className="space-y-4 text-xs">
          <Input
            label="Título o Identificación del Documento"
            placeholder="Ej. Planeamiento Didáctico Mes de Marzo - Módulo 52"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoría del Archivo"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as any)}
              options={[
                { value: 'planeamiento', label: '📘 Planeamiento Didáctico MEP' },
                { value: 'examen', label: '📝 Examen / Instrumento de Respaldo' },
                { value: 'guia', label: '📋 Guía de Trabajo Autónomo & Práctica' },
                { value: 'rubrica', label: '📊 Rúbrica de Evaluación' },
                { value: 'otro', label: '📁 Otro Documento Institucional' },
              ]}
              required
            />

            <Select
              label="Período Lectivo"
              value={docPeriod}
              onChange={(e) => setDocPeriod(e.target.value)}
              options={PERIODS}
              required
            />
          </div>

          <Select
            label="Módulo / Curso Asignado"
            value={docCourseId}
            onChange={(e) => setDocCourseId(e.target.value)}
            options={[
              { value: '', label: 'General / Todos los Cursos' },
              ...courses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          {/* Selector de Archivo con Drag & Drop real */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Seleccionar Archivo (Word, PDF, Excel, Imagen)
            </label>
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
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const MAX_BYTES = 15 * 1024 * 1024;
                  if (file.size > MAX_BYTES) {
                    alerts.warning(
                      'Archivo demasiado grande',
                      `El archivo seleccionado pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El tamaño máximo permitido es de 15 MB.`
                    );
                    return;
                  }
                  setDocFileName(file.name);
                  if (!docTitle) {
                    setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setDocFileData(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className={cn(
                'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition block space-y-2 group',
                isDragging
                  ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-md ring-4 ring-blue-100'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40'
              )}
            >
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const MAX_BYTES = 15 * 1024 * 1024;
                    if (file.size > MAX_BYTES) {
                      alerts.warning(
                        'Archivo demasiado grande',
                        `El archivo seleccionado pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El tamaño máximo permitido es de 15 MB.`
                      );
                      e.target.value = '';
                      return;
                    }
                    setDocFileName(file.name);
                    if (!docTitle) {
                      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setDocFileData(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <UploadCloud
                className={cn(
                  'w-9 h-9 mx-auto transition',
                  isDragging ? 'text-blue-600 animate-bounce' : 'text-blue-500 group-hover:scale-110'
                )}
              />
              <div
                className={cn(
                  'text-xs font-bold transition',
                  isDragging ? 'text-blue-900 font-extrabold' : 'text-slate-800'
                )}
              >
                {docFileName
                  ? `Archivo seleccionado: ${docFileName}`
                  : isDragging
                  ? '¡Suelta tu documento aquí!'
                  : 'Arrastra y suelta tu archivo aquí o haz clic para buscarlo'}
              </div>
              <div className="text-[11px] text-slate-400">
                Formatos compatibles: DOCX, PDF, XLSX, PPTX, JPG, PNG (Máx. 15 MB por archivo)
              </div>
            </label>
          </div>

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
