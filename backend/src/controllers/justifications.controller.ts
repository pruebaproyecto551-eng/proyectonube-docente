import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  justificationQueries,
  toJustificationDTO,
  type JustificationStatus,
} from '../database/queries/justifications';
import type { AuthRequest } from '../middleware/auth.middleware';

const createJustificationSchema = z.object({
  studentId: z.string().min(1, 'El ID del estudiante es requerido'),
  studentName: z.string().optional(),
  studentNumber: z.string().optional(),
  courseId: z.string().min(1, 'El ID del curso es requerido'),
  courseName: z.string().optional(),
  absenceDate: z.string().min(1, 'La fecha de ausencia es requerida'),
  reason: z.string().min(3, 'El motivo debe tener al menos 3 caracteres'),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileData: z.string().optional(), // base64 string
});

const reviewJustificationSchema = z.object({
  status: z.enum(['approved', 'rejected'] as const),
  teacherComment: z.string().optional().nullable(),
});

export const justificationsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.query.courseId as string | undefined;
      const studentId = req.query.studentId as string | undefined;
      const status = req.query.status as string | undefined;

      const result = await justificationQueries.list({ courseId, studentId, status });
      res.json(result.rows.map(toJustificationDTO));
    } catch (error) {
      next(error);
    }
  },

  async getPendingCount(_req: Request, res: Response, next: NextFunction) {
    try {
      const count = await justificationQueries.countPending();
      res.json({ pendingCount: count });
    } catch (error) {
      next(error);
    }
  },

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await justificationQueries.findById(id);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Justificación no encontrada' });
      }
      res.json(toJustificationDTO(result.rows[0]));
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createJustificationSchema.parse(req.body);

      // Validación de plazo reglamentario MEP (Máximo 8 días naturales tras la ausencia)
      const absenceDateObj = new Date(data.absenceDate + 'T00:00:00');
      const todayObj = new Date();
      todayObj.setHours(23, 59, 59, 999);

      const diffTime = todayObj.getTime() - absenceDateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 8) {
        return res.status(400).json({
          error: `Plazo reglamentario MEP vencido: Las justificaciones deben presentarse dentro de los 8 días posteriores a la ausencia. Han transcurrido ${diffDays} días desde la falta (${data.absenceDate}).`,
        });
      }

      if (diffDays < 0) {
        return res.status(400).json({
          error: 'La fecha de ausencia no puede ser una fecha futura.',
        });
      }

      const result = await justificationQueries.create(data);
      res.status(201).json(toJustificationDTO(result.rows[0]));
    } catch (error) {
      next(error);
    }
  },

  async review(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, teacherComment } = reviewJustificationSchema.parse(req.body);
      const result = await justificationQueries.review(id, status, teacherComment);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Justificación no encontrada' });
      }
      res.json(toJustificationDTO(result.rows[0]));
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await justificationQueries.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
