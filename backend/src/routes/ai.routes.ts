import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const aiRouter = Router();

// Módulo de Inteligencia Artificial Gemini (Docente & Estudiantes CINDEA)
aiRouter.post('/chat', aiController.chatTeacher);
aiRouter.post('/tutor', aiController.askTutor);
aiRouter.post('/notice', aiController.generateNotice);
aiRouter.get('/risk-analysis/:courseId', aiController.analyzeRisk);
aiRouter.post('/rubric', aiController.generateRubric);
