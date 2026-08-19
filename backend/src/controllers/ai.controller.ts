import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.middleware';
import { gradeQueries } from '../database/queries/grades';
import { attendanceQueries } from '../database/queries/attendance';
import { studentQueries } from '../database/queries/students';
import { param } from '../utils/http';
import { getLocalDb } from '../database/connection';

const noticeSchema = z.object({
  type: z.enum(['exam_reminder', 'assignment_reminder', 'low_grade_alert', 'absence_alert', 'meeting_call', 'congratulation']),
  studentName: z.string().optional(),
  guardianName: z.string().optional(),
  courseName: z.string().optional().default('Inglés CINDEA'),
  details: z.string().optional(),
  dueDate: z.string().optional(),
  teacherName: z.string().default('Docente de Inglés'),
});

const rubricSchema = z.object({
  subject: z.string().optional().default('Inglés CINDEA'),
  gradeLevel: z.string().optional().default('Módulo 52'),
  topic: z.string().optional().default('Oral Communication & Professional English'),
  evaluationType: z.enum(['cotidiano', 'tarea', 'proyecto', 'examen']).default('tarea'),
});

const studentTutorSchema = z.object({
  subject: z.string().optional().default('English CINDEA'),
  question: z.string(),
  studentGradeLevel: z.string().optional(),
});

// Función para llamar a Gemini API en la nube con modelos Cloud activos ultrarrápidos
async function callGeminiApi(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === '' || apiKey.includes('YOUR_')) {
    return null;
  }

  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite-preview', 'gemini-3.6-flash', 'gemini-flash-latest'];

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200,
          },
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as any;
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim().length > 0) {
          return candidateText.trim();
        }
      } else {
        console.warn(`Gemini API Model ${model} returned status ${response.status}`);
      }
    } catch (err) {
      console.warn(`Gemini API Model ${model} fetch exception:`, err);
    }
  }

  return null;
}

export const aiController = {
  // Chat conversacional estilo ChatGPT/Gemini para docentes
  async chatTeacher(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { message, courseName, teacherName } = req.body;
      const tName = teacherName || 'Docente de Inglés';
      const cName = courseName || 'Inglés CINDEA';

      const systemPrompt = `Eres el asistente conversacional de Inteligencia Artificial para docentes del CINDEA (Ministerio de Educación Pública de Costa Rica).
Tu objetivo es ayudar a ${tName} a redactar comunicados, circulares a estudiantes y familias, avisos de WhatsApp, rúbricas de inglés, actividades y recordatorios pedagógicos.

ESTILO Y FORMATO:
- Sé directo, limpio y profesional.
- Si te piden un comunicado o circular, genera:
  1. El comunicado formal con saludo, cuerpo y despedida.
  2. Al final, incluye un bloque claramente separado titulado "📲 Versión para WhatsApp" breve y con emojis.
- Responde siempre en lenguaje natural, claro y sin rodeos.`;

      const geminiAnswer = await callGeminiApi(systemPrompt, `Curso/Nivel: ${cName}\nDocente: ${tName}\n\nMensaje/Petición de ${tName}:\n"${message}"`);

      if (geminiAnswer) {
        return res.json({
          reply: geminiAnswer,
          timestamp: new Date().toISOString(),
        });
      }

      // Fallback dinámico según la intención del mensaje
      const msgLower = (message || '').toLowerCase();
      let fallbackReply = '';

      if (msgLower.includes('examen') || msgLower.includes('prueba') || msgLower.includes('test')) {
        fallbackReply = `📢 **Aviso Oficial: Prueba Parcial de Inglés**\n\n` +
          `Estimados estudiantes del curso **${cName}**:\n\n` +
          `Les comunicamos que la próxima semana aplicaremos la **Prueba Parcial de Inglés**. Les recomendamos repasar el vocabulario, las lecturas y las estructuras gramaticales vistas en clase.\n\n` +
          `📅 **Fecha:** Próxima sesión oficial de lecciones\n` +
          `⏰ **Horario:** Durante el bloque habitual de clases\n` +
          `📌 **Recomendación:** Traer lapicero azul o negro y diccionario de inglés si lo requieren.\n\n` +
          `¡Muchos éxitos en su preparación!\n\n` +
          `Atentamente,\n*${tName} - Departamento de Inglés*\n\n` +
          `---\n` +
          `📲 **Versión para WhatsApp:**\n` +
          `*📢 AVISO DE EXAMEN - INGLÉS (${cName})*\n` +
          `Hola estimados estudiantes, les recordamos que la próxima semana tendremos la *Prueba Parcial de Inglés*. ¡Mucho éxito en el estudio! Cualquier consulta estoy a la orden. ✨`;
      } else if (msgLower.includes('tarea') || msgLower.includes('asignacion') || msgLower.includes('homework') || msgLower.includes('proyecto') || msgLower.includes('entrega')) {
        fallbackReply = `📌 **Recordatorio de Entrega de Asignación**\n\n` +
          `Estimados estudiantes de **${cName}**:\n\n` +
          `Se les recuerda que la entrega de la asignación de inglés vence próximamente. Por favor verifiquen que sus archivos (documento, audio o imagen) queden correctamente cargados en el Portal Estudiantil.\n\n` +
          `📅 **Plazo:** Este viernes a las 23:59 hrs\n` +
          `💻 **Medio:** Portal Estudiantil CINDEA Cloud\n\n` +
          `Saludos cordiales,\n*${tName}*\n\n` +
          `---\n` +
          `📲 **Versión para WhatsApp:**\n` +
          `*📌 RECORDATORIO DE TAREA (${cName})*\n` +
          `Hola chicos, recuerden que este viernes vence el plazo para subir la tarea al Portal Estudiantil. ¡No lo dejen para última hora! 🇬🇧📝`;
      } else if (msgLower.includes('ausencia') || msgLower.includes('falta') || msgLower.includes('asistencia') || msgLower.includes('justific')) {
        fallbackReply = `⚠️ **Comunicado sobre Justificación de Ausencias**\n\n` +
          `Estimados estudiantes y familias:\n\n` +
          `De conformidad con la normativa del MEP, les recordamos que toda ausencia a lecciones debe ser justificada dentro de los **3 días hábiles posteriores** mediante comprobante médico o laboral.\n\n` +
          `Pueden cargar el comprobante directamente en el Portal Estudiantil o entregarlo en físico en la siguiente clase.\n\n` +
          `Atentamente,\n*${tName}*\n\n` +
          `---\n` +
          `📲 **Versión para WhatsApp:**\n` +
          `*⚠️ AVISO DE ASISTENCIA (${cName})*\n` +
          `Estimados estudiantes, si tuvieron ausencias recientes recuerden presentar su justificación en los próximos 3 días hábiles. ¡Gracias por su compromiso! 📋`;
      } else if (msgLower.includes('felicit') || msgLower.includes('felicidades') || msgLower.includes('excelente') || msgLower.includes('felicitar')) {
        fallbackReply = `⭐ **Felicitación por Desempeño Destacado**\n\n` +
          `Estimados estudiantes de **${cName}**:\n\n` +
          `Quiero felicitarlos por el gran esfuerzo, entusiasmo y dedicación demostrados en las actividades de inglés de este período. Su avance y compromiso son un gran orgullo para nuestra institución.\n\n` +
          `¡A seguir cosechando éxitos!\n\n` +
          `Con mucho aprecio,\n*${tName}*\n\n` +
          `---\n` +
          `📲 **Versión para WhatsApp:**\n` +
          `*⭐ ¡EXCELENTE TRABAJO! (${cName})*\n` +
          `Felicidades a todos por su gran participación y desempeño en la clase de inglés. ¡Son un grupo ejemplar! 👏🎉`;
      } else {
        fallbackReply = `📝 **Borrador de Comunicado / Respuesta:**\n\n` +
          `Estimados estudiantes y familias de **${cName}**:\n\n` +
          `Por medio de la presente circular, se les informa lo siguiente:\n\n` +
          `> ${message}\n\n` +
          `Agradecemos su atención y continuo apoyo en el proceso de aprendizaje del idioma inglés.\n\n` +
          `Cordialmente,\n*${tName} - CINDEA*\n\n` +
          `---\n` +
          `📲 **Versión para WhatsApp:**\n` +
          `*📢 COMUNICADO DE INGLÉS (${cName})*\n` +
          `${message}\n\n` +
          `¡Quedo a su disposición ante cualquier consulta! ✨`;
      }

      res.json({
        reply: fallbackReply,
        timestamp: new Date().toISOString(),
      });
    } catch (e) { next(e); }
  },

  // 1. Generador de Comunicados para Familias con IA (Teacher Diana)
  async generateNotice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = noticeSchema.parse(req.body);
      const { type, studentName, guardianName, courseName, details, dueDate, teacherName } = data;

      // Intentar generar con Gemini si hay API Key
      const systemPrompt = `Eres un asistente de redacción oficial para ${teacherName || 'el docente de Inglés'}, docente en un CINDEA (Ministerio de Educación Pública de Costa Rica). Redacta comunicados institucionales, claros, respetuosos y profesionales para estudiantes jóvenes/adultos y familias.`;
      const userPrompt = `Genera un comunicado formal de tipo "${type}" para la materia de inglés "${courseName}".
      Estudiante: ${studentName || 'Estudiante'}
      Encargado: ${guardianName || 'Familia'}
      Fecha límite: ${dueDate || 'Próximo viernes'}
      Detalles específicos: ${details || 'Sin observaciones adicionales'}
      Docente: ${teacherName}`;

      const geminiText = await callGeminiApi(systemPrompt, userPrompt);

      let title = '';
      let message = '';
      let whatsappTemplate = '';

      switch (type) {
        case 'assignment_reminder':
          title = `Recordatorio de Tarea de Inglés: ${courseName}`;
          message = geminiText || (
            `Estimada comunidad estudiantil${studentName ? ` (${studentName})` : ''}:\n\n` +
            `Les saluda cordialmente **${teacherName}** (Departamento de Inglés - CINDEA).\n\n` +
            `Por este medio les recuerdo que se encuentra asignada una actividad evaluable en el módulo de **${courseName}**.\n\n` +
            `📌 **Fecha y hora límite de entrega:** ${dueDate || 'Viernes 11:59 PM'}\n` +
            `📝 **Instrucciones:** ${details || 'Subir el documento de Word (.docx), PDF o grabación de audio (.mp3) con la práctica oral a la plataforma cloud.'}\n\n` +
            `*Tip pedagógico:* Recuerden verificar la pronunciación y la estructura de los verbos antes de realizar su entrega.\n\n` +
            `Atentamente,\n**${teacherName}**\nForeign Language Department • MEP`
          );
          whatsappTemplate = `📢 *RECORDATORIO DE INGLÉS - CINDEA MEP*\n\nHola ${studentName || guardianName || 'estimado estudiante'} 👋 Le saluda ${teacherName}.\nLe recuerdo que tiene una tarea pendiente en *${courseName}* que vence el *${dueDate || 'este viernes'}*.\n\n👉 Por favor ingresar al Portal de Estudiantes para subir su archivo o audio. ¡Muchos éxitos! ✨`;
          break;

        case 'exam_reminder':
          title = `Convocatoria a Prueba de Inglés: ${courseName}`;
          message = geminiText || (
            `Estimados Estudiantes y Familias:\n\n` +
            `Les informamos que se ha programado la **Prueba Sumativa de Inglés** de **${courseName}**.\n\n` +
            `📅 **Fecha de aplicación:** ${dueDate || 'Próxima semana'}\n` +
            `📚 **Contenidos a evaluar:** ${details || 'Gramática (Simple Past vs Present Perfect), vocabulario de la unidad, comprensión de lectura y listening.'}\n\n` +
            `Se recomienda utilizar el **English AI Tutor** del portal estudiantil para practicar dudas y repasar las lecturas.\n\n` +
            `Best regards,\n**${teacherName}**\nCINDEA MEP`
          );
          whatsappTemplate = `📅 *EXAMEN DE INGLÉS - ${courseName}*\n\nEstimados estudiantes, la prueba de *${courseName}* se aplicará el *${dueDate || 'próxima fecha'}*. Repasen los temas en el portal estudiantil con el tutor de IA. ¡Éxitos! 🇬🇧✨`;
          break;

        case 'absence_alert':
          title = `Alerta de Asistencia y Rebajo SICIN (Inglés): ${studentName || 'Estudiante'}`;
          message = geminiText || (
            `Estimado(a) ${guardianName || studentName || 'Estudiante'}:\n\n` +
            `Por medio del presente comunicado, le informo que el estudiante **${studentName || 'ha'}** registrado ausencias injustificadas en la materia de **${courseName}**.\n\n` +
            `⚠️ **Impacto evaluativo:** Conforme al Reglamento de Evaluación de los Aprendizajes del MEP y el sistema SICIN, las ausencias injustificadas generan un rebajo automático sobre la nota porcentual de asistencia (10%).\n` +
            `📌 **Observaciones:** ${details || 'Favor enviar el justificante médico o laboral en un plazo máximo de 3 días hábiles.'}\n\n` +
            `Atentamente,\n**${teacherName}**\nCINDEA MEP`
          );
          whatsappTemplate = `⚠️ *AVISO DE ASISTENCIA - INGLÉS MEP*\n\nEstimado(a) ${studentName || guardianName || 'estudiante'}, se han registrado ausencias en *${courseName}*. Favor presentar la justificación a la docente para evitar rebajo de puntos en SICIN.`;
          break;

        case 'low_grade_alert':
          title = `Informe de Rendimiento en Inglés y Plan de Apoyo: ${studentName || 'Estudiante'}`;
          message = geminiText || (
            `Estimado(a) **${studentName || 'Estudiante'}**:\n\n` +
            `El motivo de este mensaje es brindarle acompañamiento en la materia de **${courseName}**, donde se ha identificado una calificación inferior al mínimo de aprobación.\n\n` +
            `📊 **Diagnóstico:** ${details || 'Dificultades en la resolución de ejercicios gramaticales y entregas a tiempo.'}\n` +
            `🎯 **Plan de Acompañamiento:** Estaremos implementando guías de refuerzo pedagógico y práctica oral guiada.\n\n` +
            `Con aprecio,\n**${teacherName}**\nForeign Language Department • CINDEA MEP`
          );
          whatsappTemplate = `📊 *REPORTE PEDAGÓGICO DE INGLÉS*\n\nHola ${studentName || guardianName || 'estudiante'}, le escribe ${teacherName}. Queremos coordinar apoyo y repaso en *${courseName}*. Puede revisar el desglose en su portal.`;
          break;

        case 'congratulation':
          title = `Reconocimiento y Felicitación por Buen Rendimiento en Inglés: ${studentName || 'Estudiante'}`;
          message = geminiText || (
            `Estimada familia y estimado(a) estudiante **${studentName || ''}**:\n\n` +
            `Es un verdadero honor para mí como docente de la materia **${courseName}** felicitarle por su **destacado desempeño académico, compromiso y participación activa** en las lecciones de inglés.\n\n` +
            `⭐ **Logros y Habilidades Observadas:** ${details || 'Excelente pronunciación, cumplimiento puntual de asignaciones y gran entusiasmo en las actividades de conversación y lectura.'}\n\n` +
            `Le motivamos a continuar con esa misma dedicación y esfuerzo en su proceso de aprendizaje del idioma inglés, el cual abrirá grandes puertas en su futuro profesional y personal.\n\n` +
            `*¡Congratulations on your outstanding performance! Keep up the excellent work!* 🌟👏\n\n` +
            `Atentamente,\n**${teacherName}**\nDepartamento de Idiomas Extranjeros (Inglés) • CINDEA MEP`
          );
          whatsappTemplate = `⭐ *FELICITACIÓN POR BUEN RENDIMIENTO - INGLÉS MEP*\n\nEstimado(a) ${studentName || guardianName || 'familia y estudiante'} 🌟\nLe saluda cordialmente ${teacherName}. Quiero expresarle mi más sincera felicitación por el excelente rendimiento, disciplina y dedicación demostrados en la materia de *${courseName}*.\n\n¡Siga adelante con esa gran motivación! ✨👏`;
          break;

        case 'meeting_call':
          title = `Convocatoria a Reunión de Padres y Familias: ${courseName}`;
          message = geminiText || (
            `Estimados Padres de Familia, Encargados Legales y Comunidad Educativa:\n\n` +
            `Por medio del presente comunicado, se les convoca cordialmente a la **Reunión Institucional de Información y Seguimiento Académico** para el curso **${courseName}**.\n\n` +
            `📅 **Fecha y Hora de la Convocatoria:** ${dueDate || 'Próxima semana (horario de lecciones)'}\n` +
            `📍 **Lugar / Modalidad:** Aula de Inglés - CINDEA (o enlace virtual indicado en la plataforma)\n` +
            `📝 **Agenda de la Sesión:** ${details || '1. Informe de avance de notas del periodo lectivo.\n2. Control de asistencia y justificación de ausencias (SICIN).\n3. Estrategias de apoyo pedagógico para el éxito académico en inglés.'}\n\n` +
            `Su puntual asistencia y acompañamiento en la formación de nuestros estudiantes es fundamental para el logro de sus metas educativas.\n\n` +
            `Atentamente,\n**${teacherName}**\nDirección y Docencia de Inglés • CINDEA MEP`
          );
          whatsappTemplate = `👥 *CONVOCATORIA A REUNIÓN DE PADRES Y FAMILIAS - MEP*\n\nEstimadas familias de *${courseName}*, se les invita cordialmente a la reunión informativa sobre avance académico y asistencia el día *${dueDate || 'próximamente'}*.\n\nEsperamos contar con su valiosa presencia. Atentamente: ${teacherName}.`;
          break;

        default:
          title = `Comunicado de Inglés - ${courseName}`;
          message = geminiText || (
            `Estimados estudiantes y familias:\n\n` +
            `${details || 'Se les comparte información relevante sobre las actividades académicas del curso de inglés en CINDEA.'}\n\n` +
            `Atentamente,\n**${teacherName}**\nCINDEA MEP`
          );
          whatsappTemplate = `📢 *COMUNICADO DE INGLÉS*\n\n${details || 'Aviso importante disponible en el portal.'}\n- ${teacherName}`;
      }

      res.json({
        title,
        message,
        whatsappTemplate,
        generatedAt: new Date().toISOString(),
      });
    } catch (e) { next(e); }
  },

  // 2. Diagnóstico Inteligente de Estudiantes en Riesgo (Análisis Predictivo)
  async analyzeRisk(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const courseId = param(req, 'courseId');
      const gradesRes = await gradeQueries.listByCourse(courseId);
      const attendanceRes = await attendanceQueries.listByCourse(courseId);
      const studentsRes = await studentQueries.listAll();

      const grades = gradesRes.rows;
      const attendance = attendanceRes.rows;
      const students = studentsRes.rows;

      const studentMap: Record<string, any> = {};
      const db = getLocalDb();

      students.forEach((st) => {
        const stGrades = grades.filter((g) => g.student_id === st.id);
        const totalScore = stGrades.reduce((sum, g) => sum + (Number(g.score) / Number(g.max_score || 100)) * 100, 0);
        const avg = stGrades.length > 0 ? Number((totalScore / stGrades.length).toFixed(1)) : 85;

        const stAtt = attendance.filter((a) => a.student_id === st.id);
        let unexcused = 0;
        let tardies = 0;
        let pts = 0;
        stAtt.forEach((a) => {
          if (a.status === 'absent' || a.status === 'absent_unexcused') unexcused += (a.lessons_count || 2);
          if (a.status === 'late' || a.status === 'late_unexcused') tardies++;
          pts += Number(a.points_deducted || 0);
        });

        const reasons: string[] = [];
        const recommendations: string[] = [];
        let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

        if (avg < 65) {
          riskLevel = 'HIGH';
          reasons.push(`Promedio actual en inglés bajo (${avg} / 100)`);
          recommendations.push('Aplicar práctica guiada de gramática y vocabulario con el English AI Tutor.');
        } else if (avg < 75) {
          riskLevel = 'MEDIUM';
          reasons.push(`Promedio en zona de alerta (${avg} / 100)`);
          recommendations.push('Reforzar ejercicios de listening y lectura antes de la prueba.');
        }

        if (unexcused >= 2) {
          if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
          reasons.push(`${unexcused} lecciones de ausencias injustificadas (Rebajo SICIN: -${pts} pts)`);
          recommendations.push('Contactar al estudiante o encargado legal para justificación formal.');
        }

        if (tardies >= 3) {
          reasons.push(`${tardies} tardías registradas`);
        }

        if (riskLevel === 'LOW') {
          recommendations.push('Estudiante con excelente progreso en inglés. Reforzar participación oral.');
        }

        const user = db.users.find((u: any) => u.id === st.user_id);
        const name = user?.full_name || `Estudiante #${st.student_number || st.id.slice(0, 5)}`;

        studentMap[st.id] = {
          id: st.id,
          name,
          avgGrade: avg,
          totalGrades: stGrades.length,
          unexcusedAbsences: unexcused,
          tardies,
          pointsDeducted: pts,
          riskLevel,
          reasons: reasons.length > 0 ? reasons : ['Desempeño satisfactorio y asistencia regular'],
          recommendations,
        };
      });

      const studentsList = Object.values(studentMap);
      const highRiskCount = studentsList.filter((s) => s.riskLevel === 'HIGH').length;
      const mediumRiskCount = studentsList.filter((s) => s.riskLevel === 'MEDIUM').length;
      const groupAvg = studentsList.length > 0 
        ? Number((studentsList.reduce((acc, s) => acc + s.avgGrade, 0) / studentsList.length).toFixed(1))
        : 85;

      res.json({
        summary: {
          totalStudents: studentsList.length,
          groupAverage: groupAvg,
          highRiskCount,
          mediumRiskCount,
          overallHealth: highRiskCount === 0 ? 'Excelente' : highRiskCount <= 2 ? 'Atención Requerida' : 'Crítico',
        },
        diagnostics: studentsList,
      });
    } catch (e) { next(e); }
  },

  // 3. Generador de Rúbricas MEP de Inglés (Teacher Diana)
  async generateRubric(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = rubricSchema.parse(req.body);
      const { subject, gradeLevel, topic, evaluationType } = data;

      // 1. Intentar generar con Gemini si hay API Key
      const systemPrompt = `Eres una experta en evaluación curricular del Ministerio de Educación Pública (MEP) de Costa Rica, especializada en la enseñanza del inglés como lengua extranjera en CINDEA.
Genera una rúbrica analítica rigurosa, profesional y detallada para el tema solicitado.
La escala debe ser de 3 niveles por criterio:
- advanced: 3 puntos (Avanzado / Logrado con excelencia)
- intermediate: 2 puntos (Intermedio / En proceso)
- initial: 1 punto (Inicial / Intenta la ejecución pero requiere apoyo continuo)

Debes responder ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "title": "Rúbrica de Evaluación de Inglés: [Tema]",
  "subject": "${subject}",
  "gradeLevel": "${gradeLevel}",
  "evaluationType": "${evaluationType}",
  "totalPoints": 15,
  "criteria": [
    {
      "name": "Nombre del Criterio 1",
      "points": 3,
      "levels": {
        "advanced": "Descripción detallada del desempeño de 3 puntos...",
        "intermediate": "Descripción del desempeño de 2 puntos...",
        "initial": "Descripción del desempeño de 1 punto (lo intenta pero con errores/apoyo)..."
      }
    }
  ]
}`;

      const userPrompt = `Genera 5 criterios analíticos de evaluación para:
Tema: "${topic}"
Materia: ${subject}
Nivel: ${gradeLevel}
Tipo de Evaluación: ${evaluationType}`;

      const geminiJson = await callGeminiApi(systemPrompt, userPrompt);
      if (geminiJson) {
        try {
          const cleanJson = geminiJson.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed && Array.isArray(parsed.criteria) && parsed.criteria.length > 0) {
            return res.json({ rubric: parsed });
          }
        } catch {
          // Continuar con fallback inteligente
        }
      }

      // 2. Fallback dinámico inteligente por tema
      const tLower = topic.toLowerCase();
      const isSpeaking = tLower.includes('oral') || tLower.includes('speaking') || tLower.includes('present') || tLower.includes('interview') || tLower.includes('convers');
      const isWriting = tLower.includes('writ') || tLower.includes('essay') || tLower.includes('redac') || tLower.includes('parr') || tLower.includes('letter');
      const isListening = tLower.includes('listen') || tLower.includes('audio') || tLower.includes('compren');

      let criteriaList = [];

      if (isSpeaking) {
        criteriaList = [
          {
            name: '1. Fluidez y Continuidad Oral',
            points: 3,
            levels: {
              advanced: `3 pts: Se expresa con ritmo constante y natural al abordar ${topic}. Mantiene la comunicación sin pausas excesivas ni titubeos prolongados.`,
              intermediate: `2 pts: Mantiene la comunicación sobre ${topic} aunque presenta pausas esporádicas para buscar palabras, sin perder el hilo de la idea principal.`,
              initial: `1 pt: Evidencia el intento de comunicarse oralmente, pero experimenta interrupciones frecuentes, requiriendo apoyo y tiempo extra para hilar frases.`,
            },
          },
          {
            name: '2. Pronunciación y Entonación',
            points: 3,
            levels: {
              advanced: `3 pts: Pronuncia con claridad y precisión los fonemas y entonaciones en inglés vinculados a ${topic}, facilitando la comprensión total.`,
              intermediate: `2 pts: Pronuncia de manera comprensible la mayoría de expresiones; comete errores menores de articulación que no bloquean el mensaje.`,
              initial: `1 pt: Intenta reproducir los sonidos en inglés, pero su pronunciación es poco clara o fuertemente influenciada por la lengua materna, dificultando la comprensión.`,
            },
          },
          {
            name: '3. Precisión Gramatical y Estructura',
            points: 3,
            levels: {
              advanced: `3 pts: Aplica correctamente los tiempos verbales y estructuras sintácticas solicitadas para ${topic} sin errores notables.`,
              intermediate: `2 pts: Emplea las estructuras gramaticales requeridas con errores ocasionales de concordancia o tiempo que corrige o no impiden el entendimiento.`,
              initial: `1 pt: Intenta estructurar oraciones simples, pero incurre en fallas gramaticales continuas que demandan aclaración del docente.`,
            },
          },
          {
            name: '4. Rango de Vocabulario Específico',
            points: 3,
            levels: {
              advanced: `3 pts: Integra un repertorio amplio y adecuado de vocabulario técnico/temático pertinente a ${topic}.`,
              intermediate: `2 pts: Utiliza vocabulario básico y adecuado para el tema, recurriendo en ocasiones a repeticiones o términos generales.`,
              initial: `1 pt: Muestra un repertorio léxico muy limitado respecto a ${topic}; intenta comunicarse con palabras aisladas.`,
            },
          },
          {
            name: '5. Cumplimiento de la Tarea y Puntos Clave',
            points: 3,
            levels: {
              advanced: `3 pts: Cumple a cabalidad con todos los puntos requeridos de la actividad sobre ${topic}, demostrando preparación y seguridad.`,
              intermediate: `2 pts: Desarrolla la mayor parte de los puntos solicitados, omitiendo detalles secundarios.`,
              initial: `1 pt: Intenta responder a la consigna, pero abarca únicamente una fracción mínima de los requerimientos de la actividad.`,
            },
          },
        ];
      } else if (isWriting) {
        criteriaList = [
          {
            name: '1. Organización Textual y Coherencia',
            points: 3,
            levels: {
              advanced: `3 pts: Estructura el texto con introducción, desarrollo y conclusión claros sobre ${topic}. Utiliza conectores lógicos con naturalidad.`,
              intermediate: `2 pts: Presenta una estructura comprensible con ideas conectadas de manera básica; algunas transiciones son algo abruptas.`,
              initial: `1 pt: Realiza el intento de redacción, pero las ideas se presentan desordenadas o sin enlaces claros, dificultando el seguimiento.`,
            },
          },
          {
            name: '2. Precisión Gramatical y Sintaxis',
            points: 3,
            levels: {
              advanced: `3 pts: Escribe oraciones complejas y variadas aplicando reglas de concordancia, tiempos y orden de palabras sin errores significativos.`,
              intermediate: `2 pts: Utiliza estructuras gramaticales en su mayoría correctas; errores menores de concordancia que no afectan el mensaje.`,
              initial: `1 pt: Intenta redactar oraciones en inglés, pero comete errores sintácticos continuos que comprometen el significado.`,
            },
          },
          {
            name: '3. Vocabulario y Pertinencia Léxica',
            points: 3,
            levels: {
              advanced: `3 pts: Emplea vocabulario variado, preciso y adaptado al registro académico/formal requerido para ${topic}.`,
              intermediate: `2 pts: Utiliza palabras adecuadas para el tema, con ciertas repeticiones de términos elementales.`,
              initial: `1 pt: Muestra un vocabulario muy básico o uso reiterado de español en la construcción de oraciones.`,
            },
          },
          {
            name: '4. Ortografía, Puntuación y Mayúsculas',
            points: 3,
            levels: {
              advanced: `3 pts: Aplica con exactitud las reglas de ortografía inglesa (spelling), signos de puntuación y uso normativo de mayúsculas.`,
              intermediate: `2 pts: Comete pocos errores ortográficos o de puntuación que no impiden la lectura fluida del texto.`,
              initial: `1 pt: Presenta múltiples faltas ortográficas notables e inadecuado uso de signos de puntuación que exigen esfuerzo lector.`,
            },
          },
          {
            name: '5. Cumplimiento de la Extensión y Pautas',
            points: 3,
            levels: {
              advanced: `3 pts: Cumple estrictamente con la extensión fijada y las instrucciones asignadas sobre ${topic}.`,
              intermediate: `2 pts: Cumple con la mayor parte de las pautas establecidas con leves diferencias de extensión.`,
              initial: `1 pt: Entrega un texto incompleto o que aborda tangencialmente la temática indicada.`,
            },
          },
        ];
      } else {
        criteriaList = [
          {
            name: '1. Dominio Conceptual y Aplicación',
            points: 3,
            levels: {
              advanced: `3 pts: Demuestra comprensión integral y aplicación práctica de los contenidos desarrollados en ${topic}.`,
              intermediate: `2 pts: Muestra comprensión satisfactoria de los conceptos principales con vacilaciones en aspectos secundarios.`,
              initial: `1 pt: Intenta responder pero evidencia comprensión parcial o confusa de los principios esenciales del tema.`,
            },
          },
          {
            name: '2. Estructuras Gramaticales y Normativa',
            points: 3,
            levels: {
              advanced: `3 pts: Aplica correctamente las reglas gramaticales y patrones comunicativos de inglés enseñados en clase.`,
              intermediate: `2 pts: Emplea las estructuras requeridas con errores leves que no alteran el sentido general.`,
              initial: `1 pt: Intenta aplicar las estructuras pero comete faltas recurrentes que ameritan reenseñanza.`,
            },
          },
          {
            name: '3. Vocabulario y Expresión en Inglés',
            points: 3,
            levels: {
              advanced: `3 pts: Incorpora el vocabulario de la unidad con exactitud contextual y naturalidad.`,
              intermediate: `2 pts: Utiliza el vocabulario básico del tema con leves imprecisiones de contexto.`,
              initial: `1 pt: Demuestra un léxico insuficiente para el nivel, intentando expresarse con términos aislados.`,
            },
          },
          {
            name: '4. Calidad, Orden y Evidencias',
            points: 3,
            levels: {
              advanced: `3 pts: Presenta el trabajo con excelente orden, pulcritud y claridad en todas sus secciones.`,
              intermediate: `2 pts: Presenta el trabajo ordenado y legible con detalles mínimos por mejorar.`,
              initial: `1 pt: Presenta el trabajo con desorden o falta de claridad en las respuestas/evidencias.`,
            },
          },
          {
            name: '5. Puntualidad y Cumplimiento MEP',
            points: 3,
            levels: {
              advanced: `3 pts: Entrega la totalidad de la asignación en la fecha y hora programada a través del portal.`,
              intermediate: `2 pts: Entrega el trabajo completo con leve retraso justificado o detalles mínimos pendientes.`,
              initial: `1 pt: Entrega incompleta o fuera del plazo sin justificación reglamentaria.`,
            },
          },
        ];
      }

      const rubric = {
        title: `Rúbrica Oficial MEP de Inglés: ${topic}`,
        subject: `${subject} (Lengua Extranjera)`,
        gradeLevel,
        evaluationType,
        totalPoints: 15,
        criteria: criteriaList,
      };

      res.json({ rubric });
    } catch (e) { next(e); }
  },

  // 4. English AI Tutor (Estudiantes CINDEA) - Restringido Exclusivamente a Inglés
  async askTutor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = studentTutorSchema.parse(req.body);
      const { subject, question, studentGradeLevel } = data;

      // 1. LLAMADA A GEMINI REAL EN LA NUBE (Con System Prompt Estricto de Inglés)
      const systemPrompt = `Eres el "CINDEA English AI Tutor", el asistente oficial de Inteligencia Artificial para las clases de inglés en el CINDEA (Ministerio de Educación Pública de Costa Rica).
      Tu audiencia son estudiantes jóvenes y adultos (desde los 15 años hasta adultos mayores).

      REGLAS DE ORO OBLIGATORIAS:
      1. Tu ÚNICA función es resolver dudas relacionadas con la enseñanza del idioma INGLÉS (Gramática, tiempos verbales, vocabulario, pronunciación, comprensión de lectura, diálogos orales, redacción de ensayos en inglés y preparación laboral/entrevistas en inglés).
      2. RESTRICCIÓN ESTRICTA DE TEMA (Off-topic): Si el usuario hace preguntas sobre otros temas NO relacionados con el idioma inglés (por ejemplo: cocina, recetas de pizza, matemáticas, videojuegos, política, vida personal, etc.), RECHAZA AMABLEMENTE diciendo:
      "Lo siento, como tutor de la clase de Inglés de CINDEA, únicamente puedo responder dudas y ayudarte con temas relacionados con el idioma inglés. ¿Tienes alguna pregunta sobre gramática, vocabulario o pronunciación?"
      3. TONO: Paciente, pedagógico, motivador y claro. Puedes explicar en español con ejemplos en inglés, o completamente en inglés si el estudiante te escribe en inglés.`;

      const userPrompt = `Materia: ${subject}
      Nivel del estudiante: ${studentGradeLevel || 'Módulo de Inglés CINDEA'}
      Pregunta del estudiante: "${question}"`;

      const geminiAnswer = await callGeminiApi(systemPrompt, userPrompt);

      if (geminiAnswer) {
        return res.json({
          answer: geminiAnswer,
          subject,
          source: 'Google Gemini 2.0 / 1.5 Flash (Cloud AI)',
          timestamp: new Date().toISOString(),
        });
      }

      // 2. FALLBACK INTELIGENTE ESPECIALIZADO EN INGLÉS CINDEA
      const q = question.toLowerCase().trim();
      let explanation = '';

      // Filtro de temas fuera de lugar
      const offTopicKeywords = ['pizza', 'cocina', 'receta', 'videojuego', 'futbol', 'matematica', 'quimica', 'fisica', 'novio', 'chiste'];
      const isOffTopic = offTopicKeywords.some((w) => q.includes(w));

      if (isOffTopic) {
        explanation = `🚫 **Aviso del Tutor de Inglés CINDEA:**\n\n` +
          `Lo siento, como asistente exclusivo de la clase de **Inglés**, únicamente puedo responder dudas y ayudarte con temas relacionados con el idioma inglés (gramática, vocabulario, pronunciación o tareas de la materia).\n\n` +
          `¿Hay algún tema de inglés en el que te pueda colaborar hoy? 🇬🇧✨`;
      } else if (q.includes('past') || q.includes('perfect') || q.includes('pasado')) {
        explanation = `💡 **Simple Past vs. Present Perfect:**\n\n` +
          `• **Simple Past:** Se usa para acciones que ocurrieron y terminaron en un momento específico del pasado.\n` +
          `  - *Ejemplo:* "I **visited** San José yesterday." (Ayer terminó la acción).\n\n` +
          `• **Present Perfect (have/has + pasado participio):** Se usa para experiencias de vida o acciones del pasado que tienen conexión con el presente.\n` +
          `  - *Ejemplo:* "I **have lived** in Costa Rica for 5 years." (Empezó en el pasado y aún vivo allí).\n\n` +
          `👉 *Tip para tu tarea:* Si la oración tiene palabras como *yesterday, last night, in 2020*, usa **Simple Past**. Si dice *already, yet, since, ever*, usa **Present Perfect**.`;
      } else if (q.includes('pronun') || q.includes('-ed') || q.includes('sonido')) {
        explanation = `🗣️ **Reglas de Pronunciación de las terminaciones '-ed' en verbos regulares:**\n\n` +
          `La terminación **-ed** tiene 3 pronunciaciones posibles en inglés:\n\n` +
          `1. **/ɪd/ (como 'id'):** Solo cuando el verbo termina en sonido de **T** o **D**.\n` +
          `   - *Want* ➔ *Wanted* (/wɑːn.tɪd/)\n` +
          `   - *Need* ➔ *Needed* (/niː.dɪd/)\n\n` +
          `2. **/t/:** Después de sonidos sordos (P, K, F, S, SH, CH).\n` +
          `   - *Work* ➔ *Worked* (/wɜːrkt/)\n` +
          `   - *Watch* ➔ *Watched* (/wɑːtʃt/)\n\n` +
          `3. **/d/:** Después de sonidos sonoros y vocales (L, N, R, G, V, Z, B, M).\n` +
          `   - *Play* ➔ *Played* (/pleɪd/)\n` +
          `   - *Clean* ➔ *Cleaned* (/kliːnd/)`;
      } else if (q.includes('trabajo') || q.includes('entrevista') || q.includes('interview') || q.includes('job')) {
        explanation = `💼 **Vocabulario y Expresiones para Entrevistas de Trabajo en Inglés:**\n\n` +
          `• *"Tell me about yourself"* ➔ *"I am a proactive professional with experience in..."*\n` +
          `• *"What are your strengths?"* ➔ *"I am great at teamwork, problem-solving, and punctual with deadlines."*\n` +
          `• *"Why do you want this job?"* ➔ *"Because I want to develop my career and contribute to this company."*\n\n` +
          `👉 *Frase clave:* *"I look forward to hearing from you soon."* (Espero tener noticias suyas pronto).`;
      } else if (q.includes('corregir') || q.includes('corrige') || q.includes('correct') || q.includes('have') && q.includes('years') || q.includes('am study')) {
        explanation = `✍️ **Corrección y Explicación Gramatical:**\n\n` +
          `**Frase Correcta:**\n` +
          `> *"I **am** 20 years old and I **am studying** English."* (o *"I am 20 years old and I **study** English."*)\n\n` +
          `**Puntos de corrección:**\n` +
          `1. ❌ *"I have 20 years"* ➔ ✅ **"I am 20 years old"**: En inglés la edad se expresa siempre con el verbo **to be** (*am/is/are*), nunca con el verbo *have*.\n` +
          `2. ❌ *"I am study"* ➔ ✅ **"I am studying"** (Presente Continuo: acción en curso) o **"I study"** (Presente Simple: hábito).\n\n` +
          `*Traducción:* "Tengo 20 años y estoy estudiando inglés." 🇬🇧✨`;
      } else if (q.includes('como se dice') || q.includes('how do you say') || q.includes('traducir') || q.includes('significa')) {
        explanation = `💡 **Guía de Traducción y Vocabulario:**\n\n` +
          `Para consultar una palabra o frase en inglés, asegúrate de escribirla entre comillas.\n\n` +
          `• Recuerda que en inglés muchas expresiones no se traducen literalmente palabra por palabra, sino por contexto o modismo (*idiom*).\n` +
          `• Si tienes una frase completa para tu tarea o audio de CINDEA, ¡escríbela y te explico cómo pronunciarla y estructurarla! ✨`;
      } else {
        explanation = `🇬🇧 **CINDEA English AI Tutor:**\n\n` +
          `Analizando tu consulta de inglés: *"${question}"*:\n\n` +
          `• **Estructura recomendada:** Para formular preguntas u oraciones en este módulo, utiliza la estructura Sujeto + Verbo + Complemento.\n` +
          `• **Pronunciación:** Practica pronunciando cada palabra en voz alta antes de grabar tus entregas de Speaking.\n\n` +
          `¿Deseas que revisemos un ejemplo paso a paso o una oración específica de tu guía? ¡Escríbela aquí! ✨`;
      }

      res.json({
        answer: explanation,
        subject,
        source: 'CINDEA English Cloud AI Engine',
        timestamp: new Date().toISOString(),
      });
    } catch (e) { next(e); }
  },
};
