import { Router } from 'express';
import { coursesController } from '../controllers/courses.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { enrollmentsController } from '../controllers/enrollments.controller';

export const coursesRouter = Router();

coursesRouter.use(authMiddleware);

coursesRouter.get('/', coursesController.list);
coursesRouter.get('/:id', coursesController.get);
coursesRouter.post('/', coursesController.create);
coursesRouter.put('/:id', coursesController.update);
coursesRouter.delete('/:id', coursesController.remove);

// Matrículas
coursesRouter.post('/:courseId/students/:studentId', enrollmentsController.enroll);
coursesRouter.delete('/:courseId/students/:studentId', enrollmentsController.unenroll);
coursesRouter.get('/:courseId/students', enrollmentsController.listStudents);
