import { Router } from 'express';
import { justificationsController } from '../controllers/justifications.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const justificationsRouter = Router();

// Endpoint público/autenticado para conteo y listado
justificationsRouter.get('/justifications/pending-count', justificationsController.getPendingCount);
justificationsRouter.get('/justifications', justificationsController.list);
justificationsRouter.get('/justifications/:id', justificationsController.findById);
justificationsRouter.post('/justifications', justificationsController.create);
justificationsRouter.patch('/justifications/:id/review', justificationsController.review);
justificationsRouter.delete('/justifications/:id', justificationsController.delete);
