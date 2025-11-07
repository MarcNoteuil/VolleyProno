import 'dotenv/config';
import app from './app';
import { connectPrisma } from './db/prisma';
import { CronJobManager } from './jobs/cronJob';
import logger from './config/logger';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

async function startServer() {
  try {
    // Vérifier la configuration SMTP au démarrage
    const { EmailService } = await import('./utils/emailService');
    const smtpConfigured = await EmailService.verifyConnection();
    if (smtpConfigured) {
      logger.info('✅ Configuration SMTP validée');
    } else {
      logger.warn('⚠️ Configuration SMTP manquante ou invalide. Les emails ne seront pas envoyés.');
    }
    
    // Connexion à la base de données
    await connectPrisma();
    logger.info('Connexion à la base de données établie');

    // Démarrer les jobs cron
    const cronManager = new CronJobManager();
    cronManager.startAllJobs();

    // Démarrer le serveur
    app.listen(port, () => {
      logger.info(`Backend listening on http://localhost:${port}`);
    });

    // Gestion propre de l'arrêt
    process.on('SIGTERM', () => {
      logger.info('Signal SIGTERM reçu, arrêt du serveur...');
      cronManager.stopAllJobs();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('Signal SIGINT reçu, arrêt du serveur...');
      cronManager.stopAllJobs();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

startServer();

