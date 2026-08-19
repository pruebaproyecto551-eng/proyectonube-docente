import { Router } from 'express';
import { googleRouter } from '../integrations/google/google.routes';
import { microsoftRouter } from '../integrations/microsoft/microsoft.routes';
import { googleConfigured } from '../integrations/google/google.service';
import { microsoftConfigured } from '../integrations/microsoft/microsoft.service';

export const integrationsRouter = Router();

integrationsRouter.get('/status', (_req, res) => {
  res.json({
    google: googleConfigured,
    microsoft: microsoftConfigured,
  });
});

integrationsRouter.use('/google', googleRouter);
integrationsRouter.use('/microsoft', microsoftRouter);
