import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function WelcomePage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Si l'utilisateur est connecté, rediriger vers le dashboard
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Ne pas afficher la page si l'utilisateur est connecté (sera redirigé)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center px-4 py-6 overflow-hidden">
      {/* Contenu principal - tout visible sur un écran */}
      <div className="max-w-5xl w-full flex flex-col items-center space-y-5">
        {/* Hero Section avec titre et CTA */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="font-bold-sport text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
              Le pronostic de volley-ball qui transforme chaque match en défi !
            </p>
          </div>

          {/* Boutons CTA - bien visibles en haut */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-3">
            <Link
              to="/register"
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 font-bold-sport text-sm shadow-md shadow-orange-500/40 transition-all duration-200 transform hover:scale-105 w-full sm:w-auto"
            >
              S'inscrire gratuitement
            </Link>
            <Link
              to="/login"
              className="px-6 py-2.5 bg-gray-800 border-2 border-orange-500 text-orange-400 rounded-lg hover:bg-gray-700 font-bold-sport text-sm shadow-md shadow-orange-500/20 transition-all duration-200 transform hover:scale-105 w-full sm:w-auto"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {/* Fonctionnalités - 3 cartes horizontales compactes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
          {/* Carte 1 */}
          <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-4 text-center space-y-2 hover:border-orange-500/50 transition-all duration-200">
            <div className="text-3xl mb-1">👥</div>
            <h3 className="font-sport text-base text-white">Créez des groupes</h3>
            <p className="text-gray-400 font-bold-sport text-xs">
              Formez vos groupes de pronostics avec vos amis et défiez-vous !
            </p>
          </div>

          {/* Carte 2 */}
          <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-4 text-center space-y-2 hover:border-orange-500/50 transition-all duration-200">
            <div className="text-3xl mb-1">🎯</div>
            <h3 className="font-sport text-base text-white">Faites vos pronostics</h3>
            <p className="text-gray-400 font-bold-sport text-xs">
              Prédisez les scores et gagnez des points à chaque match terminé !
            </p>
          </div>

          {/* Carte 3 */}
          <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-4 text-center space-y-2 hover:border-orange-500/50 transition-all duration-200">
            <div className="text-3xl mb-1">🏆</div>
            <h3 className="font-sport text-base text-white">Montez au classement</h3>
            <p className="text-gray-400 font-bold-sport text-xs">
              Compétitionnez avec toute la communauté et devenez le champion !
            </p>
          </div>
        </div>

        {/* Section "Comment ça marche" - compacte */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-lg p-4 w-full max-w-4xl">
          <h2 className="font-sport text-lg text-white mb-3 text-center">⚡ Comment ça marche ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mx-auto font-sport text-white text-base">1</div>
              <p className="text-gray-300 font-bold-sport text-xs">Créez un compte</p>
            </div>
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mx-auto font-sport text-white text-base">2</div>
              <p className="text-gray-300 font-bold-sport text-xs">Créez ou rejoignez un groupe</p>
            </div>
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mx-auto font-sport text-white text-base">3</div>
              <p className="text-gray-300 font-bold-sport text-xs">Faites vos pronostics</p>
            </div>
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mx-auto font-sport text-white text-base">4</div>
              <p className="text-gray-300 font-bold-sport text-xs">Gagnez des points !</p>
            </div>
          </div>
        </div>

        {/* Points système - compact */}
        <div className="bg-gradient-to-r from-orange-900/30 to-orange-800/30 border border-orange-500/50 rounded-lg p-4 w-full max-w-4xl">
          <h3 className="font-sport text-base text-white mb-3 text-center">💎 Système de points</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <p className="text-orange-400 font-sport text-sm">Bon vainqueur</p>
              <p className="text-white font-bold-sport text-sm">+1 point</p>
            </div>
            <div className="space-y-1">
              <p className="text-orange-400 font-sport text-sm">Score exact</p>
              <p className="text-white font-bold-sport text-sm">+3 points</p>
            </div>
            <div className="space-y-1">
              <p className="text-orange-400 font-sport text-sm">Bonus détaillé</p>
              <p className="text-white font-bold-sport text-sm">+2 points</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer minimal */}
      <div className="mt-4 text-center text-gray-500 font-bold-sport text-xs">
        <p>Prêt à relever le défi ? Rejoignez la communauté VolleyProno !</p>
      </div>
    </div>
  );
}

