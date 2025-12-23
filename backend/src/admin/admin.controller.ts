import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { z } from 'zod';

const createMatchSchema = z.object({
  groupId: z.string(),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  homeTeamLogo: z.string().url().optional(),
  awayTeamLogo: z.string().url().optional(),
  startAt: z.string().datetime(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELED']).optional()
});

const updateMatchSchema = z.object({
  homeTeam: z.string().min(1).optional(),
  awayTeam: z.string().min(1).optional(),
  homeTeamLogo: z.string().url().optional(),
  awayTeamLogo: z.string().url().optional(),
  startAt: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELED']).optional(),
  setsHome: z.number().min(0).max(3).optional(),
  setsAway: z.number().min(0).max(3).optional()
});

export class AdminController {
  // Créer un match
  async createMatch(req: Request, res: Response) {
    try {
      const data = createMatchSchema.parse(req.body);
      
      const match = await prisma.match.create({
        data: {
          ...data,
          startAt: new Date(data.startAt)
        },
        include: {
          group: true,
          predictions: {
            include: {
              user: {
                select: {
                  id: true,
                  pseudo: true
                }
              }
            }
          }
        }
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
        message: error instanceof Error ? error.message : 'Erreur lors de la création du match'
      });
    }
  }

  // Mettre à jour un match
  async updateMatch(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      const data = updateMatchSchema.parse(req.body);
      
      // Vérifier si le match existe
      const existingMatch = await prisma.match.findUnique({
        where: { id: matchId }
      });

      if (!existingMatch) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Match non trouvé'
        });
      }

      // Vérifier si on peut modifier le score (seulement après la date/heure)
      const now = new Date();
      const matchDate = new Date(existingMatch.startAt);
      
      if (data.setsHome !== undefined || data.setsAway !== undefined) {
        if (now < matchDate) {
          return res.status(400).json({
            code: 'ERROR',
            message: 'Impossible de modifier le score avant la date/heure du match'
          });
        }
      }

      const updateData: any = { ...data };
      if (data.startAt) {
        updateData.startAt = new Date(data.startAt);
      }

      const match = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
        include: {
          group: true,
          predictions: {
            include: {
              user: {
                select: {
                  id: true,
                  pseudo: true
                }
              }
            }
          }
        }
      });

      res.json({
        code: 'SUCCESS',
        message: 'Match mis à jour avec succès',
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
        message: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du match'
      });
    }
  }

  // Supprimer un match
  async deleteMatch(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          predictions: true
        }
      });

      if (!match) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Match non trouvé'
        });
      }

      // Supprimer les prédictions associées
      await prisma.prediction.deleteMany({
        where: { matchId }
      });

      // Supprimer le match
      await prisma.match.delete({
        where: { id: matchId }
      });

      res.json({
        code: 'SUCCESS',
        message: 'Match supprimé avec succès'
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la suppression du match'
      });
    }
  }

  // Lister tous les matchs
  async getAllMatches(req: Request, res: Response) {
    try {
      const { groupId, status } = req.query;
      
      const where: any = {};
      if (groupId) where.groupId = groupId;
      if (status) where.status = status;

      const matches = await prisma.match.findMany({
        where,
        include: {
          group: {
            select: {
              id: true,
              name: true
            }
          },
          predictions: {
            include: {
              user: {
                select: {
                  id: true,
                  pseudo: true
                }
              }
            }
          }
        },
        orderBy: {
          startAt: 'asc'
        }
      });

      res.json({
        code: 'SUCCESS',
        message: 'Matchs récupérés',
        data: matches
      });
    } catch (error) {
      res.status(400).json({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération des matchs'
      });
    }
  }
}





