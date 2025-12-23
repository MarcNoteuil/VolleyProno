import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import logger from './config/logger';

// Import routes
import authRoutes from './auth/auth.routes';
import groupsRoutes from './groups/groups.routes';
import matchesRoutes from './matches/matches.routes';
import predictionsRoutes from './predictions/predictions.routes';
import rankingRoutes from './ranking/ranking.routes';
import adminRoutes from './admin/admin.routes';
import usersRoutes from './users/users.routes';

const app = express();

// Security middleware - Configuration renforcée
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Désactivé pour permettre les images externes
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
// Configuration CORS pour accepter localhost ET les IPs locales en développement
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL || 'http://localhost:5173']
  : [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      /^http:\/\/192\.168\.\d+\.\d+:5173$/,  // IPs 192.168.x.x
      /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,   // IPs 10.x.x.x
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/ // IPs 172.16-31.x.x
    ];

app.use(cors({
  origin: (origin, callback) => {
    // En production, refuser les requêtes sans origine (sécurité)
    if (process.env.NODE_ENV === 'production' && !origin) {
      return callback(new Error('CORS: Origin header required in production'));
    }
    
    // En développement, autoriser les requêtes sans origine (Postman, etc.)
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Vérifier si l'origine est autorisée
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting - configuration plus souple pour l'authentification
// DÉSACTIVÉ en développement pour éviter les blocages
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 100, // Très élevé en dev, normal en prod
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de tentatives de connexion, veuillez réessayer dans quelques minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // En développement, ignorer complètement le rate limiting
    if (isDevelopment) {
      return true;
    }
    
    // Détecter l'IP réelle (peut être derrière un proxy)
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const forwardedIp = req.headers['x-forwarded-for'] as string;
    const realIp = forwardedIp ? forwardedIp.split(',')[0].trim() : ip;
    
    const isLocalhost = realIp === '127.0.0.1' || 
                       realIp === '::1' || 
                       realIp === '::ffff:127.0.0.1' ||
                       realIp?.startsWith('172.') ||
                       realIp?.startsWith('192.168.') ||
                       realIp?.startsWith('10.') ||
                       ip === '127.0.0.1' ||
                       ip === '::1' ||
                       ip?.startsWith('172.') ||
                       ip?.startsWith('192.168.');
    
    return isLocalhost;
  }
});

// Rate limiting général pour les autres routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  }
});

// Appliquer le rate limiting spécifique pour l'authentification
app.use('/api/auth', authLimiter);

app.use(express.json({ limit: '10mb' })); // Augmenter la limite pour les images base64
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);

// Route de test pour le scraper FFVB (UNIQUEMENT en développement)
// DÉSACTIVÉE en production pour des raisons de sécurité
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/test-scraper', (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL manquante' });
    }
    
    const { FFVBScraper } = require('./utils/ffvbScraper');
    const scraper = new FFVBScraper();
    
    scraper.scrapeGroupMatches(url)
      .then(matches => {
        res.json({
          success: true,
          matches: matches,
          count: matches.length
        });
      })
      .catch(error => {
        logger.error('Erreur test scraper:', error);
        res.status(500).json({
          success: false,
          error: process.env.NODE_ENV === 'production' ? 'Erreur interne' : error.message
        });
      });
  });
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Route non trouvée'
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Logger l'erreur complète pour le debugging
  logger.error('Erreur non gérée:', err);
  
  // En production, ne pas exposer les détails de l'erreur
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    code: 'INTERNAL_ERROR',
    message: isProduction ? 'Erreur interne du serveur' : err.message || 'Erreur interne du serveur',
    ...(isProduction ? {} : { stack: err.stack }) // Stack trace uniquement en développement
  });
});

export default app;

