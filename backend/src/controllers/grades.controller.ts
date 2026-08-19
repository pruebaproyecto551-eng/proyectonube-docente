import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { assignmentQueries, toAssignmentDTO } from '../database/queries/assignments';
import { gradeQueries, toGradeDTO } from '../database/queries/grades';
import { courseQueries } from '../database/queries/courses';
import { getTeacherId } from '../utils/scope';
import { param, query } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

const assignmentCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  maxScore: z.number().positive().default(100),
  attachmentName: z.string().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
  attachmentData: z.string().nullable().optional(),
  submissionType: z.enum(['in_class', 'digital']).optional().default('digital'),
});

const assignmentUpdateSchema = assignmentCreateSchema.partial();

const gradeCreateSchema = z
  .object({
    studentId: z.string().min(1),
    assignmentId: z.string().nullable().optional(),
    title: z.string().min(1),
    category: z.string().nullable().optional(),
    score: z.number().min(0),
    maxScore: z.number().positive().default(100),
    weight: z.number().min(0).default(1),
    gradedOn: z.string().optional(),
    notes: z.string().nullable().optional(),
    attachmentName: z.string().nullable().optional(),
    attachmentData: z.string().nullable().optional(),
    attachmentUrl: z.string().nullable().optional(),
  })
  .refine((d) => d.score <= d.maxScore, {
    message: 'score must be <= maxScore',
    path: ['score'],
  });

const gradeUpdateSchema = z
  .object({
    title: z.string().min(1).optional(),
    category: z.string().nullable().optional(),
    score: z.number().min(0).optional(),
    maxScore: z.number().positive().optional(),
    weight: z.number().min(0).optional(),
    gradedOn: z.string().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (d) => d.score === undefined || d.maxScore === undefined || d.score <= d.maxScore,
    { message: 'score must be <= maxScore', path: ['score'] }
  );

async function assertCourseOwned(teacherId: string, courseId: string) {
  // En modo CINDEA docente único, permitimos acceso irrestricto
  return true;
}

export const assignmentsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const result = await assignmentQueries.listByCourse(courseId);
      res.json({ assignments: result.rows.map(toAssignmentDTO) });
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const data = assignmentCreateSchema.parse(req.body);

      // 1. Obtener información del curso para Google Drive
      const courseRes = await courseQueries.findById(courseId);
      const courseName = courseRes.rows[0]?.name || 'Nivel de Inglés';
      let driveFolderUrl: string | null = null;

      // 2. Crear o vincular carpeta de Drive
      try {
        const { createRealDriveFolder, uploadFileToDrive } = await import('../integrations/google/google.service');
        const driveRes = await createRealDriveFolder(
          req.user?.email || 'pruebaproyecto551@gmail.com',
          courseName,
          data.title
        );
        if (driveRes?.webViewLink) {
          driveFolderUrl = driveRes.webViewLink;
        }

        // Si la docente adjuntó un archivo de guía o rúbrica, subirlo a Drive
        if (data.attachmentName && data.attachmentData) {
          await uploadFileToDrive(courseName, data.title, data.attachmentName, data.attachmentData);
        }
      } catch (err: any) {
        console.warn('[Google Drive] No se pudo crear carpeta de tarea:', err.message);
      }

      // 3. Crear asignación en base de datos
      const result = await assignmentQueries.create(courseId, {
        ...data,
        driveFolderUrl,
      });

      res.status(201).json({ assignment: toAssignmentDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await assignmentQueries.findById(id);
      const a = found.rows[0];
      if (!a) return res.status(404).json({ error: 'Assignment not found' });
      await assertCourseOwned(teacherId, a.course_id);
      const data = assignmentUpdateSchema.parse(req.body);
      const result = await assignmentQueries.update(id, data);
      res.json({ assignment: toAssignmentDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await assignmentQueries.findById(id);
      const a = found.rows[0];
      if (!a) return res.status(404).json({ error: 'Assignment not found' });
      await assertCourseOwned(teacherId, a.course_id);
      await assignmentQueries.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
};

export const gradesController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const studentId = query(req, 'studentId');
      const result = studentId
        ? await gradeQueries.listByCourseAndStudent(courseId, studentId)
        : await gradeQueries.listByCourse(courseId);
      res.json({ grades: result.rows.map(toGradeDTO) });
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const data = gradeCreateSchema.parse(req.body);
      const result = await gradeQueries.create(courseId, {
        ...data,
        gradedOn: data.gradedOn || new Date().toISOString(),
      });

      if (data.attachmentName && data.attachmentData) {
        try {
          const { uploadFileToDrive } = await import('../integrations/google/google.service');
          const courseRes = await courseQueries.findById(courseId);
          const courseName = courseRes.rows[0]?.name || 'Inglés CINDEA';
          const cleanStudentId = data.studentId.slice(0, 8);
          await uploadFileToDrive(
            courseName,
            'Evaluaciones y Exámenes Calificados (Respaldo)',
            `${data.title.replace(/[^a-zA-Z0-9_.-]/g, '_')}_${cleanStudentId}_${data.attachmentName}`,
            data.attachmentData
          );
        } catch (driveErr: any) {
          console.warn('[Grades] No se pudo respaldar examen en Google Drive:', driveErr.message);
        }
      }

      res.status(201).json({ grade: toGradeDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await gradeQueries.findById(id);
      const g = found.rows[0];
      if (!g) return res.status(404).json({ error: 'Grade not found' });
      await assertCourseOwned(teacherId, g.course_id);
      const data = gradeUpdateSchema.parse(req.body);
      const result = await gradeQueries.update(id, data);
      res.json({ grade: toGradeDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await gradeQueries.findById(id);
      const g = found.rows[0];
      if (!g) return res.status(404).json({ error: 'Grade not found' });
      await assertCourseOwned(teacherId, g.course_id);
      await gradeQueries.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
};
