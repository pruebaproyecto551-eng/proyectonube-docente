import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { 
  attendanceQueries, 
  toAttendanceDTO, 
  type AttendanceStatusType,
  calculatePointsDeduction 
} from '../database/queries/attendance';
import { courseQueries } from '../database/queries/courses';
import { getTeacherId } from '../utils/scope';
import { param, query } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

const statusEnum = z.enum([
  'present',
  'absent',
  'late',
  'excused',
  'absent_unexcused',
  'absent_excused',
  'late_unexcused',
  'late_excused',
]);

const markSchema = z.object({
  studentId: z.string(),
  date: z.string(),
  status: statusEnum,
  lessonsCount: z.number().int().positive().default(2),
  notes: z.string().nullable().optional(),
});

const updateSchema = z.object({
  status: statusEnum.optional(),
  lessonsCount: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
});

async function assertCourseOwned(teacherId: string, courseId: string) {
  const result = await courseQueries.ownsCourse(teacherId, courseId);
  if (result.rowCount === 0) {
    throw Object.assign(new Error('Course not found'), { status: 404 });
  }
}

export const attendanceController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const date = query(req, 'date');
      const result = await attendanceQueries.listByCourse(courseId, date);
      res.json({ attendance: result.rows.map(toAttendanceDTO) });
    } catch (e) { next(e); }
  },

  async mark(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const data = markSchema.parse(req.body);
      const result = await attendanceQueries.upsert(
        courseId,
        data.studentId,
        data.date,
        data.status as AttendanceStatusType,
        data.lessonsCount,
        data.notes
      );
      res.status(201).json({ attendance: toAttendanceDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const found = await attendanceQueries.findById(id);
      const a = found.rows[0];
      if (!a) return res.status(404).json({ error: 'Attendance not found' });
      await assertCourseOwned(teacherId, a.course_id);
      const data = updateSchema.parse(req.body);
      const result = await attendanceQueries.update(id, {
        status: data.status as AttendanceStatusType | undefined,
        lessonsCount: data.lessonsCount,
        notes: data.notes,
      });
      res.json({ attendance: toAttendanceDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async summary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const courseId = param(req, 'courseId');
      await assertCourseOwned(teacherId, courseId);
      const result = await attendanceQueries.listByCourse(courseId);
      const rows = result.rows;

      // Agrupar por estudiante y calcular métricas SICIN
      const summaryByStudent: Record<string, {
        totalDays: number;
        totalLessonsTaught: number;
        presentLessons: number;
        present: number;
        unexcusedAbsences: number;
        excusedAbsences: number;
        unexcusedTardies: number;
        excusedTardies: number;
        totalPointsDeducted: number;
        attendancePercentage: number;
        calculatedAttendanceScore: number;
      }> = {};

      rows.forEach((r) => {
        if (!summaryByStudent[r.student_id]) {
          summaryByStudent[r.student_id] = {
            totalDays: 0,
            totalLessonsTaught: 0,
            presentLessons: 0,
            present: 0,
            unexcusedAbsences: 0,
            excusedAbsences: 0,
            unexcusedTardies: 0,
            excusedTardies: 0,
            totalPointsDeducted: 0,
            attendancePercentage: 100,
            calculatedAttendanceScore: 100,
          };
        }
        const s = summaryByStudent[r.student_id];
        s.totalDays++;
        const lessons = r.lessons_count ?? 2;
        s.totalLessonsTaught += lessons;
        const pts = r.points_deducted !== undefined ? Number(r.points_deducted) : calculatePointsDeduction(r.status, lessons);
        s.totalPointsDeducted += pts;

        if (r.status === 'present') {
          s.present++;
          s.presentLessons += lessons;
        } else if (r.status === 'absent' || r.status === 'absent_unexcused') {
          s.unexcusedAbsences += lessons;
        } else if (r.status === 'absent_excused' || r.status === 'excused') {
          s.excusedAbsences += lessons;
        } else if (r.status === 'late' || r.status === 'late_unexcused') {
          s.unexcusedTardies++;
          s.presentLessons += (lessons - 0.5);
        } else if (r.status === 'late_excused') {
          s.excusedTardies++;
          s.presentLessons += lessons;
        }
      });

      // Calcular porcentaje real y nota final de asistencia (Base 100 y sobre 10 pts)
      Object.values(summaryByStudent).forEach((s) => {
        const total = s.totalLessonsTaught || 1;
        const attended = Math.max(0, s.totalLessonsTaught - s.unexcusedAbsences - (s.unexcusedTardies * 0.5));
        s.attendancePercentage = Number(((attended / total) * 100).toFixed(1));
        s.calculatedAttendanceScore = Math.max(0, Number((100 - s.totalPointsDeducted).toFixed(2)));
      });

      res.json({ summary: summaryByStudent });
    } catch (e) { next(e); }
  },
};
