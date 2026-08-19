import { pool, testConnection, getLocalDb, saveLocalDb } from '../connection';
import crypto from 'crypto';

export const enrollmentQueries = {
  async enroll(courseId: string, studentId: string) {
    if (await testConnection()) {
      return pool.query(
        `INSERT INTO enrollments (course_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT (course_id, student_id) DO NOTHING`,
        [courseId, studentId]
      );
    }
    const db = getLocalDb();
    if (!db.enrollments.some((e) => e.course_id === courseId && e.student_id === studentId)) {
      db.enrollments.push({
        id: crypto.randomUUID(),
        course_id: courseId,
        student_id: studentId,
        enrolled_at: new Date().toISOString(),
      });
      saveLocalDb();
    }
    return { rows: [], rowCount: 1 };
  },

  async unenroll(courseId: string, studentId: string) {
    if (await testConnection()) {
      return pool.query(
        'DELETE FROM enrollments WHERE course_id = $1 AND student_id = $2',
        [courseId, studentId]
      );
    }
    const db = getLocalDb();
    db.enrollments = db.enrollments.filter(
      (e) => !(e.course_id === courseId && e.student_id === studentId)
    );
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },

  async setSingleEnrollment(studentId: string, courseId: string) {
    if (await testConnection()) {
      await pool.query('DELETE FROM enrollments WHERE student_id = $1', [studentId]);
      return pool.query(
        `INSERT INTO enrollments (course_id, student_id) VALUES ($1, $2)`,
        [courseId, studentId]
      );
    }
    const db = getLocalDb();
    if (!db.enrollments) db.enrollments = [];
    // Desmatricular de cursos anteriores
    db.enrollments = db.enrollments.filter((e) => e.student_id !== studentId);
    // Matricular en el curso único
    db.enrollments.push({
      id: crypto.randomUUID(),
      course_id: courseId,
      student_id: studentId,
      enrolled_at: new Date().toISOString(),
    });
    saveLocalDb();
    return { rows: [], rowCount: 1 };
  },

  async listCoursesByStudent(studentId: string) {
    if (await testConnection()) {
      return pool.query(
        `SELECT c.* FROM courses c
         JOIN enrollments e ON e.course_id = c.id
         WHERE e.student_id = $1
         ORDER BY c.name`,
        [studentId]
      );
    }
    const db = getLocalDb();
    if (!db.enrollments) db.enrollments = [];
    const courseIds = db.enrollments
      .filter((e) => e.student_id === studentId)
      .map((e) => e.course_id);
    const rows = db.courses.filter((c) => courseIds.includes(c.id));
    return { rows, rowCount: rows.length };
  },

  async listStudentsInCourse(courseId: string) {
    if (await testConnection()) {
      return pool.query(
        `SELECT s.id, s.user_id, s.student_number, s.grade_level, u.full_name, u.email
         FROM enrollments e
         JOIN students s ON s.id = e.student_id
         JOIN users u ON u.id = s.user_id
         WHERE e.course_id = $1
         ORDER BY u.full_name`,
        [courseId]
      );
    }
    const db = getLocalDb();
    if (!db.enrollments) db.enrollments = [];
    const enrolledIds = db.enrollments
      .filter((e) => e.course_id === courseId)
      .map((e) => e.student_id);
    
    // Si no hay alumnos en enrollment, por practicidad listamos estudiantes con ese nivel
    const studentsToReturn = enrolledIds.length > 0 
      ? db.students.filter((s) => enrolledIds.includes(s.id))
      : db.students.filter((s) => {
          const course = db.courses.find((c) => c.id === courseId);
          return s.grade_level === course?.name;
        });

    const rows = studentsToReturn.map((s) => {
      const u = db.users.find((x) => x.id === s.user_id);
      return {
        id: s.id,
        user_id: s.user_id,
        student_number: s.student_number,
        grade_level: s.grade_level,
        full_name: u?.full_name ?? 'Estudiante MEP',
        email: u?.email ?? 'estudiante@mep.go.cr',
      };
    }).sort((a, b) => a.full_name.localeCompare(b.full_name));

    return { rows, rowCount: rows.length };
  },
};
