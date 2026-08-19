import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { documentQueries, toTeacherDocumentDTO } from '../database/queries/documents';
import { courseQueries } from '../database/queries/courses';
import { getTeacherId } from '../utils/scope';
import { param, query } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

const documentCreateSchema = z.object({
  courseId: z.string().nullable().optional(),
  courseName: z.string().nullable().optional(),
  title: z.string().min(1),
  category: z.enum(['planeamiento', 'examen', 'guia', 'rubrica', 'otro']).default('planeamiento'),
  period: z.string().nullable().optional(),
  fileName: z.string().min(1),
  fileData: z.string().nullable().optional(),
});

export const documentsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = query(req, 'courseId');
      const category = query(req, 'category');

      const result = await documentQueries.list({
        teacherId,
        courseId: courseId || undefined,
        category: category || undefined,
      });

      res.json({ documents: result.rows.map(toTeacherDocumentDTO) });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const data = documentCreateSchema.parse(req.body);

      let finalCourseName = data.courseName;
      if (data.courseId && !finalCourseName) {
        const cRes = await courseQueries.findById(data.courseId);
        finalCourseName = cRes.rows[0]?.name || 'Inglés CINDEA';
      }
      const courseFolder = 'Documentos Generales';

      const categoryFolderMap: Record<string, string> = {
        planeamiento: 'Planeamientos Didácticos MEP',
        examen: 'Exámenes y Pruebas (Respaldo Oficial)',
        guia: 'Guías de Trabajo Autónomo (GTA)',
        rubrica: 'Rúbricas y Escalas Evaluativas',
        otro: 'Recursos y Material Didáctico',
      };

      const targetSubFolder = categoryFolderMap[data.category] || 'Documentos y Respaldos';
      const cleanFileName = data.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileUrl = `/CloudStorage/2026/Docente/${data.category}/${cleanFileName}`;
      let driveLink: string | undefined;

      // Subir archivo real a Google Drive
      if (data.fileData) {
        try {
          const { uploadFileToDrive } = await import('../integrations/google/google.service');
          const driveResult = await uploadFileToDrive(
            courseFolder,
            targetSubFolder,
            data.fileName,
            data.fileData
          );
          if (driveResult?.webViewLink) {
            driveLink = driveResult.webViewLink;
          }
        } catch (driveErr: any) {
          console.warn('[TeacherDocuments] No se pudo subir a Google Drive:', driveErr.message);
        }
      }

      const result = await documentQueries.create({
        teacherId,
        courseId: data.courseId ?? null,
        courseName: finalCourseName ?? null,
        title: data.title,
        category: data.category,
        period: data.period ?? 'I Período 2026',
        fileName: data.fileName,
        fileData: data.fileData ?? null,
        fileUrl,
        driveLink: driveLink ?? 'https://drive.google.com/drive/folders/1sDpkjftZUFewVSGDemeyViPUlVUBki0L',
      });

      res.status(201).json({
        document: toTeacherDocumentDTO(result.rows[0]),
      });
    } catch (e) {
      next(e);
    }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = param(req, 'id');
      await documentQueries.delete(id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
