import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { EmailService } from '../utils/emailService';

export interface RegisterData {
  email: string;
  pseudo: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  async register(data: RegisterData) {
    const { email, pseudo, password } = data;

    // Vérifier si l'email existe déjà
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      throw new Error('Email déjà utilisé');
    }

    // Vérifier si le pseudo existe déjà (sensible à la casse)
    // "Lrd" et "lrd" sont considérés comme différents, mais "Lrd" et "Lrd" sont identiques
    const existingPseudo = await prisma.user.findUnique({
      where: { pseudo }
    });

    if (existingPseudo) {
      throw new Error('Ce pseudo est déjà utilisé');
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        pseudo,
        passwordHash
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
        createdAt: true
      }
    });

    return user;
  }

  async login(data: LoginData) {
    const { email, password } = data;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Sauvegarder la date de dernière connexion avant de la mettre à jour
    const previousLastLoginAt = user.lastLoginAt;

    // Mettre à jour la date de dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Générer les tokens
    const accessToken = jwt.sign(
      { userId: user.id },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        favoriteTeam: user.favoriteTeam,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { 
          id: true, 
          email: true, 
          pseudo: true,
          firstName: true,
          lastName: true,
          avatar: true,
          favoriteTeam: true,
          role: true
        }
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      const newAccessToken = jwt.sign(
        { userId: user.id },
        env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new Error('Token de rafraîchissement invalide');
    }
  }

  /**
   * Demande une réinitialisation de mot de passe
   */
  async requestPasswordReset(email: string) {
    // Trouver l'utilisateur - vérification explicite de l'existence
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Si l'utilisateur n'existe pas, retourner un code spécifique
    if (!user) {
      return { 
        success: false, 
        code: 'EMAIL_NOT_FOUND',
        message: 'Cet email n\'existe pas dans notre base de données.' 
      };
    }

    // Vérification supplémentaire : s'assurer que l'utilisateur existe vraiment
    // (protection contre les problèmes de timing ou de suppression incomplète)
    const userStillExists = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true }
    });

    if (!userStillExists) {
      // L'utilisateur a été supprimé entre-temps, ne pas envoyer d'email
      return { 
        success: false, 
        code: 'EMAIL_NOT_FOUND',
        message: 'Cet email n\'existe pas dans notre base de données.' 
      };
    }

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Valide pendant 1 heure

    // Sauvegarder le token dans la base de données
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      }
    });

    // Vérification finale avant l'envoi : s'assurer que l'utilisateur existe toujours
    const finalUserCheck = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, pseudo: true }
    });

    // Si l'utilisateur n'existe plus, supprimer le token et ne pas envoyer d'email
    if (!finalUserCheck) {
      await prisma.passwordResetToken.deleteMany({
        where: { token: resetToken }
      });
      return { 
        success: false, 
        code: 'EMAIL_NOT_FOUND',
        message: 'Cet email n\'existe pas dans notre base de données.' 
      };
    }

    // Envoyer l'email de réinitialisation UNIQUEMENT si l'utilisateur existe
    try {
      // En mode développement, si SMTP n'est pas configuré, afficher le lien dans la console
      if (env.NODE_ENV === 'development' && (!env.SMTP_USER || !env.SMTP_PASS)) {
        const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        console.log('\n📧 ============================================');
        console.log('📧 MODE DÉVELOPPEMENT - Email non envoyé');
        console.log('📧 ============================================');
        console.log(`📧 Email: ${finalUserCheck.email}`);
        console.log(`📧 Pseudo: ${finalUserCheck.pseudo}`);
        console.log(`📧 Lien de réinitialisation:`);
        console.log(`📧 ${resetUrl}`);
        console.log('📧 ============================================\n');
        return { 
          success: true, 
          code: 'EMAIL_SENT',
          message: 'Un lien de réinitialisation a été envoyé à votre adresse email.' 
        };
      }

      // Envoyer l'email UNIQUEMENT si l'utilisateur existe
      await EmailService.sendPasswordResetEmail(finalUserCheck.email, resetToken, finalUserCheck.pseudo);
      return { 
        success: true, 
        code: 'EMAIL_SENT',
        message: 'Un lien de réinitialisation a été envoyé à votre adresse email.' 
      };
    } catch (error: any) {
      // Supprimer le token si l'email n'a pas pu être envoyé
      await prisma.passwordResetToken.deleteMany({
        where: { token: resetToken }
      });
      
      // En mode développement, afficher l'erreur détaillée
      if (env.NODE_ENV === 'development') {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
        throw new Error(`Impossible d'envoyer l'email de réinitialisation: ${error.message || 'Vérifiez votre configuration SMTP'}`);
      }
      
      throw new Error('Impossible d\'envoyer l\'email de réinitialisation. Vérifiez votre configuration SMTP.');
    }
  }

  /**
   * Réinitialise le mot de passe avec un token
   */
  async resetPassword(token: string, newPassword: string) {
    // Trouver le token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken) {
      throw new Error('Token de réinitialisation invalide');
    }

    // Vérifier si le token a expiré
    if (new Date() > resetToken.expiresAt) {
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      });
      throw new Error('Le token de réinitialisation a expiré');
    }

    // Vérifier si le token a déjà été utilisé
    if (resetToken.used) {
      throw new Error('Ce token de réinitialisation a déjà été utilisé');
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Mettre à jour le mot de passe de l'utilisateur
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash }
    });

    // Marquer le token comme utilisé
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    });

    // Supprimer tous les autres tokens non utilisés pour cet utilisateur
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        used: false,
        id: { not: resetToken.id }
      }
    });

    return { success: true, message: 'Mot de passe réinitialisé avec succès' };
  }
}
