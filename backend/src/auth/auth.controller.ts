import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  pseudo: z.string().min(3).max(20),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

const requestPasswordResetSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6)
});

export class AuthController {
  private authService = new AuthService();

  async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);
      const user = await this.authService.register(data);
      
      res.status(201).json({
        code: 'SUCCESS',
        message: 'Utilisateur créé avec succès',
        data: user
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: error.errors
        });
      }
      
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await this.authService.login(data);
      
      res.json({
        code: 'SUCCESS',
        message: 'Connexion réussie',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: error.errors
        });
      }
      
      res.status(401).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur de connexion'
      });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await this.authService.refreshToken(refreshToken);
      
      res.json({
        code: 'SUCCESS',
        message: 'Token rafraîchi',
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: error.errors
        });
      }
      
      res.status(401).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Token invalide'
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    try {
      const data = requestPasswordResetSchema.parse(req.body);
      const result = await this.authService.requestPasswordReset(data.email);
      
      res.json({
        code: 'SUCCESS',
        message: result.message,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: error.errors
        });
      }
      
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la demande de réinitialisation'
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const data = resetPasswordSchema.parse(req.body);
      const result = await this.authService.resetPassword(data.token, data.password);
      
      res.json({
        code: 'SUCCESS',
        message: result.message,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: error.errors
        });
      }
      
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la réinitialisation du mot de passe'
      });
    }
  }
}
