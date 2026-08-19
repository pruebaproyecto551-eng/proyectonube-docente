import { Router } from 'express';
import {
  getMicrosoftAuthUrl,
  getMicrosoftUser,
  microsoftConfigured,
} from './microsoft.service';
import { loginWithMicrosoft } from '../../services/auth.service';

export const microsoftRouter = Router();

function getFrontendBase(req: any): string {
  const host = req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  return `${proto}://${host}`;
}

function frontendErrorUrl(req: any, error: string): string {
  const frontendUrl = getFrontendBase(req);
  const params = new URLSearchParams({ error, provider: 'microsoft' });
  return `${frontendUrl}/login?${params.toString()}`;
}

microsoftRouter.get('/login', async (req, res, next) => {
  try {
    const customEmail = (req.query.email as string) || 'teacher.diana@mep.go.cr';
    const customName = (req.query.name as string) || 'Teacher Diana (Microsoft 365)';

    if (!microsoftConfigured) {
      // Modo Resiliente / Simulación Cloud SSO
      const result = await loginWithMicrosoft({
        providerId: `ms_sub_${Date.now()}`,
        email: customEmail,
        name: customName,
      });
      const frontendUrl = getFrontendBase(req);
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      return res.redirect(`${frontendUrl}/auth/microsoft/callback?${params.toString()}`);
    }

    const url = await getMicrosoftAuthUrl();
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

microsoftRouter.get('/callback', async (req, res, next) => {
  try {
    const code = req.query.code;
    if (typeof code !== 'string' || !code) {
      return res.redirect(frontendErrorUrl(req, 'missing_code'));
    }
    if (!microsoftConfigured) {
      return res.redirect(frontendErrorUrl(req, 'not_configured'));
    }
    const microsoftUser = await getMicrosoftUser(code);
    const result = await loginWithMicrosoft({
      providerId: microsoftUser.providerId,
      email: microsoftUser.email,
      name: microsoftUser.name,
    });
    const frontendUrl = getFrontendBase(req);
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return res.redirect(`${frontendUrl}/auth/microsoft/callback?${params.toString()}`);
  } catch (error: any) {
    const message = error?.message ?? 'oauth_failed';
    return res.redirect(frontendErrorUrl(req, message));
  }
});
