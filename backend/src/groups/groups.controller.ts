import { Request, Response } from 'express';
import { GroupsService } from './groups.service';
import { AuthRequest } from '../auth/auth.middleware';
import { MatchesService } from '../matches/matches.service';
import { generatePoolUrl, testPoolCode, testFullUrl, isFullUrl } from '../utils/poolCodeUtils';
import { z } from 'zod';

const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  poolCode: z.string().min(2).max(200).optional(), // Augmenté à 200 pour permettre les URLs
  ffvbSourceUrl: z.string().url().optional()
}).refine(
  (data) => data.poolCode || data.ffvbSourceUrl,
  {
    message: "Code de poule (format court) ou URL FFVB complète requis",
    path: ["poolCode"]
  }
);

const joinGroupSchema = z.object({
  inviteCode: z.string().min(1)
});

const transferLeadershipSchema = z.object({
  newLeaderId: z.string().min(1)
});

export class GroupsController {
  private groupsService = new GroupsService();
  private matchesService = new MatchesService();

  async createGroup(req: AuthRequest, res: Response) {
    try {
      const data = createGroupSchema.parse(req.body);
      const userId = req.userId!;
      
      // Si un code de poule est fourni, déterminer s'il s'agit d'une URL complète ou d'un code court
      let ffvbSourceUrl = data.ffvbSourceUrl;
      if (data.poolCode) {
        // Vérifier si c'est une URL complète ou un code court
        if (isFullUrl(data.poolCode)) {
          // URL complète (régionales/départementales)
          console.log('🔗 URL complète détectée, test en cours...');
          const testResult = await testFullUrl(data.poolCode);
          
          if (!testResult.success) {
            return res.status(400).json({
              code: 'POOL_NOT_FOUND',
              message: testResult.message || `Aucun match trouvé pour l'URL fournie. Vérifiez que l'URL est correcte et contient des matchs.`
            });
          }
          
          ffvbSourceUrl = testResult.url;
          console.log(`✅ URL complète valide : ${testResult.matchCount} match(s) trouvé(s)`);
        } else {
          // Code court (pro/nationale 3)
          console.log('🔢 Code court détecté, génération de l\'URL...');
          const testResult = await testPoolCode(data.poolCode);
          
          if (!testResult.success) {
            return res.status(400).json({
              code: 'POOL_NOT_FOUND',
              message: `Aucun match trouvé pour le code de poule "${data.poolCode}". Vérifiez que le code est correct (ex: 3mb, 2fc, msl). Pour les poules régionales/départementales, utilisez l'URL complète.`
            });
          }
          
          ffvbSourceUrl = testResult.url;
          console.log(`✅ Code de poule "${data.poolCode}" valide : ${testResult.matchCount} match(s) trouvé(s)`);
        }
      }
      
      // Si ffvbSourceUrl est fourni directement (sans poolCode), le tester aussi
      if (ffvbSourceUrl && !data.poolCode) {
        if (isFullUrl(ffvbSourceUrl)) {
          console.log('🔗 URL FFVB fournie directement, test en cours...');
          const testResult = await testFullUrl(ffvbSourceUrl);
          
          if (!testResult.success) {
            return res.status(400).json({
              code: 'POOL_NOT_FOUND',
              message: testResult.message || `Aucun match trouvé pour l'URL fournie. Vérifiez que l'URL est correcte et contient des matchs.`
            });
          }
          
          ffvbSourceUrl = testResult.url;
          console.log(`✅ URL FFVB valide : ${testResult.matchCount} match(s) trouvé(s)`);
        }
      }
      
      const group = await this.groupsService.createGroup({
        name: data.name,
        ffvbSourceUrl,
        userId
      });
      
      // Synchroniser automatiquement les matchs FFVB après la création du groupe
      if (group.ffvbSourceUrl) {
        try {
          await this.matchesService.syncFFVBMatches(group.id, userId);
        } catch (syncError) {
          // Ne pas faire échouer la création du groupe si la synchronisation échoue
          console.error('Erreur lors de la synchronisation FFVB après création du groupe:', syncError);
        }
      }
      
      res.status(201).json({
        code: 'SUCCESS',
        message: 'Groupe créé avec succès',
        data: group
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

  async joinGroup(req: AuthRequest, res: Response) {
    try {
      const data = joinGroupSchema.parse(req.body);
      const userId = req.userId!;
      
      const member = await this.groupsService.joinGroup({
        ...data,
        userId
      });
      
      res.json({
        code: 'SUCCESS',
        message: 'Groupe rejoint avec succès',
        data: member
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

  async getUserGroups(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const groups = await this.groupsService.getUserGroups(userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Groupes récupérés',
        data: groups
      });
    } catch (error) {
      res.status(500).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur serveur'
      });
    }
  }

  async getGroupById(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.userId!;
      
      const group = await this.groupsService.getGroupById(groupId, userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Groupe récupéré',
        data: group
      });
    } catch (error) {
      res.status(404).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Groupe non trouvé'
      });
    }
  }

  async leaveGroup(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId } = req.params;
      
      await this.groupsService.leaveGroup(groupId, userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Vous avez quitté le groupe avec succès'
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  async deleteGroup(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId } = req.params;
      
      await this.groupsService.deleteGroup(groupId, userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Groupe supprimé avec succès'
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  async regenerateInviteCode(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.userId!;
      
      const group = await this.groupsService.regenerateInviteCode(groupId, userId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Code d\'invitation régénéré',
        data: { inviteCode: group.inviteCode }
      });
    } catch (error) {
      res.status(403).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Droits insuffisants'
      });
    }
  }

  async transferLeadership(req: AuthRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.userId!;
      const data = transferLeadershipSchema.parse(req.body);
      
      await this.groupsService.transferLeadership(groupId, userId, data.newLeaderId);
      
      res.json({
        code: 'SUCCESS',
        message: 'Leadership transféré avec succès'
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
}
