import { Request, Response } from 'express';
import { PredictionsService } from './predictions.service';
import { AuthRequest } from '../auth/auth.middleware';
import { z } from 'zod';

const setScoreSchema = z.object({
  home: z.number().int().min(0).max(50),
  away: z.number().int().min(0).max(50)
});

const predictionSchema = z.object({
  predictedHome: z.number().int().min(0).max(3),
  predictedAway: z.number().int().min(0).max(3),
  predictedSetScores: z.array(setScoreSchema).optional(),
  isRisky: z.boolean().optional()
});

export class PredictionsController {
  private predictionsService = new PredictionsService();

  async createOrUpdatePrediction(req: AuthRequest, res: Response) {
    try {
      const { matchId } = req.params;
      const data = predictionSchema.parse(req.body);
      const userId = req.userId!;
      
      const prediction = await this.predictionsService.createOrUpdatePrediction({
        ...data,
        userId,
        matchId
      });
      
      res.json({
        code: 'SUCCESS',
        message: 'Pronostic enregistré',
        data: prediction
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

  async getUserPredictions(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.userId!;
      
      const predictions = await this.predictionsService.getUserPredictions(userId, groupId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Pronostics récupérés',
        data: predictions
      });
    } catch (error) {
      res.status(404).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Groupe non trouvé'
      });
    }
  }

  async getMatchPredictions(req: AuthRequest, res: Response) {
    try {
      const { matchId } = req.params;
      const userId = req.userId!;
      
      // Si matchId est dans query, c'est pour obtenir le pronostic de l'utilisateur uniquement
      const queryMatchId = req.query.matchId as string;
      if (queryMatchId) {
        const prediction = await this.predictionsService.getUserPredictionForMatch(queryMatchId, userId);
        return res.json({
          code: 'SUCCESS',
          message: 'Pronostic récupéré',
          data: prediction ? [prediction] : []
        });
      }
      
      const predictions = await this.predictionsService.getMatchPredictions(matchId, userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Pronostics du match récupérés',
        data: predictions
      });
    } catch (error) {
      res.status(404).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Match non trouvé'
      });
    }
  }

  async updatePrediction(req: AuthRequest, res: Response) {
    try {
      const { predictionId } = req.params;
      const data = predictionSchema.parse(req.body);
      const userId = req.userId!;
      
      // Vérifier que le pronostic appartient à l'utilisateur
      const prediction = await this.predictionsService.getPredictionById(predictionId, userId);
      
      const updated = await this.predictionsService.updatePrediction(predictionId, {
        ...data,
        userId
      });
      
      res.json({
        code: 'SUCCESS',
        message: 'Pronostic modifié',
        data: updated
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

  async calculatePoints(req: AuthRequest, res: Response) {
    try {
      const { matchId } = req.params;
      
      const count = await this.predictionsService.calculatePointsForMatch(matchId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Points calculés',
        data: { predictionsUpdated: count }
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur de calcul'
      });
    }
  }

  async getAllUserPredictions(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      
      const predictions = await this.predictionsService.getAllUserPredictions(userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Pronostics récupérés',
        data: predictions
      });
    } catch (error) {
      res.status(500).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération des pronostics'
      });
    }
  }

  async checkRiskyModeCooldown(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId } = req.params;
      
      const cooldown = await this.predictionsService.canUseRiskyMode(userId, groupId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Cooldown vérifié',
        data: cooldown
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la vérification du cooldown'
      });
    }
  }

  async deletePredictions(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { predictionIds } = req.body;

      if (!Array.isArray(predictionIds) || predictionIds.length === 0) {
        return res.status(400).json({
          code: 'ERROR',
          message: 'Liste de pronostics invalide'
        });
      }

      const result = await this.predictionsService.deletePredictions(predictionIds, userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Pronostics supprimés',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la suppression'
      });
    }
  }

  async getPredictionsSinceLastLogin(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      
      const result = await this.predictionsService.getPredictionsSinceLastLogin(userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Pronostics récupérés',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération'
      });
    }
  }

  async markPredictionsAsViewed(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { predictionIds } = req.body;

      if (!Array.isArray(predictionIds)) {
        return res.status(400).json({
          code: 'ERROR',
          message: 'predictionIds doit être un tableau'
        });
      }

      await this.predictionsService.markPredictionsAsViewed(userId, predictionIds);
      
      res.json({
        code: 'SUCCESS',
        message: 'Pronostics marqués comme vus'
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors du marquage'
      });
    }
  }
}
