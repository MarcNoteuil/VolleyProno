import { prisma } from '../db/prisma';

export interface UpdateProfileData {
  pseudo?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  favoriteTeam?: string;
}

export class UsersService {
  /**
   * Récupère le profil complet d'un utilisateur
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        pseudo: true,
        firstName: true,
        lastName: true,
        avatar: true,
        favoriteTeam: true,
        role: true,
        createdAt: true,
      }
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return user;
  }

  /**
   * Met à jour le profil d'un utilisateur
   */
  async updateProfile(userId: string, data: UpdateProfileData) {
    // Si le pseudo est modifié, vérifier qu'il n'est pas déjà utilisé (sensible à la casse)
    // "Lrd" et "lrd" sont considérés comme différents, mais "Lrd" et "Lrd" sont identiques
    if (data.pseudo !== undefined && data.pseudo !== null) {
      const existingUser = await prisma.user.findFirst({
        where: {
          pseudo: data.pseudo,
          id: { not: userId }
        }
      });

      if (existingUser) {
        throw new Error('Ce pseudo est déjà utilisé');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        pseudo: data.pseudo !== undefined ? data.pseudo : undefined,
        firstName: data.firstName !== undefined ? data.firstName : undefined,
        lastName: data.lastName !== undefined ? data.lastName : undefined,
        avatar: data.avatar !== undefined ? data.avatar : undefined,
        favoriteTeam: data.favoriteTeam !== undefined ? data.favoriteTeam : undefined,
      },
      select: {
        id: true,
        email: true,
        pseudo: true,
        firstName: true,
        lastName: true,
        avatar: true,
        favoriteTeam: true,
        role: true,
      }
    });

    return user;
  }

  /**
   * Supprime le compte d'un utilisateur
   * Supprime également toutes ses données associées (pronostics, groupes créés, etc.)
   */
  async deleteAccount(userId: string) {
    // D'abord, gérer les groupes où l'utilisateur est leader
    const groupsLedByUser = await prisma.group.findMany({
      where: { leaderId: userId, deletedAt: null } // Seulement les groupes non supprimés
    });

    for (const group of groupsLedByUser) {
      // Compter les membres (y compris l'utilisateur)
      const memberCount = await prisma.groupMember.count({
        where: { groupId: group.id }
      });

      if (memberCount <= 1) {
        // Si le groupe n'a qu'un seul membre (le leader), supprimer le groupe et ses données
        // Supprimer les pronostics de tous les matchs du groupe
        const matches = await prisma.match.findMany({
          where: { groupId: group.id }
        });
        
        for (const match of matches) {
          await prisma.prediction.deleteMany({
            where: { matchId: match.id }
          });
        }
        
        // Supprimer les matchs
        await prisma.match.deleteMany({
          where: { groupId: group.id }
        });
        
        // Supprimer les cooldowns de mode risqué du groupe
        await prisma.riskyPredictionCooldown.deleteMany({
          where: { groupId: group.id }
        });
        
        // Supprimer le groupe
        await prisma.group.delete({
          where: { id: group.id }
        });
      } else {
        // Transférer le leadership au membre le plus ancien (hors l'utilisateur)
        const oldestMember = await prisma.groupMember.findFirst({
          where: { groupId: group.id, userId: { not: userId } },
          orderBy: { joinedAt: 'asc' }
        });

        if (oldestMember) {
          // Mettre à jour le rôle du nouveau leader et transférer le leadership
          await prisma.$transaction([
            prisma.groupMember.update({
              where: { userId_groupId: { userId: oldestMember.userId, groupId: group.id } },
              data: { role: 'OWNER' }
            }),
            prisma.group.update({
              where: { id: group.id },
              data: { leaderId: oldestMember.userId }
            })
          ]);
        }
      }
    }

    // Supprimer les pronostics de l'utilisateur
    await prisma.prediction.deleteMany({
      where: { userId }
    });

    // Supprimer les cooldowns de mode risqué
    await prisma.riskyPredictionCooldown.deleteMany({
      where: { userId }
    });

    // Supprimer les membreships de groupes
    await prisma.groupMember.deleteMany({
      where: { userId }
    });

    // Supprimer l'utilisateur
    await prisma.user.delete({
      where: { id: userId }
    });

    return { success: true };
  }
}

