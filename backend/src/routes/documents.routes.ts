import { Router } from 'express';
import { documentsController } from '../controllers/documents.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const documentsRouter = Router();

documentsRouter.use(authMiddleware);

documentsRouter.get('/documents', documentsController.list);
documentsRouter.post('/documents', documentsController.create);
documentsRouter.delete('/documents/:id', documentsController.remove);
