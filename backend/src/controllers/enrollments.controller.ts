import { Request, Response, NextFunction } from 'express';
import { assertOwnsCourse } from '../utils/scope';
import { getTeacherId } from '../utils/scope';
import { enrollmentQueries } from '../database/queries/enrollments';
import { studentQueries } from '../database/queries/students';
import { param } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

export const enrollmentsController = {
  async enroll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      const studentId = param(req, 'studentId');
      await assertOwnsCourse(teacherId, courseId);

      const student = await studentQueries.findById(studentId);
      if (student.rowCount === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      await enrollmentQueries.enroll(courseId, studentId);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async unenroll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      const studentId = param(req, 'studentId');
      await assertOwnsCourse(teacherId, courseId);
      await enrollmentQueries.unenroll(courseId, studentId);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async listStudents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertOwnsCourse(teacherId, courseId);
      const result = await enrollmentQueries.listStudentsInCourse(courseId);
      res.json({
        students: result.rows.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          studentNumber: row.student_number,
          gradeLevel: row.grade_level,
          fullName: row.full_name,
          email: row.email,
        })),
      });
    } catch (e) { next(e); }
  },
};
