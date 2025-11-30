"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const prisma_1 = require("./db/prisma");
const cronJob_1 = require("./jobs/cronJob");
const logger_1 = __importDefault(require("./config/logger"));
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
async function startServer() {
    try {
        // Vérifier la configuration SMTP au démarrage
        const { EmailService } = await Promise.resolve().then(() => __importStar(require('./utils/emailService')));
        const smtpConfigured = await EmailService.verifyConnection();
        if (smtpConfigured) {
            logger_1.default.info('✅ Configuration SMTP validée');
        }
        else {
            logger_1.default.warn('⚠️ Configuration SMTP manquante ou invalide. Les emails ne seront pas envoyés.');
        }
        // Connexion à la base de données
        await (0, prisma_1.connectPrisma)();
        logger_1.default.info('Connexion à la base de données établie');
        // Démarrer les jobs cron
        const cronManager = new cronJob_1.CronJobManager();
        cronManager.startAllJobs();
        // Démarrer le serveur
        app_1.default.listen(port, () => {
            logger_1.default.info(`Backend listening on http://localhost:${port}`);
        });
        // Gestion propre de l'arrêt
        process.on('SIGTERM', () => {
            logger_1.default.info('Signal SIGTERM reçu, arrêt du serveur...');
            cronManager.stopAllJobs();
            process.exit(0);
        });
        process.on('SIGINT', () => {
            logger_1.default.info('Signal SIGINT reçu, arrêt du serveur...');
            cronManager.stopAllJobs();
            process.exit(0);
        });
    }
    catch (error) {
        // Afficher l'erreur complète dans la console pour le débogage
        console.error('=== ERREUR DÉTAILLÉE ===');
        console.error(error);
        if (error instanceof Error) {
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
        }
        else {
            console.error('Erreur complète:', JSON.stringify(error, null, 2));
        }
        console.error('========================');
        logger_1.default.error('Erreur lors du démarrage du serveur:', error);
        if (error instanceof Error) {
            logger_1.default.error('Message:', error.message);
            logger_1.default.error('Stack:', error.stack);
        }
        else {
            logger_1.default.error('Erreur complète:', JSON.stringify(error, null, 2));
        }
        process.exit(1);
    }
}
startServer();
