import { Router } from 'express';
import { submissionsController } from '../controllers/submissions.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const submissionsRouter = Router();

submissionsRouter.use(authMiddleware);

submissionsRouter.get('/assignments/:assignmentId/submissions', submissionsController.listByAssignment);
submissionsRouter.get('/submissions/student/:studentId', submissionsController.listByStudent);
submissionsRouter.post('/submissions', submissionsController.submit);
submissionsRouter.put('/submissions/:id/grade', submissionsController.grade);
