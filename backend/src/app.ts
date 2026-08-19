import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rate-limit.middleware';
import { authRouter } from './routes/auth.routes';
import { studentsRouter } from './routes/students.routes';
import { coursesRouter } from './routes/courses.routes';
import { gradesRouter } from './routes/grades.routes';
import { attendanceRouter } from './routes/attendance.routes';
import { integrationsRouter } from './routes/integrations.routes';
import { aiRouter } from './routes/ai.routes';
import { announcementsRouter } from './routes/announcements.routes';
import { submissionsRouter } from './routes/submissions.routes';
import { justificationsRouter } from './routes/justifications.routes';
import { documentsRouter } from './routes/documents.routes';

export function createApp() {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: false,
  }));
  
  app.use(
    cors({
      origin: true, // Refleja el origen del navegador (http://localhost:5173, etc.) permitiendo credentials: true sin error CORS
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );
  app.use(express.json({ limit: '20mb' }));
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  app.get('/health', (_req, res) => res.json({ 
    status: 'ok', 
    service: 'Portal Docente Integrado MEP API',
    cloudPlatform: 'PaaS (Docker / Railway / Render)',
    timestamp: new Date().toISOString(),
  }));

  app.use('/api', apiLimiter);
  // Rutas públicas de autenticación y SSO Cloud
  app.use('/api/auth', authRouter);
  app.use('/api/integrations', integrationsRouter);

  // Rutas protegidas de gestión docente y estudiantil
  app.use('/api/students', studentsRouter);
  app.use('/api/courses', coursesRouter);
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api', submissionsRouter);
  app.use('/api', gradesRouter);
  app.use('/api', attendanceRouter);
  app.use('/api', justificationsRouter);
  app.use('/api', documentsRouter);

  app.use(errorMiddleware);

  // Servir frontend compilado en la raíz para máxima estabilidad (PaaS / Railway / Local)
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  const publicPath = path.resolve(__dirname, '../public');
  const staticPath = fs.existsSync(frontendDistPath)
    ? frontendDistPath
    : fs.existsSync(publicPath)
    ? publicPath
    : null;

  if (staticPath) {
    app.use(express.static(staticPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') {
        return next();
      }
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  return app;
}
