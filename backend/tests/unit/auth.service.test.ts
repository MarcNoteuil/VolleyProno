import { AuthService } from '../../src/auth/auth.service';
import { prisma } from '../setup';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        pseudo: 'testuser',
        password: 'password123'
      };

      const result = await authService.register(userData);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
      expect(result.pseudo).toBe(userData.pseudo);
      expect(result).not.toHaveProperty('passwordHash');

      // Vérifier que l'utilisateur existe en base
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(user).toBeTruthy();
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        pseudo: 'testuser',
        password: 'password123'
      };

      await authService.register(userData);

      await expect(authService.register(userData)).rejects.toThrow('Email ou pseudo déjà utilisé');
    });

    it('should throw error if pseudo already exists', async () => {
      const userData1 = {
        email: 'test1@example.com',
        pseudo: 'testuser',
        password: 'password123'
      };

      const userData2 = {
        email: 'test2@example.com',
        pseudo: 'testuser',
        password: 'password123'
      };

      await authService.register(userData1);

      await expect(authService.register(userData2)).rejects.toThrow('Email ou pseudo déjà utilisé');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        pseudo: 'testuser',
        password: 'password123'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error with incorrect email', async () => {
      await expect(authService.login({
        email: 'wrong@example.com',
        password: 'password123'
      })).rejects.toThrow('Email ou mot de passe incorrect');
    });

    it('should throw error with incorrect password', async () => {
      await expect(authService.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      })).rejects.toThrow('Email ou mot de passe incorrect');
    });
  });

  describe('refreshToken', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'test@example.com',
        pseudo: 'testuser',
        password: 'password123'
      });

      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      refreshToken = loginResult.refreshToken;
    });

    it('should generate new access token with valid refresh token', async () => {
      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
    });

    it('should throw error with invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('Token de rafraîchissement invalide');
    });
  });
});
