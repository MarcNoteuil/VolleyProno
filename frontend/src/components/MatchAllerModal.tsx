import { useEffect } from 'react';

interface SetScore {
  home: number;
  away: number;
}

interface MatchAller {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startAt: string;
  setsHome?: number;
  setsAway?: number;
  setScores?: SetScore[];
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
}

interface MatchAllerModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchAller: MatchAller | null;
}

export default function MatchAllerModal({ isOpen, onClose, matchAller }: MatchAllerModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !matchAller) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-gray-800 via-gray-800/95 to-gray-800 rounded-xl shadow-2xl border-2 border-orange-500 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b-2 border-orange-500 px-6 py-4 flex justify-between items-center">
          <h2 className="font-sport text-2xl text-white">Match Aller</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Équipes */}
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-4 mb-3">
              <h3 className="font-team text-xl sm:text-2xl text-white text-center">
                <span className="text-orange-400">
                  <span className="text-orange-400 font-bold mr-1">A</span>
                  - {matchAller.homeTeam}
                </span>
                <span className="mx-3 text-gray-500">VS</span>
                <span className="text-orange-400">
                  <span className="text-orange-400 font-bold mr-1">B</span>
                  - {matchAller.awayTeam}
                </span>
              </h3>
            </div>
            <p className="text-gray-400 text-center text-sm font-bold-sport">
              {formatDate(matchAller.startAt)}
            </p>
          </div>

          {/* Scores */}
          {matchAller.status === 'FINISHED' && matchAller.setsHome !== undefined && matchAller.setsAway !== undefined ? (
            <div className="space-y-4">
              {/* Scores par set */}
              {matchAller.setScores && matchAller.setScores.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white font-bold-sport text-sm mb-3 text-center">Scores par set</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {matchAller.setScores.map((setScore, index) => {
                      const homeWon = setScore.home > setScore.away;
                      const awayWon = setScore.away > setScore.home;
                      
                      return (
                        <div key={index} className="bg-white rounded-lg p-3 min-w-[60px] text-center shadow-lg relative">
                          <div className="text-xs text-gray-500 mb-1 font-bold-sport">SET {index + 1}</div>
                          <div className="space-y-1 relative">
                            <div className="relative">
                              <span className="absolute -left-7 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xs bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center">A</span>
                              <div className={`text-lg font-bold-sport ${homeWon ? 'text-orange-500' : 'text-black'}`}>
                                {setScore.home}
                              </div>
                            </div>
                            <div className="text-gray-400 text-xs">-</div>
                            <div className="relative">
                              <span className="absolute -left-7 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xs bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center">B</span>
                              <div className={`text-lg font-bold-sport ${awayWon ? 'text-orange-500' : 'text-black'}`}>
                                {setScore.away}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Résultat final */}
              <div className="text-center">
                <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-gray-700 rounded-lg px-6 py-3">
                  <span className="font-team text-xl text-white text-center">
                    <span className="text-orange-400 font-bold mr-1">A</span>
                    - {matchAller.homeTeam}
                  </span>
                  <span className="font-sport text-3xl text-orange-500">
                    {matchAller.setsHome} - {matchAller.setsAway}
                  </span>
                  <span className="font-team text-xl text-white text-center">
                    <span className="text-orange-400 font-bold mr-1">B</span>
                    - {matchAller.awayTeam}
                  </span>
                </div>
              </div>
            </div>
          ) : matchAller.status === 'IN_PROGRESS' ? (
            <div className="text-center py-8">
              <div className="inline-block px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 animate-pulse">
                Match en cours...
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-block px-4 py-2 bg-gray-700 text-gray-400 rounded-lg border border-gray-600">
                Match à venir
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

