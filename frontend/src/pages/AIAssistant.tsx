import { useEffect, useState, useRef } from 'react';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { coursesService } from '../services/courses.service';
import { aiService } from '../services/ai.service';
import { announcementsService } from '../services/announcements.service';
import { useAuth } from '../auth/AuthProvider';
import { alerts } from '../utils/alerts';
import type { Course, AIDiagnosticReport, AIRubric } from '../types';
import {
  Sparkles,
  Send,
  FileCheck,
  Copy,
  Check,
  BrainCircuit,
  MessageCircle,
  Share2,
  RefreshCw,
  Bot,
  User,
  Printer,
} from 'lucide-react';
import { cn } from '../utils';
import { FormattedMessage } from '../components/FormattedMessage';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const QUICK_SUGGESTIONS = [
  { label: '📝 Aviso de Examen', prompt: 'Redacta un aviso formal recordando el examen parcial de inglés de la próxima semana, indicando temario y traer lapicero.' },
  { label: '📌 Entrega de Tarea', prompt: 'Redacta un recordatorio para los estudiantes de que este viernes vence la entrega de la tarea en el portal estudiantil.' },
  { label: '⚠️ Justificación de Ausencias', prompt: 'Redacta un comunicado formal recordando a los estudiantes y familias que tienen 3 días hábiles para justificar ausencias según normativa MEP.' },
  { label: '⭐ Felicitación Grupal', prompt: 'Redacta una felicitación motivadora para el grupo por su excelente participación y buenas notas en inglés.' },
];

export function AIAssistant() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'risk' | 'rubrics'>('chat');
  const [error, setError] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `¡Hola ${user?.fullName ? user.fullName : 'Teacher'}! Soy tu Asistente Inteligente de Redacción y Pedagogía.\n\nPuedes pedirme en lenguaje natural cualquier comunicado, circular para familias, avisos de WhatsApp, ideas de actividades o rúbricas para tus lecciones de inglés en CINDEA. ¿Qué deseas redactar hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Tab 2: Diagnóstico de Riesgo
  const [riskReport, setRiskReport] = useState<AIDiagnosticReport | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  // Tab 3: Rúbricas MEP de Inglés
  const [rubricTopic, setRubricTopic] = useState('Oral Presentation: Job Interview & Professional English');
  const [rubricGradeLevel, setRubricGradeLevel] = useState('CINDEA - Módulo 52 (Inglés)');
  const [rubricEvalType, setRubricEvalType] = useState<'cotidiano' | 'tarea' | 'proyecto' | 'examen'>('tarea');
  const [generatedRubric, setGeneratedRubric] = useState<AIRubric | null>(null);
  const [rubricLoading, setRubricLoading] = useState(false);

  useEffect(() => {
    coursesService
      .list()
      .then((cs) => {
        if (cs.length > 0) {
          setCourses(cs);
          setCourseId(cs[0].id);
        } else {
          const fallbacks: Course[] = [
            { id: '55555555-5555-4555-a555-555555555551', name: 'Inglés 10° Año (Módulo IV)', code: 'ING-10', teacherId: '', description: null, color: '#2563EB' },
            { id: '55555555-5555-4555-a555-555555555552', name: 'Inglés 11° Año (Módulo V)', code: 'ING-11', teacherId: '', description: null, color: '#059669' },
          ];
          setCourses(fallbacks);
          setCourseId(fallbacks[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const activeCourse = courses.find((c) => c.id === courseId);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || chatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setChatLoading(true);
    setError(null);

    try {
      const res = await aiService.chatTeacher({
        message: textToSend,
        courseName: activeCourse?.name || 'Inglés CINDEA',
        teacherName: user?.fullName ? `Prof. ${user.fullName}` : 'Docente de Inglés',
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      const errorAiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Lo siento, hubo un inconveniente al generar la respuesta. Por favor intenta de nuevo.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorAiMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    alerts.success('Texto copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = (text: string) => {
    // Si contiene sección de whatsapp, extraerla, sino enviar el texto completo
    let cleanText = text;
    if (text.includes('Versión para WhatsApp:')) {
      cleanText = text.split('Versión para WhatsApp:')[1]?.trim() || text;
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(cleanText)}`;
    window.open(url, '_blank');
  };

  const handlePublishAnnouncement = async (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const title = lines[0]?.replace(/[*#]/g, '').trim() || `Comunicado de ${activeCourse?.name || 'Inglés'}`;
    const ok = await alerts.confirmAction(
      '¿Publicar en Avisos del Portal?',
      `Se creará un aviso oficial titulado "${title}" para los estudiantes de este grupo.`,
      'Sí, Publicar'
    );
    if (!ok) return;

    try {
      await announcementsService.create({
        courseId: courseId || null,
        title,
        content: text,
      });
      alerts.success('Aviso publicado', 'Los estudiantes podrán verlo en su portal.');
    } catch {
      alerts.error('Error al publicar', 'No se pudo guardar el aviso.');
    }
  };

  const handleLoadRisk = async () => {
    if (!courseId) return;
    setRiskLoading(true);
    setError(null);
    try {
      const rep = await aiService.analyzeRisk(courseId);
      setRiskReport(rep);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al analizar riesgo del curso');
    } finally {
      setRiskLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'risk' && courseId) {
      handleLoadRisk();
    }
  }, [activeTab, courseId]);

  const handleGenerateRubric = async () => {
    const course = courses.find((c) => c.id === courseId);
    setRubricLoading(true);
    setError(null);
    try {
      const res = await aiService.generateRubric({
        subject: course?.name || 'Inglés CINDEA',
        gradeLevel: rubricGradeLevel,
        topic: rubricTopic,
        evaluationType: rubricEvalType,
      });
      setGeneratedRubric(res.rubric);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al generar rúbrica');
    } finally {
      setRubricLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Minimalista & Filtro de Grupo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
            <span>Asistente de IA Docente</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chat inteligente para redacción de circulares, avisos y material pedagógico.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">Grupo:</span>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs truncate"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* 2. Pestañas Limpias con Scroll Horizontal en Móvil */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer',
            activeTab === 'chat'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          )}
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>Chat & Circulares</span>
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={cn(
            'pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer',
            activeTab === 'risk'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          )}
        >
          <BrainCircuit className="w-4 h-4 shrink-0" />
          <span>Diagnóstico de Riesgo</span>
        </button>
        <button
          onClick={() => setActiveTab('rubrics')}
          className={cn(
            'pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer',
            activeTab === 'rubrics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          )}
        >
          <FileCheck className="w-4 h-4 shrink-0" />
          <span>Rúbricas MEP</span>
        </button>
      </div>

      {/* 3. Pestaña Principal: Chat Conversacional Estilo ChatGPT / Gemini */}
      {activeTab === 'chat' && (
        <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs flex flex-col h-[640px]">
          {/* Barra de Sugerencias Rápidas */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">
              Plantillas rápidas:
            </span>
            {QUICK_SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(sug.prompt)}
                disabled={chatLoading}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700 font-semibold text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {sug.label}
              </button>
            ))}
          </div>

          {/* Ventana de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3 max-w-3xl',
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs',
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    )}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={cn(
                      'rounded-2xl p-4 text-xs leading-relaxed space-y-2 max-w-full sm:max-w-xl shadow-2xs',
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-50/90 border border-slate-200/80 text-slate-800'
                    )}
                  >
                    <div className="font-sans selection:bg-blue-200 selection:text-blue-900">
                      {isUser ? (
                        <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                      ) : (
                        <FormattedMessage content={msg.text} />
                      )}
                    </div>

                    <div
                      className={cn(
                        'text-[10px] flex items-center justify-between pt-1 border-t',
                        isUser ? 'text-blue-100 border-blue-500/40' : 'text-slate-400 border-slate-200/60'
                      )}
                    >
                      <span>{msg.timestamp}</span>

                      {!isUser && msg.id !== 'welcome' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-semibold transition"
                            title="Copiar mensaje"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copiar</span>
                          </button>

                          <button
                            onClick={() => handleShareWhatsApp(msg.text)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-emerald-100 text-emerald-700 font-semibold transition"
                            title="Enviar por WhatsApp Web"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => handlePublishAnnouncement(msg.text)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-blue-100 text-blue-700 font-semibold transition"
                            title="Publicar en Tablón de Avisos"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Publicar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {chatLoading && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>El Asistente IA está redactando tu comunicado...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Formulario de Envío de Mensaje */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Escribe lo que necesitas redactar para ${activeCourse?.name || 'este grupo'}... (Ej. "Redacta un aviso de examen para el viernes")`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={chatLoading}
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none shadow-2xs"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!inputMessage.trim() || chatLoading}
              className="rounded-2xl px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 shadow-xs shrink-0"
            >
              <Send className="w-4 h-4 mr-1" />
              <span>Enviar</span>
            </Button>
          </form>
        </div>
      )}

      {/* 4. Tab Diagnóstico de Riesgo */}
      {activeTab === 'risk' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Diagnóstico Predictivo MEP - {activeCourse?.name}
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleLoadRisk}
              disabled={riskLoading}
              className="text-xs font-bold"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', riskLoading && 'animate-spin')} />
              Actualizar Diagnóstico
            </Button>
          </div>

          {riskLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Analizando registros de notas y asistencia...</div>
          ) : riskReport ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                  <div className="text-xs text-slate-500">Total Alumnos</div>
                  <div className="text-xl font-black text-slate-800 mt-1">{riskReport.summary.totalStudents}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                  <div className="text-xs text-slate-500">Promedio Grupal</div>
                  <div className="text-xl font-black text-blue-600 mt-1">{riskReport.summary.groupAverage}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                  <div className="text-xs text-slate-500">Riesgo Alto</div>
                  <div className="text-xl font-black text-rose-600 mt-1">{riskReport.summary.highRiskCount}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                  <div className="text-xs text-slate-500">Estado General</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">{riskReport.summary.overallHealth}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Estudiante</th>
                      <th className="p-3 text-center">Promedio</th>
                      <th className="p-3 text-center">Ausencias Injust.</th>
                      <th className="p-3 text-center">Nivel de Riesgo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riskReport.diagnostics.map((st) => (
                      <tr key={st.id}>
                        <td className="p-3 font-semibold text-slate-800">{st.name}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{st.avgGrade}</td>
                        <td className="p-3 text-center text-rose-600 font-bold">{st.unexcusedAbsences}</td>
                        <td className="p-3 text-center">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                              st.riskLevel === 'HIGH'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : st.riskLevel === 'MEDIUM'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}
                          >
                            {st.riskLevel === 'HIGH' ? 'Alto' : st.riskLevel === 'MEDIUM' ? 'Medio' : 'Bajo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 5. Tab Rúbricas MEP */}
      {activeTab === 'rubrics' && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Generador de Rúbricas Analíticas MEP (Inglés)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea instrumentos de evaluación basados en escalas de desempeño: 3 pts (Avanzado), 2 pts (Intermedio), 1 pt (Inicial / Con apoyo).
              </p>
            </div>

            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Temas frecuentes:</span>
              {[
                { label: '🗣️ Oral: Job Interview', topic: 'Oral Presentation: Job Interview & Professional English', type: 'tarea' },
                { label: '✍️ Writing: Essay / Letter', topic: 'Written Essay: Formal Email & Cover Letter', type: 'tarea' },
                { label: '🎧 Listening & Speaking', topic: 'Listening & Oral Interaction: Daily Routines & Hobbies', type: 'cotidiano' },
                { label: '📊 Proyecto / Exposición', topic: 'Final Group Project: Environmental Issues & Solutions', type: 'proyecto' },
                { label: '📝 Cotidiano en Clase', topic: 'Classroom Daily Practice & Grammar Exercises', type: 'cotidiano' },
              ].map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setRubricTopic(p.topic);
                    setRubricEvalType(p.type as any);
                  }}
                  className="px-2.5 py-1 text-xs rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700 font-semibold transition"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700">Tema o Habilidad Evaluada</label>
                <input
                  type="text"
                  value={rubricTopic}
                  onChange={(e) => setRubricTopic(e.target.value)}
                  placeholder="Ej. Oral Interview, Essay, Conversation..."
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Nivel / Módulo</label>
                <input
                  type="text"
                  value={rubricGradeLevel}
                  onChange={(e) => setRubricGradeLevel(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Tipo de Evaluación</label>
                <select
                  value={rubricEvalType}
                  onChange={(e: any) => setRubricEvalType(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none"
                >
                  <option value="tarea">Tarea (10%)</option>
                  <option value="cotidiano">Trabajo Cotidiano (50%)</option>
                  <option value="proyecto">Proyecto (20%)</option>
                  <option value="examen">Prueba Parcial (20%)</option>
                </select>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleGenerateRubric}
              disabled={rubricLoading || !rubricTopic.trim()}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 shadow-xs"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {rubricLoading ? 'Generando Rúbrica con IA...' : 'Generar Rúbrica Analítica MEP'}
            </Button>
          </div>

          {generatedRubric && (
            <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs space-y-4 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-black text-slate-900">{generatedRubric.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>{generatedRubric.subject}</span>
                    <span>•</span>
                    <span>{generatedRubric.gradeLevel}</span>
                    <span>•</span>
                    <span className="font-bold text-blue-600">Total: {generatedRubric.totalPoints} puntos ({generatedRubric.criteria.length} criterios x 3 pts)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `${generatedRubric.title}\n\n` +
                        generatedRubric.criteria.map((c) =>
                          `📌 ${c.name} (${c.points} pts)\n` +
                          `• Avanzado (3 pts): ${c.levels.advanced}\n` +
                          `• Intermedio (2 pts): ${c.levels.intermediate}\n` +
                          `• Inicial (1 pt): ${c.levels.initial}\n`
                        ).join('\n');
                      navigator.clipboard.writeText(text);
                      alerts.success('Rúbrica copiada al portapapeles');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir / PDF
                  </button>
                </div>
              </div>

              {/* Tabla Analítica MEP */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-4 w-1/4">Indicador / Criterio</th>
                      <th className="py-3 px-4 w-1/4 bg-emerald-50/50 text-emerald-900">Avanzado (3 pts)</th>
                      <th className="py-3 px-4 w-1/4 bg-blue-50/50 text-blue-900">Intermedio (2 pts)</th>
                      <th className="py-3 px-4 w-1/4 bg-amber-50/50 text-amber-900">Inicial (1 pt)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {generatedRubric.criteria.map((cr, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 align-top">
                          <div>{cr.name}</div>
                          <span className="text-[10px] text-slate-400 font-normal">Valor: {cr.points} puntos</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 bg-emerald-50/20 align-top leading-relaxed">
                          {cr.levels.advanced}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 bg-blue-50/20 align-top leading-relaxed">
                          {cr.levels.intermediate}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 bg-amber-50/20 align-top leading-relaxed">
                          {cr.levels.initial}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
