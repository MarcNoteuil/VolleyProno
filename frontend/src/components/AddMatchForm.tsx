import React, { useState } from 'react';
import { api } from '../services/api';

interface AddMatchFormProps {
  groupId: string;
  onMatchAdded: () => void;
}

interface MatchFormData {
  homeTeam: string;
  awayTeam: string;
  startAt: string;
  setsHome?: number;
  setsAway?: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
}

export const AddMatchForm: React.FC<AddMatchFormProps> = ({ groupId, onMatchAdded }) => {
  const [formData, setFormData] = useState<MatchFormData>({
    homeTeam: '',
    awayTeam: '',
    startAt: '',
    status: 'SCHEDULED'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const matchData = {
        ...formData,
        startAt: new Date(formData.startAt).toISOString(),
        ...(formData.setsHome !== undefined && { setsHome: formData.setsHome }),
        ...(formData.setsAway !== undefined && { setsAway: formData.setsAway })
      };

      await api.post(`/api/matches/${groupId}`, matchData);
      
      // Reset form
      setFormData({
        homeTeam: '',
        awayTeam: '',
        startAt: '',
        status: 'SCHEDULED'
      });
      
      onMatchAdded();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du match');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'setsHome' || name === 'setsAway' ? 
        (value === '' ? undefined : parseInt(value)) : 
        value
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Ajouter un match</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Équipe à domicile
            </label>
            <input
              type="text"
              name="homeTeam"
              value={formData.homeTeam}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom de l'équipe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Équipe à l'extérieur
            </label>
            <input
              type="text"
              name="awayTeam"
              value={formData.awayTeam}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom de l'équipe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date et heure
          </label>
          <input
            type="datetime-local"
            name="startAt"
            value={formData.startAt}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="SCHEDULED">Programmé</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="FINISHED">Terminé</option>
            <option value="CANCELED">Annulé</option>
          </select>
        </div>

        {(formData.status === 'FINISHED' || formData.status === 'IN_PROGRESS') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sets équipe domicile
              </label>
              <input
                type="number"
                name="setsHome"
                value={formData.setsHome || ''}
                onChange={handleInputChange}
                min="0"
                max="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sets équipe extérieur
              </label>
              <input
                type="number"
                name="setsAway"
                value={formData.setsAway || ''}
                onChange={handleInputChange}
                min="0"
                max="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0-3"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Création...' : 'Créer le match'}
        </button>
      </form>
    </div>
  );
};



