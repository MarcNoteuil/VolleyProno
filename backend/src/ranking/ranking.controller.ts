import { Request, Response } from 'express';
import { RankingService } from './ranking.service';
import { AuthRequest } from '../auth/auth.middleware';

export class RankingController {
  private rankingService = new RankingService();

  async getGroupRanking(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.userId!;
      
      const ranking = await this.rankingService.getGroupRanking(groupId, userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Classement récupéré',
        data: ranking
      });
    } catch (error) {
      res.status(404).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Groupe non trouvé'
      });
    }
  }

  async getUserStats(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.userId!;
      
      const stats = await this.rankingService.getUserStats(userId, groupId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Statistiques utilisateur récupérées',
        data: stats
      });
    } catch (error) {
      res.status(404).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Groupe non trouvé'
      });
    }
  }

  async getGlobalRanking(req: AuthRequest, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const ranking = await this.rankingService.getGlobalRanking(limit);
      
      res.json({
        code: 'SUCCESS',
        message: 'Classement global récupéré',
        data: ranking
      });
    } catch (error) {
      res.status(500).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération du classement'
      });
    }
  }
}
