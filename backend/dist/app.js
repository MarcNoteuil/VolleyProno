"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = __importDefault(require("./config/logger"));
// Import routes
const auth_routes_1 = __importDefault(require("./auth/auth.routes"));
const groups_routes_1 = __importDefault(require("./groups/groups.routes"));
const matches_routes_1 = __importDefault(require("./matches/matches.routes"));
const predictions_routes_1 = __importDefault(require("./predictions/predictions.routes"));
const ranking_routes_1 = __importDefault(require("./ranking/ranking.routes"));
const admin_routes_1 = __importDefault(require("./admin/admin.routes"));
const users_routes_1 = __importDefault(require("./users/users.routes"));
const app = (0, express_1.default)();
// Security middleware - Configuration renforcée
app.use((0, helmet_1.default)({
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
        /^http:\/\/192\.168\.\d+\.\d+:5173$/, // IPs 192.168.x.x
        /^http:\/\/10\.\d+\.\d+\.\d+:5173$/, // IPs 10.x.x.x
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/ // IPs 172.16-31.x.x
    ];
app.use((0, cors_1.default)({
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
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
// Rate limiting - configuration plus souple pour l'authentification
// DÉSACTIVÉ en développement pour éviter les blocages
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const authLimiter = (0, express_rate_limit_1.default)({
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
        const forwardedIp = req.headers['x-forwarded-for'];
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
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Trop de requêtes, veuillez réessayer plus tard'
    }
});
// Appliquer le rate limiting spécifique pour l'authentification
app.use('/api/auth', authLimiter);
app.use(express_1.default.json({ limit: '10mb' })); // Augmenter la limite pour les images base64
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, morgan_1.default)('dev'));
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// API routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/groups', groups_routes_1.default);
app.use('/api/matches', matches_routes_1.default);
app.use('/api/predictions', predictions_routes_1.default);
app.use('/api/ranking', ranking_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/users', users_routes_1.default);
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
            logger_1.default.error('Erreur test scraper:', error);
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
app.use((err, _req, res, _next) => {
    // Logger l'erreur complète pour le debugging
    logger_1.default.error('Erreur non gérée:', err);
    // En production, ne pas exposer les détails de l'erreur
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        code: 'INTERNAL_ERROR',
        message: isProduction ? 'Erreur interne du serveur' : err.message || 'Erreur interne du serveur',
        ...(isProduction ? {} : { stack: err.stack }) // Stack trace uniquement en développement
    });
});
exports.default = app;
