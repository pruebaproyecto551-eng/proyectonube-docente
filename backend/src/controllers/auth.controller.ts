import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  registerTeacher,
  loginWithPassword,
  rotateRefreshToken,
  logoutWithRefreshToken,
  changeUserPassword,
} from '../services/auth.service';
import { userQueries, toPublicUser } from '../database/queries/users';
import type { AuthRequest } from '../middleware/auth.middleware';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().optional(),
  cedula: z.string().optional(),
  identifier: z.string().optional(),
  password: z.string().optional().default(''),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await registerTeacher(data);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const targetId = data.identifier || data.cedula || data.email;
      if (!targetId) {
        return res.status(400).json({ error: 'Debes ingresar tu correo institucional o número de Cédula/DIMEX' });
      }
      const result = await loginWithPassword(targetId, data.password);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await rotateRefreshToken(refreshToken);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
      if (refreshToken) await logoutWithRefreshToken(refreshToken);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.json({ user: null });
      const result = await userQueries.findById(req.user.id);
      const user = result.rows[0];
      if (!user || !user.is_active) {
        return res.json({ user: null });
      }
      res.json({ user: toPublicUser(user) });
    } catch (e) {
      next(e);
    }
  },

  async getStudentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const cedula = typeof req.query.cedula === 'string' ? req.query.cedula.trim() : '';
      if (!cedula) {
        return res.json({ exists: false, mustChangePassword: true });
      }
      const { studentQueries } = await import('../database/queries/students');
      const studentRes = await studentQueries.findByCedulaOrStudentNumber(cedula);
      const student = studentRes.rows[0];
      if (!student) {
        return res.json({ exists: false, mustChangePassword: true });
      }
      const userRes = await userQueries.findById(student.user_id);
      const user = userRes.rows[0];
      const mustChange = user ? (user.must_change_password ?? true) : true;
      res.json({
        exists: true,
        mustChangePassword: mustChange,
        name: student.full_name ? student.full_name.split(' ')[0] : undefined,
      });
    } catch (e) {
      next(e);
    }
  },

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autenticado' });
      }
      const { newPassword } = req.body;
      if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      }
      const result = await changeUserPassword(req.user.id, newPassword);
      res.json({ message: 'Contraseña actualizada con éxito', user: result.user });
    } catch (e) {
      next(e);
    }
  },
};
