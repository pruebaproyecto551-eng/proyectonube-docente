import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../database/connection';
import { userQueries, toPublicUser } from '../database/queries/users';
import { studentQueries, toStudentDTO } from '../database/queries/students';
import { getTeacherId } from '../utils/scope';
import { param } from '../utils/http';
import type { AuthRequest } from '../middleware/auth.middleware';

const createSchema = z.object({
  fullName: z.string().min(2),
  studentNumber: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string().optional().default('student123'),
  gradeLevel: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  guardianName: z.string().nullable().optional(),
  guardianPhone: z.string().nullable().optional(),
  courseId: z.string().optional(),
});

const updateSchema = z.object({
  fullName: z.string().optional(),
  studentNumber: z.string().nullable().optional(),
  gradeLevel: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  guardianName: z.string().nullable().optional(),
  guardianPhone: z.string().nullable().optional(),
  courseId: z.string().optional(),
});

export const studentsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const result = await studentQueries.listEnrolledInTeacherCourses(teacherId);
      const db = (await import('../database/connection')).getLocalDb();
      const studentsWithNames = result.rows.map((s) => {
        const u = db.users.find((user) => user.id === s.user_id);
        const enrollment = db.enrollments?.find((e) => e.student_id === s.id);
        const course = enrollment ? db.courses.find((c) => c.id === enrollment.course_id) : null;
        return {
          ...toStudentDTO(s),
          fullName: u?.full_name || 'Estudiante',
          email: u?.email || '',
          courseId: course?.id || null,
          courseName: course?.name || s.grade_level || 'Sin asignar',
        };
      });
      res.json({ students: studentsWithNames });
    } catch (e) { next(e); }
  },

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const student = await studentQueries.findById(id);
      const s = student.rows[0];
      if (!s) return res.status(404).json({ error: 'Student not found' });
      res.json({ student: toStudentDTO(s) });
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createSchema.parse(req.body);
      const cleanNumber = (data.studentNumber || '').replace(/[^0-9a-zA-Z]/g, '');
      const studentEmail = data.email || `${cleanNumber || 'estudiante' + Math.floor(1000 + Math.random() * 9000)}@est.mep.go.cr`;
      const plainPassword = data.password || 'student123';

      let gradeLevelName = data.gradeLevel;
      if (data.courseId && !gradeLevelName) {
        const { courseQueries } = await import('../database/queries/courses');
        const courseRes = await courseQueries.findById(data.courseId);
        if (courseRes.rows[0]) {
          gradeLevelName = courseRes.rows[0].name;
        }
      }

      const exists = await userQueries.findByEmail(studentEmail);
      let targetUser: any;

      if (exists.rowCount && exists.rowCount > 0) {
        targetUser = exists.rows[0];
        const stExists = await studentQueries.findByCedulaOrStudentNumber(data.studentNumber);
        if (stExists.rowCount && stExists.rowCount > 0) {
          const existingStudent = stExists.rows[0];
          const updated = await studentQueries.update(existingStudent.id, {
            gradeLevel: gradeLevelName ?? existingStudent.grade_level,
            guardianPhone: data.guardianPhone ?? existingStudent.guardian_phone,
          });
          if (data.courseId) {
            const { enrollmentQueries } = await import('../database/queries/enrollments');
            await enrollmentQueries.setSingleEnrollment(existingStudent.id, data.courseId).catch(() => {});
          }
          return res.status(200).json({
            student: {
              ...toStudentDTO(updated.rows[0] || existingStudent),
              fullName: targetUser.full_name || data.fullName,
              email: targetUser.email,
              courseId: data.courseId || null,
              courseName: gradeLevelName || null,
            },
            user: toPublicUser(targetUser),
          });
        }
      } else {
        const passwordHash = await bcrypt.hash(plainPassword, 10);
        const userRes = await userQueries.create(studentEmail, passwordHash, data.fullName, 'student');
        targetUser = userRes.rows[0];
      }

      const studentRes = await studentQueries.create(pool, {
        userId: targetUser.id,
        studentNumber: data.studentNumber,
        gradeLevel: gradeLevelName ?? 'Inglés 10° Año (Módulo III)',
        birthDate: data.birthDate ?? null,
        guardianName: data.guardianName ?? null,
        guardianPhone: data.guardianPhone ?? null,
      });
      const newStudent = studentRes.rows[0];

      if (data.courseId) {
        const { enrollmentQueries } = await import('../database/queries/enrollments');
        await enrollmentQueries.setSingleEnrollment(newStudent.id, data.courseId).catch(() => {});
      }

      res.status(201).json({
        student: {
          ...toStudentDTO(newStudent),
          fullName: targetUser.full_name || data.fullName,
          email: targetUser.email,
          courseId: data.courseId || null,
          courseName: gradeLevelName || null,
        },
        user: toPublicUser(targetUser),
      });
    } catch (e) { next(e); }
  },

  async createBatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { students: rawList, courseId } = req.body;
      if (!Array.isArray(rawList) || rawList.length === 0) {
        return res.status(400).json({ error: 'La lista de estudiantes está vacía' });
      }

      const results = [];
      const db = (await import('../database/connection')).getLocalDb();
      const crypto = await import('crypto');

      for (const item of rawList) {
        if (!item.fullName || !item.studentNumber) continue;
        const cleanNumber = item.studentNumber.replace(/[^0-9a-zA-Z]/g, '');
        const studentEmail = item.email || `${cleanNumber}@est.mep.go.cr`;
        
        let existingUser = db.users.find((u) => u.email === studentEmail);
        let studentRecord: any = null;

        if (existingUser) {
          existingUser.full_name = item.fullName;
          studentRecord = db.students.find((s) => s.user_id === existingUser!.id);
          if (!studentRecord) {
            studentRecord = {
              id: crypto.randomUUID(),
              user_id: existingUser.id,
              student_number: item.studentNumber,
              grade_level: item.gradeLevel || '10° Año',
              birth_date: null,
              guardian_name: item.guardianName || null,
              guardian_phone: item.guardianPhone || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            db.students.push(studentRecord);
          } else {
            studentRecord.student_number = item.studentNumber;
            if (item.gradeLevel) studentRecord.grade_level = item.gradeLevel;
          }
        } else {
          const passwordHash = await bcrypt.hash('student123', 10);
          const newUser: any = {
            id: crypto.randomUUID(),
            email: studentEmail,
            password_hash: passwordHash,
            full_name: item.fullName,
            role: 'student',
            avatar_url: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          db.users.push(newUser);

          studentRecord = {
            id: crypto.randomUUID(),
            user_id: newUser.id,
            student_number: item.studentNumber,
            grade_level: item.gradeLevel || '10° Año',
            birth_date: null,
            guardian_name: item.guardianName || null,
            guardian_phone: item.guardianPhone || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          db.students.push(studentRecord);
        }

        // Resolver curso destino (específico del alumno, o general, o auto-detectado por nivel)
        let targetCourseId = item.courseId;
        if (!targetCourseId && courseId && courseId !== 'auto') {
          targetCourseId = courseId;
        }
        if (!targetCourseId && item.gradeLevel && Array.isArray(db.courses)) {
          const clean = (item.gradeLevel || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (clean.includes('11') || clean.includes('bachillerato') || clean.includes('modulo v') || clean.includes('modulo 5')) {
            targetCourseId = db.courses.find((c) => (c.name || '').includes('11') || (c.code || '').includes('11') || (c.name || '').toLowerCase().includes('bachillerato'))?.id;
          } else if (clean.includes('10') || clean.includes('modulo iv') || clean.includes('modulo 4') || clean.includes('diversificada')) {
            targetCourseId = db.courses.find((c) => (c.name || '').includes('10') || (c.code || '').includes('10'))?.id;
          } else if (clean.includes('9') || clean.includes('modulo iii') || clean.includes('modulo 3') || clean.includes('tercer ciclo')) {
            targetCourseId = db.courses.find((c) => (c.name || '').includes('9') || (c.code || '').includes('9'))?.id;
          } else if (clean.includes('7') || clean.includes('8') || clean.includes('modulo i') || clean.includes('modulo ii') || clean.includes('basico')) {
            targetCourseId = db.courses.find((c) => (c.name || '').includes('7') || (c.name || '').includes('8') || (c.code || '').includes('7'))?.id;
          }
        }

        if (targetCourseId && studentRecord) {
          // Si ya tenía matrícula anterior, desvincularla para no duplicar
          db.enrollments = db.enrollments.filter((e) => e.student_id !== studentRecord.id);
          db.enrollments.push({
            id: crypto.randomUUID(),
            course_id: targetCourseId,
            student_id: studentRecord.id,
            enrolled_at: new Date().toISOString(),
          });
        }
        results.push(studentRecord);
      }

      (await import('../database/connection')).saveLocalDb();
      res.status(201).json({
        createdCount: results.length,
        message: `Se registraron y matricularon ${results.length} estudiantes con éxito.`,
      });
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = await getTeacherId(req.user!.id);
      const id = param(req, 'id');
      const data = updateSchema.parse(req.body);

      if (data.courseId) {
        const { enrollmentQueries } = await import('../database/queries/enrollments');
        const { courseQueries } = await import('../database/queries/courses');
        await enrollmentQueries.setSingleEnrollment(id, data.courseId).catch(() => {});
        if (!data.gradeLevel) {
          const courseRes = await courseQueries.findById(data.courseId);
          if (courseRes.rows[0]) {
            data.gradeLevel = courseRes.rows[0].name;
          }
        }
      }

      const result = await studentQueries.update(id, data);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
      res.json({ student: toStudentDTO(result.rows[0]) });
    } catch (e) { next(e); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = param(req, 'id');
      const studentRes = await studentQueries.findById(id);
      if (studentRes.rowCount === 0) {
        return res.status(404).json({ error: 'Estudiante no encontrado' });
      }
      await studentQueries.delete(id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
};
