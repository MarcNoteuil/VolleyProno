import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ffvbSourceUrl?: string;
  members: Array<{
    user: {
      id: string;
      pseudo: string;
      firstName?: string | null;
      avatar?: string | null;
    };
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
  }>;
  createdAt: string;
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupUrl, setNewGroupUrl] = useState('');
  const [newGroupPoolCode, setNewGroupPoolCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000); // Réinitialiser après 2 secondes
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data.data);
    } catch (err: any) {
      setError('Erreur lors du chargement des groupes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(''); // Réinitialiser l'erreur

    try {
      const payload: any = {
        name: newGroupName.trim(),
      };
      
      // Si un code de poule/URL est fourni dans le premier champ
      if (newGroupPoolCode.trim()) {
        const poolCodeValue = newGroupPoolCode.trim();
        // Vérifier si c'est une URL complète ou un code court
        if (poolCodeValue.startsWith('http://') || poolCodeValue.startsWith('https://')) {
          // URL complète détectée
          payload.poolCode = poolCodeValue; // Envoyer tel quel, le backend détectera que c'est une URL
        } else {
          // Code court détecté
          payload.poolCode = poolCodeValue.toLowerCase();
        }
      } else if (newGroupUrl.trim()) {
        // Utiliser le champ URL alternative
        payload.ffvbSourceUrl = newGroupUrl.trim();
      } else {
        setError('Veuillez renseigner un code de poule (format court) ou une URL FFVB complète');
        setSubmitting(false);
        return;
      }
      
      await api.post('/groups', payload);
      
      setNewGroupName('');
      setNewGroupUrl('');
      setNewGroupPoolCode('');
      setShowCreateForm(false);
      await fetchGroups(); // Rafraîchir la liste
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.details?.[0]?.message || 'Erreur lors de la création du groupe';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(''); // Réinitialiser l'erreur

    try {
      // Normaliser le code d'invitation (enlever les espaces, mettre en majuscules)
      const normalizedCode = inviteCode.trim().replace(/\s+/g, '').toUpperCase();
      
      // Vérifier le format
      if (!/^\d{4}-\d{4}$/.test(normalizedCode)) {
        setError('Format de code invalide. Format attendu: XXXX-XXXX');
        setSubmitting(false);
        return;
      }

      const response = await api.post('/groups/join', { inviteCode: normalizedCode });
      const groupId = response.data.data.group.id;
      setInviteCode('');
      setShowJoinForm(false);
      // Rediriger vers la page de détail du groupe
      navigate(`/groups/${groupId}`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Code d\'invitation invalide';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-300 font-bold-sport text-xl">Chargement des groupes...</p>
        </div>
      </div>
    );
  }

  // Ne pas afficher d'erreur si c'est juste qu'il n'y a pas de groupes
  const hasGroups = groups.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-18 sm:pt-22 pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h1 className="font-sport text-3xl sm:text-4xl text-white">Mes Groupes</h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg hover:from-orange-600 hover:to-orange-700 font-bold-sport text-sm shadow-md shadow-orange-500/30 transition-all duration-200"
              >
                Créer un groupe
              </button>
            <button
              onClick={() => setShowJoinForm(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg hover:from-green-700 hover:to-green-800 font-bold-sport text-sm shadow-md shadow-green-500/30 transition-all duration-200"
            >
              Rejoindre un groupe
            </button>
            </div>
          </div>

          {error && (
          <div className="mb-3 bg-red-900/50 border border-red-500 text-red-300 px-3 py-2 rounded-lg font-bold-sport text-sm">
              {error}
            </div>
          )}

        {!hasGroups ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-base mb-2 font-bold-sport">
                Vous n'êtes membre d'aucun groupe
              </div>
            <p className="text-gray-500 text-sm">
                Créez un groupe ou rejoignez-en un avec un code d'invitation
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {groups.map((group) => (
              <div key={group.id} className="bg-gray-800 rounded-lg shadow-md border border-gray-700 p-4 hover:border-orange-500 transition-all duration-200">
                <h3 className="font-team text-lg text-white mb-2">
                    {group.name}
                  </h3>
                <p className="text-gray-400 mb-2 text-xs flex items-center gap-1.5">
                  Code d'invitation:{' '}
                  <code className="bg-gray-700 px-1.5 py-0.5 rounded text-orange-400 font-bold-sport text-xs">
                    {group.inviteCode}
                  </code>
                  <button
                    onClick={() => copyToClipboard(group.inviteCode)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors relative group"
                    title="Copier le code"
                    aria-label="Copier le code d'invitation"
                  >
                    {copiedCode === group.inviteCode ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400 hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    {group.members.length} membre{group.members.length > 1 ? 's' : ''}
                  </p>
                    <Link
                      to={`/groups/${group.id}`}
                  className="inline-block w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg hover:from-orange-600 hover:to-orange-700 text-center font-bold-sport text-sm shadow-md shadow-orange-500/30 transition-all duration-200"
                    >
                      Voir le groupe
                    </Link>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Modal Créer un groupe */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4 w-full max-w-md">
            <h3 className="font-sport text-xl text-white mb-4">Créer un nouveau groupe</h3>
            <form onSubmit={handleCreateGroup}>
              {/* Message d'erreur visible */}
              {error && (
                <div className="mb-4 bg-red-900/50 border-2 border-red-500 rounded-lg p-3 flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-red-300 font-bold-sport text-sm">{error}</p>
                  </div>
                </div>
              )}
              
              <div className="mb-3">
                <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                  Nom du groupe
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => {
                    setNewGroupName(e.target.value);
                    setError(''); // Réinitialiser l'erreur quand l'utilisateur tape
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 text-sm"
                  placeholder="Mon groupe"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                  Code de la poule ou URL complète
                </label>
                <input
                  type="text"
                  value={newGroupPoolCode}
                  onChange={(e) => {
                    // Ne pas forcer en minuscules si c'est une URL
                    const value = e.target.value;
                    if (value.startsWith('http://') || value.startsWith('https://')) {
                      setNewGroupPoolCode(value);
                    } else {
                      setNewGroupPoolCode(value.toLowerCase().replace(/\s+/g, ''));
                    }
                    setError(''); // Réinitialiser l'erreur quand l'utilisateur tape
                  }}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 text-white placeholder-gray-400 text-sm ${
                    error && (error.includes('code de poule') || error.includes('URL')) 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:ring-orange-500'
                  }`}
                  placeholder="Code court (ex: 3mb, 2fc) ou URL complète"
                />
                <div className="mt-1.5 space-y-1">
                  <p className="text-xs text-gray-500">
                    <strong>Format court (Pro à Nationale 3)</strong> : Entrez le code de votre poule (ex: <strong>3mb</strong> pour Nationale 3 Masculin B, <strong>2fc</strong> pour Nationale 2 Féminin C, <strong>msl</strong> pour Marmara Spike League, <strong>com</strong> pour Coupe de France)
                  </p>
                  <p className="text-xs text-orange-400">
                    <strong>Format URL complète (Régionales/Départementales)</strong> : Pour les poules régionales ou départementales, collez l'URL complète de la page calendrier (ex: <code className="bg-gray-800 px-1 rounded">https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2025/2026&codent=LIIDF&poule=2FA</code>)
                  </p>
                  <p className="text-xs text-blue-400">
                    <strong>Coupes de France</strong> : Vous pouvez aussi entrer l'URL de la page Coupe de France (ex: <code className="bg-gray-800 px-1 rounded">https://www.ffvbbeach.org/ffvbapp/resu/seniors/2025-2026/index_com.htm</code>) ou simplement le code <strong>com</strong>
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                  Ou URL de la poule FFVB (alternative)
                </label>
                <input
                  type="url"
                  value={newGroupUrl}
                  onChange={(e) => {
                    setNewGroupUrl(e.target.value);
                    setError(''); // Réinitialiser l'erreur quand l'utilisateur tape
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 text-sm"
                  placeholder="https://www.ffvbbeach.org/..."
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Alternative : vous pouvez aussi entrer l'URL complète ici si vous préférez
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError(''); // Réinitialiser l'erreur quand on ferme le modal
                  }}
                  className="px-4 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold-sport text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 font-bold-sport text-sm shadow-md shadow-orange-500/30 transition-all duration-200"
                >
                  {submitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rejoindre un groupe */}
      {showJoinForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4 w-full max-w-md">
            <h3 className="font-sport text-xl text-white mb-4">Rejoindre un groupe</h3>
            <form onSubmit={handleJoinGroup}>
              <div className="mb-4">
                <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                  Code d'invitation
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, ''); // Enlever tout sauf les chiffres
                    if (value.length > 4) {
                      value = value.slice(0, 4) + '-' + value.slice(4, 8);
                    }
                    setInviteCode(value.toUpperCase());
                  }}
                  maxLength={9}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 font-bold-sport text-center text-lg tracking-widest"
                  placeholder="2543-5610"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="px-4 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold-sport text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 font-bold-sport text-sm shadow-md shadow-green-500/30 transition-all duration-200"
                >
                  {submitting ? 'Rejoindre...' : 'Rejoindre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
