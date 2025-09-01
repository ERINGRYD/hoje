import { StudySession } from '@/types/study';
import { PerformanceMetric } from '@/db/crud/performanceMetrics';

export interface PerformancePrediction {
  examPerformance: number; // 0-100
  timeToMastery: Record<string, number>; // subject -> hours needed
  goalAchievementProbability: number; // 0-1
  recommendedStudyTime: number; // hours per day
  weaknessImprovement: Record<string, number>; // subject -> improvement rate
  confidenceLevel: number; // 0-1
}

export interface LearningCurve {
  subject: string;
  currentLevel: number; // 0-1
  learningRate: number; // improvement per hour
  difficultyFactor: number; // how hard this subject is for the user
  plateauThreshold: number; // level where improvement slows
}

/**
 * Prediz performance futura baseada no histórico de estudos
 */
export const predictPerformance = (
  sessions: StudySession[],
  metrics: PerformanceMetric[],
  targetDate?: Date
): PerformancePrediction => {
  const learningCurves = calculateLearningCurves(sessions);
  const currentTrends = analyzeTrends(sessions, metrics);
  
  const daysUntilTarget = targetDate 
    ? Math.max(1, Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30; // Default 30 days

  // Predição de performance no exame
  const examPerformance = predictExamPerformance(learningCurves, currentTrends, daysUntilTarget);
  
  // Tempo para dominar cada matéria
  const timeToMastery = calculateTimeToMastery(learningCurves);
  
  // Probabilidade de atingir metas
  const goalAchievementProbability = calculateGoalProbability(
    learningCurves, 
    currentTrends, 
    daysUntilTarget
  );
  
  // Tempo de estudo recomendado
  const recommendedStudyTime = calculateRecommendedTime(
    learningCurves, 
    daysUntilTarget,
    goalAchievementProbability
  );
  
  // Taxa de melhoria para pontos fracos
  const weaknessImprovement = calculateWeaknessImprovement(learningCurves);
  
  // Nível de confiança da predição
  const confidenceLevel = calculateConfidenceLevel(sessions, metrics);

  return {
    examPerformance,
    timeToMastery,
    goalAchievementProbability,
    recommendedStudyTime,
    weaknessImprovement,
    confidenceLevel
  };
};

/**
 * Calcula curvas de aprendizado para cada matéria
 */
export const calculateLearningCurves = (sessions: StudySession[]): Record<string, LearningCurve> => {
  const subjectData: Record<string, {
    sessions: StudySession[];
    performances: number[];
    timeSpent: number;
  }> = {};

  // Agrupar dados por matéria
  sessions.forEach(session => {
    if (!subjectData[session.subject]) {
      subjectData[session.subject] = {
        sessions: [],
        performances: [],
        timeSpent: 0
      };
    }
    
    subjectData[session.subject].sessions.push(session);
    subjectData[session.subject].timeSpent += session.duration;
    
    const performanceScore = getPerformanceScore(session.performance);
    subjectData[session.subject].performances.push(performanceScore);
  });

  // Calcular curvas de aprendizado
  return Object.fromEntries(
    Object.entries(subjectData).map(([subject, data]) => {
      const learningRate = calculateLearningRate(data.performances, data.timeSpent);
      const currentLevel = calculateCurrentLevel(data.performances);
      const difficultyFactor = calculateDifficultyFactor(data.performances, data.timeSpent);
      
      return [subject, {
        subject,
        currentLevel,
        learningRate,
        difficultyFactor,
        plateauThreshold: 0.85 // 85% é considerado domínio
      }];
    })
  );
};

/**
 * Prediz performance em exame baseada nas curvas de aprendizado
 */
const predictExamPerformance = (
  curves: Record<string, LearningCurve>,
  trends: any,
  daysUntilExam: number
): number => {
  const subjects = Object.values(curves);
  if (subjects.length === 0) return 50;

  // Simular evolução até o exame
  const futurePerformances = subjects.map(curve => {
    const hoursPerDay = 2; // Assumir 2h/dia por matéria
    const totalHours = daysUntilExam * hoursPerDay;
    
    // Aplicar curva de aprendizado com lei dos rendimentos decrescentes
    const improvementPotential = Math.max(0, curve.plateauThreshold - curve.currentLevel);
    const timeToReachPlateau = improvementPotential / curve.learningRate;
    
    let finalLevel = curve.currentLevel;
    if (totalHours >= timeToReachPlateau) {
      finalLevel = curve.plateauThreshold;
    } else {
      finalLevel = curve.currentLevel + (curve.learningRate * totalHours);
    }
    
    // Ajustar por dificuldade
    finalLevel = finalLevel * (1 - curve.difficultyFactor * 0.2);
    
    return Math.min(1, Math.max(0, finalLevel));
  });

  // Média ponderada (matérias mais estudadas têm mais peso)
  const totalTimeSpent = subjects.reduce((sum, curve) => sum + (curve.currentLevel * 100), 0);
  const weightedAverage = subjects.reduce((sum, curve, index) => {
    const weight = (curve.currentLevel * 100) / totalTimeSpent || 1 / subjects.length;
    return sum + (futurePerformances[index] * weight);
  }, 0);

  return Math.round(weightedAverage * 100);
};

/**
 * Calcula tempo necessário para dominar cada matéria
 */
const calculateTimeToMastery = (curves: Record<string, LearningCurve>): Record<string, number> => {
  return Object.fromEntries(
    Object.entries(curves).map(([subject, curve]) => {
      const remainingImprovement = Math.max(0, curve.plateauThreshold - curve.currentLevel);
      const hoursNeeded = remainingImprovement / curve.learningRate;
      
      // Ajustar por dificuldade
      const adjustedHours = hoursNeeded * (1 + curve.difficultyFactor);
      
      return [subject, Math.ceil(adjustedHours)];
    })
  );
};

/**
 * Calcula probabilidade de atingir metas
 */
const calculateGoalProbability = (
  curves: Record<string, LearningCurve>,
  trends: any,
  daysUntilTarget: number
): number => {
  const subjects = Object.values(curves);
  if (subjects.length === 0) return 0.5;

  // Assumir meta de 80% de domínio em todas as matérias
  const targetLevel = 0.8;
  const hoursPerDay = 6; // Total de horas de estudo por dia
  const hoursPerSubject = hoursPerDay / subjects.length;
  const totalHours = daysUntilTarget * hoursPerSubject;

  const probabilities = subjects.map(curve => {
    const requiredImprovement = Math.max(0, targetLevel - curve.currentLevel);
    const possibleImprovement = curve.learningRate * totalHours;
    
    if (requiredImprovement === 0) return 1; // Já atingiu a meta
    if (possibleImprovement === 0) return 0; // Não há progresso
    
    // Probability baseada na razão entre melhoria possível e necessária
    const ratio = possibleImprovement / requiredImprovement;
    
    // Usar função sigmoid para converter em probabilidade
    return 1 / (1 + Math.exp(-2 * (ratio - 1)));
  });

  // Probabilidade geral é a média das probabilidades individuais
  return probabilities.reduce((sum, prob) => sum + prob, 0) / probabilities.length;
};

/**
 * Calcula tempo de estudo recomendado
 */
const calculateRecommendedTime = (
  curves: Record<string, LearningCurve>,
  daysUntilTarget: number,
  goalProbability: number
): number => {
  const subjects = Object.values(curves);
  if (subjects.length === 0) return 4;

  // Se probabilidade de meta é baixa, recomendar mais tempo
  const difficultyMultiplier = goalProbability < 0.3 ? 1.5 : 
                              goalProbability < 0.6 ? 1.2 : 1.0;

  // Calcular tempo base necessário
  const baseHours = subjects.reduce((total, curve) => {
    const targetLevel = 0.8;
    const requiredImprovement = Math.max(0, targetLevel - curve.currentLevel);
    const hoursNeeded = requiredImprovement / curve.learningRate;
    return total + hoursNeeded;
  }, 0);

  const dailyHours = (baseHours / daysUntilTarget) * difficultyMultiplier;
  
  // Limitar entre 2 e 12 horas por dia
  return Math.max(2, Math.min(12, Math.ceil(dailyHours)));
};

/**
 * Calcula taxa de melhoria para pontos fracos
 */
const calculateWeaknessImprovement = (curves: Record<string, LearningCurve>): Record<string, number> => {
  const averageLevel = Object.values(curves).reduce((sum, curve) => sum + curve.currentLevel, 0) / Object.keys(curves).length;
  
  return Object.fromEntries(
    Object.entries(curves)
      .filter(([, curve]) => curve.currentLevel < averageLevel * 0.8) // Identificar pontos fracos
      .map(([subject, curve]) => {
        // Taxa de melhoria baseada no potencial de crescimento
        const improvementPotential = (curve.plateauThreshold - curve.currentLevel) * curve.learningRate;
        return [subject, Math.round(improvementPotential * 100)]; // Em percentual por hora
      })
  );
};

/**
 * Calcula nível de confiança da predição
 */
const calculateConfidenceLevel = (sessions: StudySession[], metrics: PerformanceMetric[]): number => {
  // Confiança baseada na quantidade de dados
  const dataPoints = sessions.length + metrics.length;
  const dataConfidence = Math.min(1, dataPoints / 50); // 50+ pontos = confiança máxima
  
  // Confiança baseada na consistência dos dados
  const recentSessions = sessions.filter(s => {
    const daysDiff = (Date.now() - s.startTime.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 14;
  });
  
  const consistencyConfidence = recentSessions.length >= 10 ? 1 : recentSessions.length / 10;
  
  // Confiança baseada na variação de performance
  const performances = sessions.map(s => getPerformanceScore(s.performance));
  const avgPerformance = performances.reduce((a, b) => a + b, 0) / performances.length;
  const variance = performances.reduce((sum, perf) => sum + Math.pow(perf - avgPerformance, 2), 0) / performances.length;
  const stabilityConfidence = Math.max(0, 1 - variance); // Menor variância = maior confiança
  
  return (dataConfidence * 0.4 + consistencyConfidence * 0.4 + stabilityConfidence * 0.2);
};

// Funções auxiliares
const getPerformanceScore = (performance?: 'low' | 'medium' | 'high'): number => {
  switch (performance) {
    case 'high': return 1;
    case 'medium': return 0.6;
    case 'low': return 0.3;
    default: return 0.5;
  }
};

const calculateLearningRate = (performances: number[], timeSpent: number): number => {
  if (performances.length < 2 || timeSpent === 0) return 0.01; // Taxa padrão
  
  // Calcular tendência de melhoria ao longo do tempo
  const firstHalf = performances.slice(0, Math.floor(performances.length / 2));
  const secondHalf = performances.slice(Math.floor(performances.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const improvement = secondAvg - firstAvg;
  const hoursSpent = timeSpent / 60; // Converter para horas
  
  return Math.max(0.001, improvement / hoursSpent); // Mínimo de 0.1% por hora
};

const calculateCurrentLevel = (performances: number[]): number => {
  if (performances.length === 0) return 0;
  
  // Dar mais peso às performances recentes
  const weights = performances.map((_, index) => Math.pow(1.1, index));
  const weightedSum = performances.reduce((sum, perf, index) => sum + perf * weights[index], 0);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  return weightedSum / totalWeight;
};

const calculateDifficultyFactor = (performances: number[], timeSpent: number): number => {
  if (performances.length === 0) return 0.5;
  
  const avgPerformance = performances.reduce((a, b) => a + b, 0) / performances.length;
  const hoursSpent = timeSpent / 60;
  
  // Dificuldade baseada em baixa performance apesar de muito tempo gasto
  if (hoursSpent > 10 && avgPerformance < 0.5) return 0.8; // Alta dificuldade
  if (hoursSpent > 5 && avgPerformance < 0.7) return 0.6; // Média dificuldade
  if (avgPerformance > 0.8) return 0.2; // Baixa dificuldade
  
  return 0.4; // Dificuldade padrão
};

const analyzeTrends = (sessions: StudySession[], metrics: PerformanceMetric[]) => {
  // Análise simples de tendências
  const recentSessions = sessions.filter(s => {
    const daysDiff = (Date.now() - s.startTime.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 14;
  });
  
  return {
    recentSessionCount: recentSessions.length,
    averageRecentPerformance: recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + getPerformanceScore(s.performance), 0) / recentSessions.length
      : 0.5
  };
};