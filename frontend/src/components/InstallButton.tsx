import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Vérifier si l'app a été installée après le chargement
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Afficher le prompt d'installation
    deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ Application installée avec succès');
      setIsInstalled(true);
    } else {
      console.log('❌ Installation refusée par l\'utilisateur');
    }

    // Réinitialiser
    setDeferredPrompt(null);
    setShowButton(false);
  };

  // Ne pas afficher si déjà installée ou si le bouton ne doit pas être affiché
  if (isInstalled || !showButton) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="group relative w-full md:w-auto flex items-center justify-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white rounded-lg text-[10px] md:text-xs font-bold-sport hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 transition-all duration-300 shadow-md shadow-orange-500/40 hover:shadow-lg hover:shadow-orange-500/60 border border-orange-400/50 hover:border-orange-300/70 active:scale-95 overflow-hidden transform hover:scale-105"
      title="Installer l'application VolleyProno sur votre appareil"
    >
      {/* Effet shine au survol */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full"></div>
      
      {/* Icône avec animation subtile */}
      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      
      {/* Texte */}
      <span className="relative z-10 drop-shadow-sm">Installer</span>
    </button>
  );
}

