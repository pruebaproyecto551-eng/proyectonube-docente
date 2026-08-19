import { Router } from 'express';
import { getGoogleAuthUrl, getGoogleUser, googleConfigured } from './google.service';
import { loginWithGoogle } from '../../services/auth.service';

export const googleRouter = Router();

function getFrontendBase(req: any): string {
  const host = req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  return `${proto}://${host}`;
}

function frontendErrorUrl(req: any, error: string): string {
  const frontendUrl = getFrontendBase(req);
  const params = new URLSearchParams({ error, provider: 'google' });
  return `${frontendUrl}/login?${params.toString()}`;
}

googleRouter.get('/login', async (req, res, next) => {
  try {
    const customEmail = (req.query.email as string) || 'teacher.diana@gmail.com';
    const customName = (req.query.name as string) || 'Teacher Diana (Google Workspace)';

    if (!googleConfigured) {
      // Modo Resiliente / Simulación Cloud SSO
      const result = await loginWithGoogle({
        providerId: `google_sub_${Date.now()}`,
        email: customEmail,
        name: customName,
      });
      const frontendUrl = getFrontendBase(req);
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      return res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
    }

    const url = await getGoogleAuthUrl();
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

googleRouter.get('/callback', async (req, res, next) => {
  try {
    const code = req.query.code;
    if (typeof code !== 'string' || !code) {
      return res.redirect(frontendErrorUrl(req, 'missing_code'));
    }
    if (!googleConfigured) {
      return res.redirect(frontendErrorUrl(req, 'not_configured'));
    }
    const googleUser = await getGoogleUser(code);
    const result = await loginWithGoogle({
      providerId: googleUser.providerId,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture || undefined,
    });
    const frontendUrl = getFrontendBase(req);
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
  } catch (error: any) {
    const message = error?.message ?? 'oauth_failed';
    return res.redirect(frontendErrorUrl(req, message));
  }
});

import {
  listRealCalendarEvents,
  createRealCalendarEvent,
  deleteRealCalendarEvent,
} from './google.service';

googleRouter.get('/calendar/events', async (req, res, next) => {
  try {
    const email = (req.query.email as string) || 'pruebaproyecto551@gmail.com';
    const events = await listRealCalendarEvents(email);
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

googleRouter.post('/calendar/events', async (req, res, next) => {
  try {
    const email = (req.body.email as string) || 'pruebaproyecto551@gmail.com';
    const event = await createRealCalendarEvent(email, req.body);
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
});

googleRouter.delete('/calendar/events/:id', async (req, res, next) => {
  try {
    const email = (req.query.email as string) || 'pruebaproyecto551@gmail.com';
    const ok = await deleteRealCalendarEvent(email, req.params.id);
    res.json({ success: ok });
  } catch (err) {
    next(err);
  }
});

