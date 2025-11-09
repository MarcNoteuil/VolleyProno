import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

export interface AdminRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const adminMiddleware = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Token manquant'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Accès refusé - Rôle admin requis'
      });
    }

    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Erreur middleware admin:', error);
    res.status(500).json({
      code: 'ERROR',
      message: 'Erreur lors de la vérification des permissions'
    });
  }
};



