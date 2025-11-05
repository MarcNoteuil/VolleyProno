import { prisma } from '../db/prisma';
import { randomBytes } from 'crypto';

export interface CreateGroupData {
  name: string;
  ffvbSourceUrl?: string;
  userId: string;
}

export interface JoinGroupData {
  inviteCode: string;
  userId: string;
}

export class GroupsService {
  async createGroup(data: CreateGroupData) {
    const { name, ffvbSourceUrl, userId } = data;

    // Générer un code d'invitation unique au format XXXX-XXXX (8 chiffres)
    let inviteCode: string;
    let isUnique = false;
    
    while (!isUnique) {
      // Générer 8 chiffres aléatoires
      const part1 = Math.floor(1000 + Math.random() * 9000).toString(); // 4 chiffres (1000-9999)
      const part2 = Math.floor(1000 + Math.random() * 9000).toString(); // 4 chiffres (1000-9999)
      inviteCode = `${part1}-${part2}`;
      
      // Vérifier l'unicité
      const existing = await prisma.group.findUnique({
        where: { inviteCode }
      });
      
      if (!existing) {
        isUnique = true;
      }
    }

    const group = await prisma.group.create({
      data: {
        name,
        ffvbSourceUrl,
        createdByUserId: userId,
        leaderId: userId, // Le créateur est le leader par défaut
        inviteCode,
        members: {
          create: {
            userId,
            role: 'OWNER'
          }
        }
      },
      include: {
        members: {
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

    return group;
  }

  async joinGroup(data: JoinGroupData) {
    let { inviteCode, userId } = data;

    // Normaliser le code d'invitation (enlever les espaces, format XXXX-XXXX)
    inviteCode = inviteCode.trim().replace(/\s+/g, '').toUpperCase();
    
    // Vérifier le format (XXXX-XXXX) ou accepter les anciens formats (hex, etc.)
    let normalizedCode = inviteCode;
    
    // Si c'est un format XXXX-XXXX, on le garde tel quel
    if (/^\d{4}-\d{4}$/.test(inviteCode)) {
      normalizedCode = inviteCode;
    }
    // Si c'est un format sans tiret mais avec 8 chiffres, on ajoute le tiret
    else if (/^\d{8}$/.test(inviteCode)) {
      normalizedCode = `${inviteCode.slice(0, 4)}-${inviteCode.slice(4, 8)}`;
    }
    // Sinon, on accepte l'ancien format (hex, etc.) pour la compatibilité
    else {
      normalizedCode = inviteCode;
    }

    // Trouver le groupe par code d'invitation (essayer le nouveau format puis l'ancien)
    let group = await prisma.group.findUnique({
      where: { inviteCode: normalizedCode }
    });
    
    // Si pas trouvé avec le nouveau format, essayer avec l'ancien format
    if (!group && normalizedCode !== inviteCode) {
      group = await prisma.group.findUnique({
        where: { inviteCode }
      });
    }

    if (!group) {
      throw new Error('Code d\'invitation invalide');
    }

    // Vérifier si l'utilisateur est déjà membre
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: group.id
        }
      }
    });

    if (existingMember) {
      throw new Error('Vous êtes déjà membre de ce groupe');
    }

    // Ajouter l'utilisateur au groupe
    const member = await prisma.groupMember.create({
      data: {
        userId,
        groupId: group.id,
        role: 'MEMBER'
      },
      include: {
        group: true,
        user: {
          select: {
            id: true,
            pseudo: true
          }
        }
      }
    });

    return member;
  }

  async getUserGroups(userId: string) {
    const groups = await prisma.group.findMany({
      where: {
        deletedAt: null, // Exclure les groupes supprimés
        members: {
          some: {
            userId
          }
        }
      },
      include: {
        leader: {
          select: {
            id: true,
            pseudo: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                pseudo: true
              }
            }
          }
        },
        _count: {
          select: {
            matches: true
          }
        }
      }
    });

    return groups;
  }

  async getGroupById(groupId: string, userId: string) {
    // Vérifier que l'utilisateur est membre du groupe
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership) {
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    const group = await prisma.group.findUnique({
      where: { 
        id: groupId,
        deletedAt: null // Exclure les groupes supprimés
      },
      include: {
        leader: {
          select: {
            id: true,
            pseudo: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                pseudo: true
              }
            }
          }
        },
        matches: {
          orderBy: {
            startAt: 'asc'
          }
        }
      }
    });

    if (!group) {
      throw new Error('Groupe non trouvé ou supprimé');
    }

    return group;
  }

  async leaveGroup(groupId: string, userId: string) {
    // Vérifier que l'utilisateur est membre du groupe
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      include: {
        group: true
      }
    });

    if (!membership) {
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Vérifier que le groupe n'est pas supprimé
    if (membership.group.deletedAt) {
      throw new Error('Ce groupe a été supprimé');
    }

    // Si l'utilisateur est le leader, transférer le leadership au membre le plus ancien
    if (membership.group.leaderId === userId) {
      // Trouver le membre le plus ancien (par joinedAt) qui n'est pas le leader actuel
      const otherMembers = await prisma.groupMember.findMany({
        where: {
          groupId,
          userId: {
            not: userId
          }
        },
        orderBy: {
          joinedAt: 'asc'
        },
        take: 1
      });

      if (otherMembers.length > 0) {
        const newLeaderId = otherMembers[0].userId;
        // Transférer le leadership et mettre à jour les rôles
        await prisma.$transaction([
          // Mettre à jour le leaderId du groupe
          prisma.group.update({
            where: { id: groupId },
            data: { leaderId: newLeaderId }
          }),
          // Changer le rôle de l'ancien leader à MEMBER (il va quitter le groupe de toute façon)
          prisma.groupMember.updateMany({
            where: {
              groupId,
              userId: userId
            },
            data: {
              role: 'MEMBER'
            }
          }),
          // Changer le rôle du nouveau leader à OWNER
          prisma.groupMember.updateMany({
            where: {
              groupId,
              userId: newLeaderId
            },
            data: {
              role: 'OWNER'
            }
          })
        ]);
      } else {
        // Si c'est le dernier membre, on ne peut pas quitter (ou supprimer le groupe)
        throw new Error('Vous êtes le dernier membre du groupe. Supprimez le groupe à la place.');
      }
    }

    // Retirer l'utilisateur du groupe
    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    return { success: true };
  }

  async deleteGroup(groupId: string, userId: string) {
    // Vérifier que l'utilisateur est le leader du groupe
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId }
        }
      }
    });

    if (!group) {
      throw new Error('Groupe non trouvé');
    }

    if (group.deletedAt) {
      throw new Error('Ce groupe a déjà été supprimé');
    }

    if (group.leaderId !== userId) {
      throw new Error('Seul le leader du groupe peut le supprimer');
    }

    if (group.members.length === 0) {
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Supprimer les pronostics non terminés (SCHEDULED ou IN_PROGRESS) du groupe
    // On garde les pronostics terminés (FINISHED) pour le classement global
    await prisma.prediction.deleteMany({
      where: {
        match: {
          groupId,
          status: {
            in: ['SCHEDULED', 'IN_PROGRESS']
          }
        }
      }
    });

    // Soft delete : marquer le groupe comme supprimé
    // Les matchs et pronostics terminés sont conservés pour le classement global
    await prisma.group.update({
      where: { id: groupId },
      data: {
        deletedAt: new Date()
      }
    });

    return { success: true };
  }

  async regenerateInviteCode(groupId: string, userId: string) {
    // Vérifier que l'utilisateur est owner ou admin
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new Error('Vous n\'avez pas les droits pour régénérer le code');
    }

    const newInviteCode = randomBytes(8).toString('hex').toUpperCase();

    const group = await prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: newInviteCode }
    });

    return group;
  }

  async transferLeadership(groupId: string, currentUserId: string, newLeaderId: string) {
    // Vérifier que le groupe existe
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId: newLeaderId }
        }
      }
    });

    if (!group) {
      throw new Error('Groupe non trouvé');
    }

    if (group.deletedAt) {
      throw new Error('Ce groupe a été supprimé');
    }

    // Vérifier que l'utilisateur actuel est le leader
    if (group.leaderId !== currentUserId) {
      throw new Error('Seul le leader du groupe peut transférer le leadership');
    }

    // Vérifier que le nouveau leader existe et est membre du groupe
    if (group.members.length === 0) {
      throw new Error('Le nouveau leader doit être membre du groupe');
    }

    // Vérifier que le nouveau leader n'est pas le leader actuel
    if (newLeaderId === currentUserId) {
      throw new Error('Vous ne pouvez pas vous transférer le leadership à vous-même');
    }

    // Transférer le leadership et mettre à jour les rôles
    await prisma.$transaction([
      // Mettre à jour le leaderId du groupe
      prisma.group.update({
        where: { id: groupId },
        data: { leaderId: newLeaderId }
      }),
      // Changer le rôle de l'ancien leader à MEMBER
      prisma.groupMember.updateMany({
        where: {
          groupId,
          userId: currentUserId
        },
        data: {
          role: 'MEMBER'
        }
      }),
      // Changer le rôle du nouveau leader à OWNER
      prisma.groupMember.updateMany({
        where: {
          groupId,
          userId: newLeaderId
        },
        data: {
          role: 'OWNER'
        }
      })
    ]);

    return { success: true };
  }
}
