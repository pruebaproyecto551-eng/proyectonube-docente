import { Router } from 'express';
import { studentsController } from '../controllers/students.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const studentsRouter = Router();

studentsRouter.use(authMiddleware);

studentsRouter.get('/', studentsController.list);
studentsRouter.post('/batch', studentsController.createBatch);
studentsRouter.get('/:id', studentsController.get);
studentsRouter.post('/', studentsController.create);
studentsRouter.put('/:id', studentsController.update);
studentsRouter.delete('/:id', studentsController.remove);
