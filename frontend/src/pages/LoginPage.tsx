import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Logo from '../components/Logo';

export default function LoginPage() {
  // Charger l'email et le mot de passe sauvegardés depuis localStorage si "Se souvenir de moi" était coché
  const [email, setEmail] = useState(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    return savedEmail || '';
  });
  const [password, setPassword] = useState(() => {
    const savedPassword = localStorage.getItem('rememberedPassword');
    return savedPassword || '';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    // Charger l'erreur depuis sessionStorage si elle existe (après un rechargement)
    const savedError = sessionStorage.getItem('loginError');
    if (savedError) {
      sessionStorage.removeItem('loginError'); // Nettoyer après lecture
      return savedError;
    }
    return '';
  });
  
  const [errorFromStorage] = useState(() => {
    // Indiquer si l'erreur vient de sessionStorage (vérifié AVANT la suppression)
    const hadError = !!sessionStorage.getItem('loginError');
    return hadError;
  });
  
  const { login } = useAuthStore();
  const navigate = useNavigate();
  
  // Nettoyer l'erreur après 10 secondes UNIQUEMENT si elle ne vient pas de sessionStorage
  // (pour éviter qu'elle disparaisse immédiatement après un rechargement)
  // Si elle vient de sessionStorage, elle reste visible jusqu'à ce que l'utilisateur tape
  useEffect(() => {
    if (error && !errorFromStorage) {
      const timer = setTimeout(() => {
        setError('');
      }, 10000); // Augmenté à 10 secondes pour plus de visibilité
      return () => clearTimeout(timer);
    }
    // Si l'erreur vient de sessionStorage, ne pas la supprimer automatiquement
    // Elle sera supprimée quand l'utilisateur tape dans les champs
  }, [error, errorFromStorage]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      
      // Si "Se souvenir de moi" est coché, sauvegarder l'email ET le mot de passe
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
        localStorage.setItem('rememberMe', 'true');
      } else {
        // Sinon, supprimer l'email et le mot de passe sauvegardés
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        localStorage.removeItem('rememberMe');
      }
      
      // Marquer que l'utilisateur vient de se connecter pour afficher la modal de points
      sessionStorage.setItem('justLoggedIn', 'true');
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      
      // Extraire le message d'erreur
      let errorMessage = 'Email ou mot de passe incorrect';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && error.message !== 'Request failed with status code 401') {
        errorMessage = error.message;
      }
      
      // Sauvegarder l'erreur dans sessionStorage pour qu'elle persiste même après un rechargement
      sessionStorage.setItem('loginError', errorMessage);
      
      // Mettre à jour l'erreur de manière synchrone
      setError(errorMessage);
      setLoading(false);
      
      // Si "Se souvenir de moi" n'est pas coché, vider le mot de passe
      if (!rememberMe) {
        setPassword('');
      }
    }
  };

  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-400 font-bold-sport text-lg">
            Connexion
          </p>
        </div>
        
        <form 
          className="mt-8 space-y-6" 
          onSubmit={handleSubmit}
          noValidate
          onKeyDown={(e) => {
            // Empêcher la soumission avec Enter si le formulaire est en cours de traitement
            if (e.key === 'Enter' && loading) {
              e.preventDefault();
            }
          }}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-bold-sport text-gray-300 mb-2">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-500"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) {
                    setError(''); // Réinitialiser l'erreur quand l'utilisateur tape
                    sessionStorage.removeItem('loginError'); // Nettoyer aussi sessionStorage
                  }
                }}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold-sport text-gray-300 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) {
                      setError(''); // Réinitialiser l'erreur quand l'utilisateur tape
                      sessionStorage.removeItem('loginError'); // Nettoyer aussi sessionStorage
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.29 3.29L12 12m0 0l3.29 3.29m0 0a9.97 9.97 0 015.12 2.12m0 0L21 21" />
                  </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRememberMe(checked);
                    // Si l'utilisateur décoche "Se souvenir de moi", supprimer les données sauvegardées
                    if (!checked) {
                      localStorage.removeItem('rememberedEmail');
                      localStorage.removeItem('rememberedPassword');
                      localStorage.removeItem('rememberMe');
                    }
                  }}
                  className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                />
                <span className="text-sm font-bold-sport text-gray-300">
                  Se souvenir de moi
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-bold-sport text-orange-500 hover:text-orange-400 transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          {error && (
            <div 
              className="bg-red-900/50 border-2 border-red-500 text-red-300 px-4 py-3 rounded-lg font-bold-sport flex items-start space-x-3 animate-fade-in"
              role="alert"
              aria-live="polite"
            >
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{error}</p>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 font-bold-sport text-lg shadow-lg shadow-orange-500/30 transition-all duration-200"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Pas encore de compte ?{' '}
              <Link
                to="/register"
                className="font-bold-sport text-orange-500 hover:text-orange-400 transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
