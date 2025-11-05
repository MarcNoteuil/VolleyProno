import { Request, Response } from 'express';
import { MatchesService } from './matches.service';
import { AuthRequest } from '../auth/auth.middleware';
import { z } from 'zod';

const createMatchSchema = z.object({
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  startAt: z.string().datetime(),
  ffvbMatchId: z.string().optional(),
  setsHome: z.number().min(0).max(3).optional(),
  setsAway: z.number().min(0).max(3).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELED']).optional()
});

export class MatchesController {
  private matchesService = new MatchesService();

  async createMatch(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const data = createMatchSchema.parse(req.body);
      const userId = req.userId!;
      
      const match = await this.matchesService.createMatch({
        ...data,
        groupId,
        startAt: new Date(data.startAt)
      });
      
      res.status(201).json({
        code: 'SUCCESS',
        message: 'Match créé avec succès',
        data: match
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

  async getGroupMatches(req: AuthRequest, res: Response) {
    try {
      // Support pour les paramètres de route ET de query
      const groupId = req.params.groupId || req.query.groupId as string;
      const { status } = req.query;
      const userId = req.userId!;
      
      if (!groupId) {
        return res.status(400).json({
          code: 'ERROR',
          message: 'ID du groupe manquant'
        });
      }
      
      const matches = await this.matchesService.getGroupMatches(
        groupId, 
        userId, 
        status as string
      );
      
      res.json({
        code: 'SUCCESS',
        message: 'Matchs récupérés',
        data: matches
      });
    } catch (error) {
      res.status(404).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Groupe non trouvé'
      });
    }
  }

  async getMatchById(req: AuthRequest, res: Response) {
    try {
      const { matchId } = req.params;
      const userId = req.userId!;
      
      console.log(`🔍 Récupération du match ${matchId} pour l'utilisateur ${userId}`);
      
      const match = await this.matchesService.getMatchById(matchId, userId);
      
      console.log(`✅ Match trouvé: ${match.homeTeam} vs ${match.awayTeam}`);
      
      res.json({
        code: 'SUCCESS',
        message: 'Match récupéré',
        data: match
      });
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération du match ${req.params.matchId}:`, error);
      res.status(404).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Match non trouvé'
      });
    }
  }

  async updateMatch(req: AuthRequest, res: Response) {
    try {
      const { matchId } = req.params;
      const data = req.body;
      const userId = req.userId!;
      
      const match = await this.matchesService.updateMatch(matchId, data);
      
      res.json({
        code: 'SUCCESS',
        message: 'Match mis à jour',
        data: match
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  async syncFFVB(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.userId!;
      
      const result = await this.matchesService.syncFFVBMatches(groupId, userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Synchronisation FFVB',
        data: result
      });
    } catch (error) {
      res.status(403).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Droits insuffisants'
      });
    }
  }
}
