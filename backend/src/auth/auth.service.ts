import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { env } from '../config/env';

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
}
