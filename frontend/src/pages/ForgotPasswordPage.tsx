import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.data.code === 'SUCCESS') {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <span className="font-sport text-6xl text-orange-500">🏐</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            </div>
          </div>
          <h2 className="font-sport text-5xl text-white mb-2">
            VolleyProno
          </h2>
          <p className="text-gray-400 font-bold-sport text-lg">
            Mot de passe oublié
          </p>
        </div>
        
        {success ? (
          <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-3 rounded-lg font-bold-sport text-center">
            <p className="mb-2">✅ Email envoyé !</p>
            <p className="text-sm">
              Si cet email existe dans notre base de données, vous recevrez un lien de réinitialisation par email.
            </p>
            <p className="text-sm mt-2">
              Vérifiez votre boîte de réception et vos spams.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-orange-500 hover:text-orange-400 transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="mt-2 text-xs text-gray-400 font-bold-sport">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg font-bold-sport">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 font-bold-sport text-lg shadow-lg shadow-orange-500/30 transition-all duration-200"
              >
                {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm font-bold-sport text-orange-500 hover:text-orange-400 transition-colors"
              >
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

