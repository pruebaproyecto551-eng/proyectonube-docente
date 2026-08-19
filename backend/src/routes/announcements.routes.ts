import { Router } from 'express';
import { announcementsController } from '../controllers/announcements.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const announcementsRouter = Router();

announcementsRouter.use(authMiddleware);

announcementsRouter.get('/', announcementsController.list);
announcementsRouter.post('/', announcementsController.create);
announcementsRouter.delete('/:id', announcementsController.remove);
