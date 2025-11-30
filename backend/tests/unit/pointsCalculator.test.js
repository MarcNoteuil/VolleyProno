"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pointsCalculator_1 = require("../../src/utils/pointsCalculator");
describe('PointsCalculator', () => {
    let calculator;
    beforeEach(() => {
        calculator = new pointsCalculator_1.PointsCalculator();
    });
    describe('calculatePoints', () => {
        it('should award 5 points for exact score', () => {
            const result = calculator.calculatePoints(3, 1, 3, 1);
            expect(result.points).toBe(5);
            expect(result.reason).toBe('Score exact');
            expect(result.details.exactScore).toBe(true);
            expect(result.details.correctWinner).toBe(true);
            expect(result.details.correctDifference).toBe(true);
        });
        it('should award 2 points for correct winner', () => {
            const result = calculator.calculatePoints(3, 1, 3, 0);
            expect(result.points).toBe(2);
            expect(result.reason).toBe('Bon vainqueur');
            expect(result.details.exactScore).toBe(false);
            expect(result.details.correctWinner).toBe(true);
            expect(result.details.correctDifference).toBe(false);
        });
        it('should award 1 point for correct difference (wrong winner only)', () => {
            const result = calculator.calculatePoints(2, 3, 3, 2);
            expect(result.points).toBe(1);
            expect(result.reason).toBe('Différence de sets correcte');
            expect(result.details.exactScore).toBe(false);
            expect(result.details.correctWinner).toBe(false);
            expect(result.details.correctDifference).toBe(true);
        });
        it('should award 0 points for incorrect prediction (wrong winner and diff)', () => {
            const result = calculator.calculatePoints(3, 0, 1, 3);
            expect(result.points).toBe(0);
            expect(result.reason).toBe('Aucun point');
            expect(result.details.exactScore).toBe(false);
            expect(result.details.correctWinner).toBe(false);
            expect(result.details.correctDifference).toBe(false);
        });
        it('should handle draw predictions correctly', () => {
            const result = calculator.calculatePoints(2, 2, 3, 1);
            expect(result.points).toBe(0);
            expect(result.details.correctWinner).toBe(false);
        });
    });
    describe('calculateStats', () => {
        it('should calculate correct statistics', () => {
            const predictions = [
                { points: 5 },
                { points: 2 },
                { points: 1 },
                { points: 0 },
                { points: 5 }
            ];
            const stats = calculator.calculateStats(predictions);
            expect(stats.totalPoints).toBe(13);
            expect(stats.maxPossiblePoints).toBe(25);
            expect(stats.successRate).toBe(52);
            expect(stats.pointsDistribution.exact).toBe(2);
            expect(stats.pointsDistribution.winner).toBe(1);
            expect(stats.pointsDistribution.difference).toBe(1);
            expect(stats.pointsDistribution.zero).toBe(1);
            expect(stats.averagePoints).toBe(2.6);
        });
        it('should handle empty predictions array', () => {
            const stats = calculator.calculateStats([]);
            expect(stats.totalPoints).toBe(0);
            expect(stats.maxPossiblePoints).toBe(0);
            expect(stats.successRate).toBe(0);
            expect(stats.averagePoints).toBe(0);
        });
    });
    describe('generateMatchReport', () => {
        it('should generate correct match report', () => {
            const match = {
                homeTeam: 'Team A',
                awayTeam: 'Team B',
                actualHome: 3,
                actualAway: 1
            };
            const predictions = [
                {
                    user: { pseudo: 'User1' },
                    predictedHome: 3,
                    predictedAway: 1,
                    points: 5
                },
                {
                    user: { pseudo: 'User2' },
                    predictedHome: 3,
                    predictedAway: 0,
                    points: 2
                }
            ];
            const report = calculator.generateMatchReport(match, predictions);
            expect(report.match.result).toBe('3-1');
            expect(report.predictions).toHaveLength(2);
            expect(report.predictions[0].result.points).toBe(5);
            expect(report.predictions[1].result.points).toBe(2);
            expect(report.stats.totalPoints).toBe(7);
        });
    });
});
