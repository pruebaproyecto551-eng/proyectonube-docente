import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { courseQueries, toCourseDTO } from '../database/queries/courses';
import { getTeacherId, assertOwnsCourse } from '../utils/scope';
import { param } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

const createSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(30),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
});

const updateSchema = createSchema.partial();

export const coursesController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'student') {
        const { studentQueries } = await import('../database/queries/students');
        const { enrollmentQueries } = await import('../database/queries/enrollments');
        const studentRes = await studentQueries.findByUserId(req.user.id);
        const student = studentRes.rows[0];
        if (student) {
          const enrolledRes = await enrollmentQueries.listCoursesByStudent(student.id);
          if (enrolledRes.rows.length > 0) {
            return res.json({ courses: enrolledRes.rows.map(toCourseDTO) });
          }
          // Si no tiene enrollment explícito, filtrar por su grade_level
          const allCourses = await courseQueries.listAll();
          const matched = allCourses.rows.filter((c) =>
            student.grade_level && (c.name.includes(student.grade_level) || student.grade_level.includes(c.name))
          );
          if (matched.length > 0) {
            return res.json({ courses: matched.map(toCourseDTO) });
          }
        }
      }

      const teacherId = await getTeacherId(req.user!.id);
      const result = await courseQueries.listByTeacher(teacherId);
      res.json({ courses: result.rows.map(toCourseDTO) });
    } catch (e) { next(e); }
  },

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const result = await courseQueries.findById(id);
      const course = result.rows[0];
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ error: 'Course not found' });
      }
      res.json({ course: toCourseDTO(course) });
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const data = createSchema.parse(req.body);
      const result = await courseQueries.create(teacherId, data);
      res.status(201).json({ course: toCourseDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      await assertOwnsCourse(teacherId, id);
      const data = updateSchema.parse(req.body);
      const result = await courseQueries.update(id, data);
      const course = result.rows[0];
      if (!course) return res.status(404).json({ error: 'Course not found' });
      res.json({ course: toCourseDTO(course) });
    } catch (e) { next(e); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      await assertOwnsCourse(teacherId, id);
      await courseQueries.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
};
