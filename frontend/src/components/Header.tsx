import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import Logo from './Logo';
import InstallButton from './InstallButton';

export default function Header() {
  const { logout, user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/groups';
    }
    return location.pathname.startsWith(path);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLinkClick = () => {
    closeMobileMenu();
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b-2 border-orange-500 shadow-2xl shadow-orange-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 sm:h-24">
            {/* Logo */}
            <div onClick={handleLinkClick}>
              <Logo size="md" />
            </div>

            {/* Navigation Desktop */}
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

            {/* Actions utilisateur Desktop */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Bouton d'installation PWA */}
              <InstallButton />
              {isAuthenticated && user ? (
                <>
                  <Link
                    to="/profil"
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                      isActive('/profil')
                        ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/50'
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                    <span className="text-sm font-bold-sport text-gray-300">
                      {user.pseudo || user.firstName}
                    </span>
                  </Link>
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-bold-sport hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 ml-3"
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

            {/* Bouton Menu Burger Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-orange-400 transition-colors"
              aria-label="Menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Overlay pour mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Drawer latéral Mobile */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-l-2 border-orange-500 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header du drawer */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="font-sport text-xl text-white">Menu</h2>
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-orange-400 transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Mobile */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <Link
              to="/"
              onClick={handleLinkClick}
              className={`block px-4 py-3 rounded-lg text-base font-bold-sport transition-all duration-200 ${
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
                  onClick={handleLinkClick}
                  className={`block px-4 py-3 rounded-lg text-base font-bold-sport transition-all duration-200 ${
                    isActive('/mes-pronos')
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-orange-400'
                  }`}
                >
                  Mes Pronostics
                </Link>
                <Link
                  to="/matchs-a-venir"
                  onClick={handleLinkClick}
                  className={`block px-4 py-3 rounded-lg text-base font-bold-sport transition-all duration-200 ${
                    isActive('/matchs-a-venir')
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-orange-400'
                  }`}
                >
                  Matchs à Venir
                </Link>
                <Link
                  to="/groups"
                  onClick={handleLinkClick}
                  className={`block px-4 py-3 rounded-lg text-base font-bold-sport transition-all duration-200 ${
                    isActive('/groups') && !isActive('/mes-pronos') && !isActive('/') && !isActive('/classement-global')
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-orange-400'
                  }`}
                >
                  Groupes
                </Link>
                <Link
                  to="/classement-global"
                  onClick={handleLinkClick}
                  className={`block px-4 py-3 rounded-lg text-base font-bold-sport transition-all duration-200 ${
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
                    onClick={handleLinkClick}
                    className={`block px-4 py-3 rounded-lg text-base font-bold-sport transition-all duration-200 ${
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

          {/* Actions utilisateur Mobile */}
          <div className="p-4 border-t border-gray-700 space-y-2">
            {/* Bouton d'installation PWA - Mobile */}
            <InstallButton />
            {isAuthenticated && user ? (
              <>
                <Link
                  to="/profil"
                  onClick={handleLinkClick}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    isActive('/profil')
                      ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/50'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                  <span className="text-sm font-bold-sport text-gray-300">
                    {user.pseudo || user.firstName}
                  </span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-bold-sport hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg shadow-red-500/30"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={handleLinkClick}
                className="block w-full text-center px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-bold-sport hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg shadow-orange-500/30"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
