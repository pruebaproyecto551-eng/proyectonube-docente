import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const attendanceRouter = Router();

attendanceRouter.use(authMiddleware);

attendanceRouter.get('/courses/:courseId/attendance', attendanceController.list);
attendanceRouter.get('/courses/:courseId/attendance/summary', attendanceController.summary);
attendanceRouter.post('/courses/:courseId/attendance', attendanceController.mark);
attendanceRouter.put('/attendance/:id', attendanceController.update);
