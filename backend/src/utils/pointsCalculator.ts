export interface PredictionResult {
  points: number;
  reason: string;
  details: {
    exactScore: boolean;
    correctWinner: boolean;
    correctDifference: boolean;
  };
}

export class PointsCalculator {
  /**
   * Calcule les points pour un pronostic
   * @param predictedHome Score prédit équipe à domicile
   * @param predictedAway Score prédit équipe à l'extérieur
   * @param actualHome Score réel équipe à domicile
   * @param actualAway Score réel équipe à l'extérieur
   * @returns Résultat du calcul de points
   */
  calculatePoints(
    predictedHome: number,
    predictedAway: number,
    actualHome: number,
    actualAway: number
  ): PredictionResult {
    const exactScore = predictedHome === actualHome && predictedAway === actualAway;
    const correctWinner = this.isCorrectWinner(predictedHome, predictedAway, actualHome, actualAway);
    const correctDifference = this.isCorrectDifference(predictedHome, predictedAway, actualHome, actualAway);

    let points = 0;
    let reason = '';

    if (exactScore) {
      points = 3;
      reason = 'Score exact';
    } else if (correctWinner) {
      points = 1;
      reason = 'Bon vainqueur';
    } else {
      reason = 'Aucun point';
      // Pas de points pour différence de sets seule
    }

    return {
      points,
      reason,
      details: {
        exactScore,
        correctWinner,
        correctDifference
      }
    };
  }

  private isCorrectWinner(
    predictedHome: number,
    predictedAway: number,
    actualHome: number,
    actualAway: number
  ): boolean {
    const predictedWinner = predictedHome > predictedAway;
    const actualWinner = actualHome > actualAway;
    return predictedWinner === actualWinner;
  }

  private isCorrectDifference(
    predictedHome: number,
    predictedAway: number,
    actualHome: number,
    actualAway: number
  ): boolean {
    const predictedDiff = Math.abs(predictedHome - predictedAway);
    const actualDiff = Math.abs(actualHome - actualAway);
    return predictedDiff === actualDiff;
  }

  /**
   * Calcule les statistiques pour un ensemble de pronostics
   */
  calculateStats(predictions: Array<{ points: number }>) {
    const totalPoints = predictions.reduce((sum, pred) => sum + pred.points, 0);
    const maxPossiblePoints = predictions.length * 5; // 3 pts score exact + 2 pts bonus détaillé
    const successRate = maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0;

    const pointsDistribution = {
      exact: predictions.filter(p => p.points >= 3).length, // 3 pts ou plus (score exact + bonus)
      exactWithBonus: predictions.filter(p => p.points === 5).length, // 5 pts (score exact + bonus détaillé)
      exactOnly: predictions.filter(p => p.points === 3).length, // 3 pts (score exact sans bonus)
      winner: predictions.filter(p => p.points === 1).length, // 1 pt (bon vainqueur)
      zero: predictions.filter(p => p.points === 0).length
    };

    return {
      totalPoints,
      maxPossiblePoints,
      successRate: Math.round(successRate * 100) / 100,
      pointsDistribution,
      averagePoints: predictions.length > 0 ? Math.round((totalPoints / predictions.length) * 100) / 100 : 0
    };
  }

  /**
   * Génère un rapport détaillé pour un match
   */
  generateMatchReport(
    match: { homeTeam: string; awayTeam: string; actualHome: number; actualAway: number },
    predictions: Array<{
      user: { pseudo: string };
      predictedHome: number;
      predictedAway: number;
      points: number;
    }>
  ) {
    const results = predictions.map(pred => ({
      ...pred,
      result: this.calculatePoints(
        pred.predictedHome,
        pred.predictedAway,
        match.actualHome,
        match.actualAway
      )
    }));

    const stats = this.calculateStats(results.map(r => ({ points: r.result.points })));

    return {
      match: {
        ...match,
        result: `${match.actualHome}-${match.actualAway}`
      },
      predictions: results.sort((a, b) => b.result.points - a.result.points),
      stats
    };
  }
}
