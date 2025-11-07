import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Créer le transporteur email (seulement si SMTP est configuré)
let transporter: nodemailer.Transporter | null = null;

// Log de la configuration SMTP au chargement
console.log('📧 Configuration SMTP:');
console.log(`   Host: ${env.SMTP_HOST}`);
console.log(`   Port: ${env.SMTP_PORT}`);
console.log(`   User: ${env.SMTP_USER ? env.SMTP_USER.substring(0, 3) + '***' : 'NON DÉFINI'}`);
console.log(`   Pass: ${env.SMTP_PASS ? '***' : 'NON DÉFINI'}`);

if (env.SMTP_USER && env.SMTP_PASS) {
  // Configuration spécifique pour Gmail
  const isGmail = env.SMTP_HOST === 'smtp.gmail.com';
  
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // true pour 465, false pour les autres ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    // Options supplémentaires pour Gmail
    ...(isGmail && {
      tls: {
        // Ne pas rejeter les certificats non autorisés (utile en développement)
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      // Forcer STARTTLS pour Gmail
      requireTLS: true,
      // Désactiver la vérification du certificat (uniquement pour Gmail en développement)
      debug: env.NODE_ENV === 'development',
      logger: env.NODE_ENV === 'development'
    })
  });
  console.log('✅ Transporteur SMTP créé avec succès');
  if (isGmail) {
    console.log('   Configuration Gmail détectée');
  }
} else {
  console.warn('⚠️ Transporteur SMTP non créé: SMTP_USER ou SMTP_PASS manquant');
}

export class EmailService {
  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  static async sendPasswordResetEmail(email: string, resetToken: string, pseudo: string) {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"VolleyProno" <${env.SMTP_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe - VolleyProno',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f97316;">🏐 VolleyProno</h2>
          <p>Bonjour ${pseudo},</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
          <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
          <p style="margin: 20px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Ou copiez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; color: #666; background-color: #f4f4f4; padding: 10px; border-radius: 5px;">${resetUrl}</p>
          <p style="color: #666; font-size: 14px;"><strong>Ce lien est valide pendant 1 heure.</strong></p>
          <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      `,
      text: `Bonjour ${pseudo},

Vous avez demandé à réinitialiser votre mot de passe.

Cliquez sur ce lien pour créer un nouveau mot de passe :
${resetUrl}

Ce lien est valide pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.`,
    };

    try {
      if (!transporter) {
        const missingConfig = [];
        if (!env.SMTP_USER) missingConfig.push('SMTP_USER');
        if (!env.SMTP_PASS) missingConfig.push('SMTP_PASS');
        throw new Error(`Configuration SMTP manquante. Variables manquantes: ${missingConfig.join(', ')}. Vérifiez votre fichier .env dans le dossier backend/`);
      }
      
      console.log(`📧 Tentative d'envoi d'email à: ${email}`);
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email envoyé avec succès à: ${email}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erreur détaillée lors de l\'envoi de l\'email:');
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Response:', error.response);
      console.error('   ResponseCode:', error.responseCode);
      console.error('   Command:', error.command);
      console.error('   Stack:', error.stack);
      
      // Messages d'erreur plus spécifiques
      let errorMessage = 'Impossible d\'envoyer l\'email de réinitialisation.';
      let detailedHelp = '';
      
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        errorMessage = 'Erreur d\'authentification SMTP. Vérifiez votre SMTP_USER et SMTP_PASS.';
        detailedHelp = '\n💡 Pour Gmail:\n   - Utilisez un MOT DE PASSE D\'APPLICATION (16 caractères)\n   - Allez sur: https://myaccount.google.com/apppasswords\n   - Activez l\'authentification à deux facteurs si nécessaire\n   - Générez un mot de passe d\'application pour "Mail"\n   - Copiez les 16 caractères SANS ESPACES dans votre .env';
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
        errorMessage = 'Impossible de se connecter au serveur SMTP.';
        detailedHelp = '\n💡 Vérifiez:\n   - Votre connexion internet\n   - Que SMTP_HOST et SMTP_PORT sont corrects\n   - Que le port 587 n\'est pas bloqué par un firewall\n   - Que votre antivirus n\' bloque pas la connexion';
      } else if (error.message?.includes('Invalid login') || error.message?.includes('Username and Password not accepted')) {
        errorMessage = 'Identifiants SMTP invalides.';
        detailedHelp = '\n💡 Pour Gmail:\n   - Vérifiez que vous utilisez un mot de passe d\'application (pas votre mot de passe Gmail normal)\n   - Le mot de passe doit faire exactement 16 caractères\n   - Supprimez tous les espaces du mot de passe dans votre .env';
      } else if (error.responseCode === 550 || error.message?.includes('550')) {
        errorMessage = 'L\'adresse email destinataire est invalide ou rejetée.';
        detailedHelp = '\n💡 Vérifiez que l\'adresse email existe et est correcte.';
      } else if (error.message) {
        errorMessage = `Erreur SMTP: ${error.message}`;
        detailedHelp = '\n💡 Consultez les logs détaillés ci-dessus pour plus d\'informations.';
      }
      
      // En mode développement, afficher l'aide détaillée
      if (env.NODE_ENV === 'development') {
        console.error(detailedHelp);
      }
      
      throw new Error(errorMessage + (env.NODE_ENV === 'development' ? detailedHelp : ''));
    }
  }

  /**
   * Vérifie la configuration email
   */
  static async verifyConnection() {
    if (!transporter) {
      console.warn('⚠️ Configuration SMTP manquante. Les emails ne seront pas envoyés.');
      return false;
    }
    try {
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('Erreur de configuration email:', error);
      return false;
    }
  }
}

