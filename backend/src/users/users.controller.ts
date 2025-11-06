import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { UsersService } from './users.service';
import { z } from 'zod';

const updateProfileSchema = z.object({
  pseudo: z.string().min(2).max(50).optional().nullable(),
  firstName: z.string().min(1).max(50).optional().nullable(),
  lastName: z.string().min(1).max(50).optional().nullable(),
  avatar: z.string().optional().nullable(), // Peut être une URL ou base64
  favoriteTeam: z.string().min(1).max(100).optional().nullable(),
});

export class UsersController {
  private usersService = new UsersService();

  /**
   * Récupère le profil de l'utilisateur connecté
   */
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const profile = await this.usersService.getProfile(userId);

      res.json({
        code: 'SUCCESS',
        data: profile
      });
    } catch (error) {
      res.status(404).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération du profil'
      });
    }
  }

  /**
   * Met à jour le profil de l'utilisateur connecté
   */
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const data = updateProfileSchema.parse(req.body);

      // Convertir les chaînes vides en null pour permettre la suppression des champs
      const updateData = {
        pseudo: data.pseudo === '' ? null : data.pseudo,
        firstName: data.firstName === '' ? null : data.firstName,
        lastName: data.lastName === '' ? null : data.lastName,
        avatar: data.avatar === '' ? null : data.avatar,
        favoriteTeam: data.favoriteTeam === '' ? null : data.favoriteTeam,
      };

      const updatedProfile = await this.usersService.updateProfile(userId, updateData);

      res.json({
        code: 'SUCCESS',
        message: 'Profil mis à jour avec succès',
        data: updatedProfile
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
        message: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du profil'
      });
    }
  }

  /**
   * Supprime le compte de l'utilisateur connecté
   */
  async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      await this.usersService.deleteAccount(userId);

      res.json({
        code: 'SUCCESS',
        message: 'Compte supprimé avec succès'
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la suppression du compte'
      });
    }
  }
}

