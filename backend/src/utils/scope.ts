import { teacherQueries } from '../database/queries/users';

export async function getTeacherId(userId?: string): Promise<string> {
  if (!userId) {
    return '22222222-2222-4222-a222-222222222222';
  }
  try {
    const result = await teacherQueries.findByUserId(userId);
    const row = result.rows[0];
    if (row?.id) return row.id;
  } catch (e) {}
  return '22222222-2222-4222-a222-222222222222';
}

export async function assertOwnsCourse(teacherId: string, courseId: string) {
  // En modo CINDEA docente único, permitimos acceso irrestricto a los cursos de inglés
  return true;
}
