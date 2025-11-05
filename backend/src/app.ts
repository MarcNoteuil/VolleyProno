import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './auth/auth.routes';
import groupsRoutes from './groups/groups.routes';
import matchesRoutes from './matches/matches.routes';
import predictionsRoutes from './predictions/predictions.routes';
import rankingRoutes from './ranking/ranking.routes';
import adminRoutes from './admin/admin.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting - configuration plus souple pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 login attempts per 15 minutes (assez souple pour les tests)
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de tentatives de connexion, veuillez réessayer dans quelques minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Ignorer le rate limiting pour les requêtes depuis localhost en développement
    return process.env.NODE_ENV === 'development' && 
           (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
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

app.use(express.json());
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

// Route de test pour le scraper FFVB (sans authentification)
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
      console.error('Erreur test scraper:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Route non trouvée'
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Erreur interne du serveur'
  });
});

export default app;

