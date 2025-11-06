import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { compressImage } from '../utils/imageCompressor';

interface ProfileData {
  id: string;
  email: string;
  pseudo: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  favoriteTeam?: string | null;
  role?: 'USER' | 'ADMIN';
}

interface AvatarOption {
  id: string;
  name: string;
  url: string;
  gender?: 'male' | 'female';
  skin?: 'light' | 'medium' | 'dark';
  hair?: 'short' | 'long' | 'locks';
}

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<AvatarOption[]>([]);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarMode, setAvatarMode] = useState<'upload' | 'select'>('select');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    id: '',
    email: '',
    pseudo: '',
    firstName: '',
    lastName: '',
    avatar: '',
    favoriteTeam: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchAvatars();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/profile');
      setProfileData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvatars = async () => {
    try {
      const response = await api.get('/users/avatars');
      setAvatarOptions(response.data.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des avatars:', err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        setError('Le fichier doit être une image');
        return;
      }

      try {
        setError('');
        // Créer un aperçu de l'image
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
          setSelectedFile(file);
          setShowImageEditor(true);
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement de l\'image');
      }
    }
  };

  const handleImageEditorConfirm = async () => {
    if (!selectedFile) return;

      try {
        setError('');
        // Compresser l'image automatiquement à 300KB max (300x300px pour avatar)
        const compressedImage = await compressImage(selectedFile, 300 * 1024, 300, 300);
        setProfileData({ ...profileData, avatar: compressedImage });
      setShowImageEditor(false);
      setImagePreview(null);
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la compression de l\'image');
    }
  };

  const handleImageEditorCancel = () => {
    setShowImageEditor(false);
    setImagePreview(null);
    setSelectedFile(null);
  };

  const handleAvatarSelect = (avatarUrl: string) => {
    setProfileData({ ...profileData, avatar: avatarUrl });
    setShowAvatarSelector(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await api.put('/users/profile', {
        pseudo: profileData.pseudo || null,
        firstName: profileData.firstName || null,
        lastName: profileData.lastName || null,
        avatar: profileData.avatar || null,
        favoriteTeam: profileData.favoriteTeam || null,
      });

      // Mettre à jour le store avec les nouvelles données
      useAuthStore.setState({
        user: {
          ...user!,
          ...response.data.data
        }
      });

      // Rediriger vers le dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');

    try {
      await api.delete('/users/account');
      // Déconnecter l'utilisateur et rediriger
      logout();
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression du compte');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-gray-300 font-bold-sport text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-4">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="mb-4">
          <h1 className="font-sport text-4xl text-white mb-1">Mon Profil</h1>
          <p className="text-gray-400 font-bold-sport text-sm">Gérez vos informations personnelles</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg font-bold-sport text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
          <div className="space-y-4">
            {/* Email (lecture seule) */}
            <div>
              <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">L'email ne peut pas être modifié</p>
            </div>

            {/* Pseudo (modifiable) */}
            <div>
              <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                Pseudo (surnom)
              </label>
              <input
                type="text"
                value={profileData.pseudo || ''}
                onChange={(e) => setProfileData({ ...profileData, pseudo: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 text-sm"
                placeholder="Votre pseudo"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Votre pseudo unique (utilisé pour le message de bienvenue si aucun surnom n'est défini)</p>
            </div>

            {/* Prénom */}
            <div>
              <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                Prénom
              </label>
              <input
                type="text"
                value={profileData.firstName || ''}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 text-sm"
                placeholder="Votre prénom"
              />
            </div>

            {/* Nom */}
            <div>
              <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                Nom
              </label>
              <input
                type="text"
                value={profileData.lastName || ''}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 text-sm"
                placeholder="Votre nom"
              />
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                Photo/Avatar
              </label>
              
              {/* Choix du mode */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarMode('select');
                    setShowAvatarSelector(true);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold-sport transition-all duration-200 ${
                    avatarMode === 'select'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Choisir un avatar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarMode('upload');
                    setShowAvatarSelector(false);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold-sport transition-all duration-200 ${
                    avatarMode === 'upload'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Depuis mon ordinateur
                </button>
              </div>

              {/* Upload d'image */}
              {avatarMode === 'upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 cursor-pointer text-center text-sm font-bold-sport text-gray-300 transition-all duration-200"
                  >
                    📁 Choisir une image
                  </label>
                  <p className="mt-1 text-xs text-gray-500">L'image sera automatiquement compressée et redimensionnée (300x300px max)</p>
                </div>
              )}

              {/* Sélection d'avatar */}
              {avatarMode === 'select' && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 text-sm font-bold-sport text-gray-300 transition-all duration-200"
                  >
                    {showAvatarSelector ? 'Masquer les avatars' : 'Afficher les avatars'}
                  </button>
                  
                  {showAvatarSelector && (
                    <div className="mt-3 max-h-64 overflow-y-auto bg-gray-900 rounded-lg border border-gray-700 p-3">
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        {avatarOptions.map((avatar) => (
                          <button
                            key={avatar.id}
                            type="button"
                            onClick={() => handleAvatarSelect(avatar.url)}
                            className={`p-2 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                              profileData.avatar === avatar.url
                                ? 'border-orange-500 bg-orange-500/20'
                                : 'border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            <img
                              src={avatar.url}
                              alt={avatar.name}
                              className="w-full aspect-square object-contain rounded"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Aperçu de l'avatar */}
              {profileData.avatar && (
                <div className="mt-3 flex items-center space-x-3">
                  <img
                    src={profileData.avatar}
                    alt="Avatar"
                    className="w-16 h-16 rounded-full border-2 border-gray-600 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setProfileData({ ...profileData, avatar: null })}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-bold-sport transition-all duration-200"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>

            {/* Équipe préférée */}
            <div>
              <label className="block text-xs font-bold-sport text-gray-300 mb-1.5">
                Équipe préférée
              </label>
              <input
                type="text"
                value={profileData.favoriteTeam || ''}
                onChange={(e) => setProfileData({ ...profileData, favoriteTeam: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 text-sm"
                placeholder="Votre équipe de volley préférée"
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 font-bold-sport text-sm shadow-md shadow-orange-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold-sport text-sm shadow-md shadow-red-500/30 transition-all duration-200"
            >
              Supprimer mon compte
            </button>
          </div>
        </form>

        {/* Modal d'aperçu et édition d'image */}
        {showImageEditor && imagePreview && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full">
              <h2 className="text-xl font-sport text-white mb-4">Aperçu de l'image</h2>
              <div className="mb-4 flex justify-center">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="max-w-full max-h-64 rounded-lg border border-gray-600 object-contain"
                />
              </div>
              <p className="text-gray-400 text-sm mb-4 font-bold-sport">
                L'image sera automatiquement compressée et redimensionnée à 300x300px maximum.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleImageEditorCancel}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-bold-sport text-sm transition-all duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImageEditorConfirm}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 font-bold-sport text-sm transition-all duration-200"
                >
                  Utiliser cette image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full">
              <h2 className="text-xl font-sport text-white mb-4">Confirmer la suppression</h2>
              <p className="text-gray-300 font-bold-sport text-sm mb-6">
                Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et supprimera toutes vos données (pronostics, groupes créés, etc.).
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-bold-sport text-sm transition-all duration-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold-sport text-sm transition-all duration-200 disabled:opacity-50"
                >
                  {deleting ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

