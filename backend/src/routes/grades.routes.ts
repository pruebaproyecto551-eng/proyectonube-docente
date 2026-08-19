import { Router } from 'express';
import {
  assignmentsController,
  gradesController,
} from '../controllers/grades.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const gradesRouter = Router();

gradesRouter.use(authMiddleware);

// Assignments dentro de un curso
gradesRouter.get('/courses/:courseId/assignments', assignmentsController.list);
gradesRouter.post('/courses/:courseId/assignments', assignmentsController.create);
gradesRouter.put('/assignments/:id', assignmentsController.update);
gradesRouter.delete('/assignments/:id', assignmentsController.remove);

// Grades dentro de un curso
gradesRouter.get('/courses/:courseId/grades', gradesController.list);
gradesRouter.post('/courses/:courseId/grades', gradesController.create);
gradesRouter.put('/grades/:id', gradesController.update);
gradesRouter.delete('/grades/:id', gradesController.remove);
