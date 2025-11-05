import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Header() {
  const { logout, user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/groups';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b-2 border-orange-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <span className="font-sport text-3xl text-orange-500 group-hover:text-orange-400 transition-colors">
                🏐
              </span>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <span className="font-sport text-2xl text-white group-hover:text-orange-400 transition-colors">
              VolleyProno
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-bold-sport transition-all duration-200 ${
                isActive('/') && !isActive('/groups')
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-orange-400'
              }`}
            >
              Accueil
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/mes-pronos"
                  className={`px-4 py-2 rounded-lg text-sm font-bold-sport transition-all duration-200 ${
                    isActive('/mes-pronos')
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-orange-400'
                  }`}
                >
                  Mes Pronostics
                </Link>
                <Link
                  to="/matchs-a-venir"
                  className={`px-4 py-2 rounded-lg text-sm font-bold-sport transition-all duration-200 ${
                    isActive('/matchs-a-venir')
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-orange-400'
                  }`}
                >
                  Matchs à Venir
                </Link>
                <Link
                  to="/groups"
                  className={`px-4 py-2 rounded-lg text-sm font-bold-sport transition-all duration-200 ${
                    isActive('/groups') && !isActive('/mes-pronos') && !isActive('/') && !isActive('/classement-global')
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-orange-400'
                  }`}
                >
                  Groupes
                </Link>
                <Link
                  to="/classement-global"
                  className={`px-4 py-2 rounded-lg text-sm font-bold-sport transition-all duration-200 ${
                    isActive('/classement-global')
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-orange-400'
                  }`}
                >
                  Classement Global
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className={`px-4 py-2 rounded-lg text-sm font-bold-sport transition-all duration-200 ${
                      isActive('/admin')
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-orange-400'
                    }`}
                  >
                    Administration
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Actions utilisateur */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <>
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold-sport text-gray-300">
                    {user.pseudo}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-bold-sport hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-bold-sport hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
