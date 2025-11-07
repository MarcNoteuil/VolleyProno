import 'dotenv/config';
import { EmailService } from '../utils/emailService';
import { env } from '../config/env';

async function testSMTP() {
  console.log('\n🧪 Test de la configuration SMTP\n');
  console.log('📋 Configuration actuelle:');
  console.log(`   SMTP_HOST: ${env.SMTP_HOST}`);
  console.log(`   SMTP_PORT: ${env.SMTP_PORT}`);
  console.log(`   SMTP_USER: ${env.SMTP_USER || 'NON DÉFINI'}`);
  console.log(`   SMTP_PASS: ${env.SMTP_PASS ? '***' : 'NON DÉFINI'}`);
  console.log(`   FRONTEND_URL: ${env.FRONTEND_URL}\n`);

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.error('❌ ERREUR: SMTP_USER ou SMTP_PASS n\'est pas défini dans votre fichier .env');
    console.log('\n📝 Pour configurer:');
    console.log('   1. Créez un fichier .env dans le dossier backend/');
    console.log('   2. Ajoutez les variables suivantes:');
    console.log('      SMTP_HOST=smtp.gmail.com');
    console.log('      SMTP_PORT=587');
    console.log('      SMTP_USER=votre-email@gmail.com');
    console.log('      SMTP_PASS=votre-mot-de-passe-application\n');
    process.exit(1);
  }

  console.log('🔍 Test de connexion au serveur SMTP...\n');
  
  try {
    const isValid = await EmailService.verifyConnection();
    if (isValid) {
      console.log('✅ Connexion SMTP réussie !\n');
      
      // Test d'envoi d'email
      console.log('📧 Test d\'envoi d\'email...\n');
      const testToken = 'test-token-123';
      const testEmail = env.SMTP_USER; // Envoyer à soi-même pour tester
      
      await EmailService.sendPasswordResetEmail(testEmail, testToken, 'Test');
      console.log(`✅ Email de test envoyé avec succès à: ${testEmail}`);
      console.log('   Vérifiez votre boîte mail (et les spams) !\n');
    } else {
      console.error('❌ Échec de la connexion SMTP');
      console.log('\n💡 Vérifiez:');
      console.log('   - Que SMTP_USER et SMTP_PASS sont corrects');
      console.log('   - Que vous utilisez un mot de passe d\'application Gmail (pas votre mot de passe normal)');
      console.log('   - Que l\'authentification à deux facteurs est activée sur votre compte Gmail');
      console.log('   - Que votre connexion internet fonctionne\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('\n💡 Solutions possibles:');
    if (error.message?.includes('EAUTH') || error.message?.includes('Invalid login')) {
      console.log('   - Vérifiez que vous utilisez un MOT DE PASSE D\'APPLICATION Gmail (16 caractères)');
      console.log('   - Allez sur: https://myaccount.google.com/apppasswords');
      console.log('   - Générez un nouveau mot de passe d\'application pour "Mail"');
    } else if (error.message?.includes('ECONNECTION') || error.message?.includes('ETIMEDOUT')) {
      console.log('   - Vérifiez votre connexion internet');
      console.log('   - Vérifiez que SMTP_HOST et SMTP_PORT sont corrects');
      console.log('   - Vérifiez que le port 587 n\'est pas bloqué par un firewall');
    }
    console.log('');
    process.exit(1);
  }
}

testSMTP();

